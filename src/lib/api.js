// Every Supabase query the app makes lives here.
// Each function throws an Error if something goes wrong, so screens can show the message.
import { supabase } from './supabaseClient';
import { SESSION_SIZE, nextReviewDate } from './srs';

// Global library: textbooks → units → decks, grouped by school level.
export async function fetchLibrary() {
  const { data, error } = await supabase
    .from('textbooks')
    .select(`
      id, name, school_level,
      units ( id, name, unit_order, decks ( id, name ) )
    `)
    .order('created_at', { ascending: true });
  if (error) throw new Error("Supabase Error: " + error.message);

  const grouped = { JHS: [], HS: [], Other: [] };
  (data || []).forEach((tb) => {
    if (tb.units) tb.units.sort((a, b) => a.unit_order - b.unit_order);
    (grouped[tb.school_level] || grouped.Other).push(tb);
  });
  return grouped;
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

// Cards that are due now (used for the due counts).
// Each row lists every deck its word belongs to, since words can be shared between decks.
export async function fetchDueRows() {
  const { data, error } = await supabase
    .from('user_cards')
    .select('word_id, direction, words ( deck_words ( deck_id ) )')
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
    .select('position, words ( id, english, japanese )')
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

// Due cards for a review session (all decks, or one deck), oldest due first.
export async function fetchReviewRows(deckId = null) {
  const select = deckId
    ? 'word_id, direction, level, words!inner ( id, english, japanese, deck_words!inner ( deck_id ) )'
    : 'word_id, direction, level, words!inner ( id, english, japanese )';
  let query = supabase
    .from('user_cards')
    .select(select)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(SESSION_SIZE);
  if (deckId) query = query.eq('words.deck_words.deck_id', deckId);

  const { data, error } = await query;
  if (error) throw new Error("Could not load reviews: " + error.message);
  return data || [];
}

export async function saveProgress(userId, card, newLevel) {
  const { error } = await supabase
    .from('user_cards')
    .update({
      level: newLevel,
      next_review_at: nextReviewDate(newLevel).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('word_id', card.wordId)
    .eq('direction', card.direction);
  if (error) throw new Error("Could not save progress: " + error.message);
}
