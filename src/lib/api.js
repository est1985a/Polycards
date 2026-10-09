// Every Supabase query the app makes lives here.
// Each function throws an Error if something goes wrong, so screens can show the message.
import { supabase } from './supabaseClient';
import { SESSION_SIZE, MASTERED, progressUpdate, restoreUpdate } from './srs';
import { shapeLibrary } from './library';

// Global library: textbooks → units → decks (with each deck's word count), as a flat list
// shaped by shapeLibrary. deck_words ( count ) returns only a number per deck, not the rows.
export async function fetchLibrary() {
  const { data, error } = await supabase
    .from('textbooks')
    .select(`
      id, name, school_level,
      units ( id, name, unit_order, decks ( id, name, deck_words ( count ) ) )
    `)
    .order('created_at', { ascending: true });
  if (error) throw new Error("Supabase Error: " + error.message);
  return shapeLibrary(data);
}

// Decks this student added to My Cards, oldest first.
export async function fetchMyDecks() {
  const { data, error } = await supabase
    .from('user_decks')
    .select('deck_id, added_at, decks ( id, name, units ( name, textbooks ( name ) ) )')
    .order('added_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// Cards that are due now (used for the due counts). Mastered cards are never due.
// Each row lists every deck its word belongs to, since words can be shared between decks.
export async function fetchDueRows() {
  const { data, error } = await supabase
    .from('user_cards')
    .select('word_id, direction, words ( deck_words ( deck_id ) )')
    .lt('level', MASTERED)
    .lte('next_review_at', new Date().toISOString());
  if (error) throw new Error(error.message);
  return data || [];
}

// Word ids in one deck.
async function fetchDeckWordIds(deckId) {
  const { data, error } = await supabase
    .from('deck_words')
    .select('word_id')
    .eq('deck_id', deckId);
  if (error) throw new Error("Could not load this deck's words: " + error.message);
  return (data || []).map((r) => r.word_id);
}

// Words (english/japanese pairs) in one deck.
export async function fetchDeckWords(deckId) {
  const { data, error } = await supabase
    .from('deck_words')
    .select('position, words ( id, english, japanese, example_en, example_ja )')
    .eq('deck_id', deckId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => r.words).filter(Boolean);
}

export async function addDeckToMyCards(userId, deckId) {
  const wordIds = await fetchDeckWordIds(deckId);
  if (wordIds.length === 0) throw new Error("Could not load this deck's words: no words found");

  // ignoreDuplicates skips words the student already has from another deck,
  // so progress on shared words is kept.
  const rows = wordIds.flatMap((wordId) => [
    { user_id: userId, word_id: wordId, direction: 'en2jp' },
    { user_id: userId, word_id: wordId, direction: 'jp2en' },
  ]);
  const { error: progressError } = await supabase
    .from('user_cards')
    .upsert(rows, { onConflict: 'user_id,word_id,direction', ignoreDuplicates: true });
  if (progressError) throw new Error("Could not save card progress: " + progressError.message);

  const { error: deckError } = await supabase
    .from('user_decks')
    .upsert({ user_id: userId, deck_id: deckId }, { onConflict: 'user_id,deck_id', ignoreDuplicates: true });
  if (deckError) throw new Error("Could not save deck: " + deckError.message);
}

// Removes a deck from My Cards. Progress is only deleted for words that are not
// also in another deck the student still has.
export async function removeDeckFromMyCards(userId, deckId) {
  const wordIds = await fetchDeckWordIds(deckId);

  const { data: otherDecks, error: otherError } = await supabase
    .from('user_decks')
    .select('deck_id')
    .eq('user_id', userId)
    .neq('deck_id', deckId);
  if (otherError) throw new Error("Could not load your other decks: " + otherError.message);

  let keep = new Set();
  if (wordIds.length > 0 && otherDecks.length > 0) {
    const { data: shared, error: sharedError } = await supabase
      .from('deck_words')
      .select('word_id')
      .in('deck_id', otherDecks.map((d) => d.deck_id))
      .in('word_id', wordIds);
    if (sharedError) throw new Error("Could not check shared words: " + sharedError.message);
    keep = new Set(shared.map((r) => r.word_id));
  }

  const toDelete = wordIds.filter((id) => !keep.has(id));
  if (toDelete.length > 0) {
    const { error: progressError } = await supabase
      .from('user_cards')
      .delete()
      .eq('user_id', userId)
      .in('word_id', toDelete);
    if (progressError) throw new Error("Could not remove card progress: " + progressError.message);
  }

  // .select() returns the deleted rows, so an RLS policy that silently blocks the delete shows up as 0 rows
  const { data: removed, error: deckError } = await supabase
    .from('user_decks')
    .delete()
    .eq('user_id', userId)
    .eq('deck_id', deckId)
    .select();
  if (deckError) throw new Error("Could not remove deck: " + deckError.message);
  if (!removed || removed.length === 0) {
    throw new Error("Deck was not removed. Check that a DELETE policy exists on user_decks.");
  }
}

// Due cards for a review session (all decks, or one deck), oldest due first. Never Mastered cards.
export async function fetchReviewRows(deckId = null) {
  const select = deckId
    ? 'word_id, direction, level, words!inner ( id, english, japanese, example_en, example_ja, deck_words!inner ( deck_id ) )'
    : 'word_id, direction, level, words!inner ( id, english, japanese, example_en, example_ja )';
  let query = supabase
    .from('user_cards')
    .select(select)
    .lt('level', MASTERED)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(SESSION_SIZE);
  if (deckId) query = query.eq('words.deck_words.deck_id', deckId);

  const { data, error } = await query;
  if (error) throw new Error("Could not load reviews: " + error.message);
  return data || [];
}

// Progress saves that haven't finished yet. The study screen doesn't wait for saves,
// so points are only counted after these are done (see waitForPendingSaves).
const pendingSaves = new Set();

export function saveProgress(userId, card, newLevel) {
  const save = writeProgress(userId, card, newLevel);
  pendingSaves.add(save);
  const done = () => pendingSaves.delete(save);
  save.then(done, done);
  return save;
}

async function writeProgress(userId, card, newLevel) {
  const { error } = await supabase
    .from('user_cards')
    .update({ ...progressUpdate(newLevel), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('word_id', card.wordId)
    .eq('direction', card.direction);
  if (error) throw new Error("Could not save progress: " + error.message);
}

export async function waitForPendingSaves() {
  await Promise.allSettled([...pendingSaves]);
}

// Reads every row of a query in pages, because Supabase returns at most 1,000 rows per request
// and a big collection has more cards than that. makeQuery() must return a new, sorted query each time.
async function fetchAllPages(makeQuery, errorText) {
  const PAGE = 1000;
  const rows = [];
  let total = null;
  while (total === null || rows.length < total) {
    const { data, error, count } = await makeQuery(total === null)
      .range(rows.length, rows.length + PAGE - 1);
    if (error) throw new Error(errorText + error.message);
    if (total === null) total = count ?? 0;
    if (!data || data.length === 0) break; // safety: rows were removed while reading
    rows.push(...data);
  }
  return rows;
}

// Level of every one of the student's cards.
export async function fetchAllCardLevels() {
  const rows = await fetchAllPages(
    (withCount) => supabase
      .from('user_cards')
      .select('level', withCount ? { count: 'exact' } : undefined)
      .order('word_id', { ascending: true })
      .order('direction', { ascending: true }),
    "Could not load card levels: ",
  );
  return rows.map((r) => r.level);
}

// The student's Mastered cards with their words, newest mastered first.
export async function fetchMasteredCards() {
  const rows = await fetchAllPages(
    (withCount) => supabase
      .from('user_cards')
      .select('word_id, direction, mastered_at, words ( english, japanese )', withCount ? { count: 'exact' } : undefined)
      .eq('level', MASTERED)
      .order('mastered_at', { ascending: false, nullsFirst: false })
      .order('word_id', { ascending: true })
      .order('direction', { ascending: true }),
    "Could not load Mastered cards: ",
  );
  return rows.filter((r) => r.words).map((r) => ({
    id: `${r.word_id}-${r.direction}`,
    wordId: r.word_id,
    direction: r.direction,
    en: r.words.english,
    jp: r.words.japanese,
    masteredAt: r.mastered_at,
  }));
}

// Puts a Mastered card back into reviews (level 1, due now).
export async function restoreMasteredCard(userId, card) {
  const { error } = await supabase
    .from('user_cards')
    .update({ ...restoreUpdate(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('word_id', card.wordId)
    .eq('direction', card.direction);
  if (error) throw new Error("Could not put the card back: " + error.message);
}

// Highest points the student has ever had (0 if they have no user_stats row yet).
export async function fetchPeakPoints() {
  const { data, error } = await supabase
    .from('user_stats')
    .select('peak_points')
    .maybeSingle();
  if (error) throw new Error("Could not load points: " + error.message);
  return data?.peak_points ?? 0;
}

// The database trigger also keeps the highest value, so this can never lower the peak.
export async function savePeakPoints(userId, peakPoints) {
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: userId, peak_points: peakPoints, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error("Could not save points: " + error.message);
}
