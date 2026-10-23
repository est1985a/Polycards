// Every Supabase query the app makes lives here.
// Each function throws an Error if something goes wrong, so screens can show the message.
import { supabase } from './supabaseClient';
import { DEFAULT_SESSION_SIZE, MASTERED, restoreUpdate } from './srs';
import { shapeLibrary, shapeCollections } from './library';
import { jstDayBounds, jstHourStart } from './schedule';
import { t } from '../i18n';

// Global library: textbooks → units → decks (with each deck's word count), as a flat list
// shaped by shapeLibrary. deck_words ( count ) returns only a number per deck, not the rows.
export async function fetchLibrary() {
  const { data, error } = await supabase
    .from('textbooks')
    .select(`
      id, name, school_level,
      units ( id, name, unit_order, decks ( id, name, sort_order, deck_words ( count ) ) )
    `)
    .order('created_at', { ascending: true });
  if (error) throw new Error("Supabase Error: " + error.message);
  return shapeLibrary(data);
}

// Tests & Themes: every collection and the decks linked to each (with word counts), as a tree
// shaped by shapeCollections. Both lists are read in pages, so nothing is cut off at 1,000 rows.
export async function fetchCollections() {
  const [collections, links] = await Promise.all([
    fetchAllPages(
      (withCount) => supabase
        .from('collections')
        .select('id, name, parent_id, sort_order', withCount ? { count: 'exact' } : undefined)
        .order('id', { ascending: true }),
      "Could not load collections: ",
    ),
    fetchAllPages(
      (withCount) => supabase
        .from('collection_decks')
        .select('collection_id, decks ( id, name, sort_order, deck_words ( count ) )', withCount ? { count: 'exact' } : undefined)
        .order('collection_id', { ascending: true })
        .order('deck_id', { ascending: true }),
      "Could not load collection decks: ",
    ),
  ]);
  return shapeCollections(collections, links);
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
// Read in pages, so the totals stay right beyond 1,000 due cards.
export async function fetchDueRows() {
  const now = new Date().toISOString();
  return fetchAllPages(
    (withCount) => supabase
      .from('user_cards')
      .select('word_id, direction, words ( deck_words ( deck_id ) )', withCount ? { count: 'exact' } : undefined)
      .lt('level', MASTERED)
      .lte('next_review_at', now)
      .order('word_id', { ascending: true })
      .order('direction', { ascending: true }),
    "Could not load due cards: ",
  );
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
    .select('position, words ( id, english, japanese, example_en, example_ja, alt_answers )')
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
// limit: the student's 1回の枚数 (10, 20 or 30).
export async function fetchReviewRows(deckId = null, limit = DEFAULT_SESSION_SIZE) {
  const select = deckId
    ? 'word_id, direction, level, words!inner ( id, english, japanese, example_en, example_ja, alt_answers, deck_words!inner ( deck_id ) )'
    : 'word_id, direction, level, words!inner ( id, english, japanese, example_en, example_ja, alt_answers )';
  let query = supabase
    .from('user_cards')
    .select(select)
    .lt('level', MASTERED)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(limit);
  if (deckId) query = query.eq('words.deck_words.deck_id', deckId);

  const { data, error } = await query;
  if (error) throw new Error("Could not load reviews: " + error.message);
  return data || [];
}

// Review answers that haven't finished saving yet. The study screen doesn't wait for saves,
// so points are only counted after these are done (see waitForPendingSaves).
const pendingSaves = new Set();
// Answers are sent one at a time, in the order they were given, so a まだ and the same
// card's next answer can never reach the database out of order.
let answerQueue = Promise.resolve();

// Database error code → i18n key of the message.
const ANSWER_ERRORS = {
  card_not_found: "errors.cardNotFound",
  not_signed_in: "errors.notSignedIn",
};

export function answerErrorMessage(error) {
  const text = error?.message || "";
  const code = Object.keys(ANSWER_ERRORS).find((c) => text.includes(c));
  return t(code ? ANSWER_ERRORS[code] : "errors.saveFailed");
}

// Saves one SRS review answer through the database function record_answer(), which works out
// the new level, saves the card and logs the answer. result: 'got_it' (わかった) or 'not_yet' (まだ).
// sessionId: one id per review session. typed: what the student typed (typing mode), else null;
// the database checks the spelling itself. Resolves with what the database returns
// (null for a card that is no longer due, which is only a console warning).
export function recordAnswer(card, result, sessionId, typed = null) {
  const save = answerQueue.then(() => sendAnswer(card, result, sessionId, typed));
  answerQueue = save.catch(() => {}); // a failed answer doesn't hold up the next one
  pendingSaves.add(save);
  const done = () => pendingSaves.delete(save);
  save.then(done, done);
  return save;
}

async function sendAnswer(card, result, sessionId, typed) {
  const args = {
    p_word_id: card.wordId,
    p_direction: card.direction,
    p_result: result,
    p_session_id: sessionId,
  };
  if (typed !== null) args.p_typed = typed;
  const { data, error } = await supabase.rpc('record_answer', args);
  if (error) {
    if ((error.message || "").includes('not_due')) {
      console.warn("Answer not saved: card is not due", card.wordId, card.direction);
      return null;
    }
    console.error("record_answer failed:", error.message);
    throw new Error(answerErrorMessage(error));
  }
  return data;
}

// Typing mode: is what the student typed another library word that shares a Japanese meaning
// with this card (e.g. "from" on the から card that wants "since")? Saves nothing. A failed check
// counts as false (only a console warning, never a pop-up), so the answer is simply wrong.
export async function checkOtherMeaning(wordId, typed) {
  try {
    const { data, error } = await supabase.rpc('other_meaning_check', { p_word_id: wordId, p_typed: typed });
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.warn("other_meaning_check failed, treating the answer as wrong:", error?.message || error);
    return false;
  }
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

// The next review after now: { at, count }, where count is how many cards come due in that
// Japan-time clock hour (one user_cards row = one card, like the due count). null when no card is
// waiting (no cards, or all Mastered). The count is a head-only query, so the 1,000-row limit never applies.
export async function fetchNextReview() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_cards')
    .select('next_review_at')
    .lt('level', MASTERED)
    .gt('next_review_at', now)
    .order('next_review_at', { ascending: true })
    .limit(1);
  if (error) throw new Error("Could not load the next review: " + error.message);
  if (!data || data.length === 0) return null;

  const at = Date.parse(data[0].next_review_at);
  const hourEnd = new Date(jstHourStart(at) + 3600 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('user_cards')
    .select('word_id', { count: 'exact', head: true })
    .lt('level', MASTERED)
    .gt('next_review_at', now)
    .lt('next_review_at', hourEnd);
  if (countError) throw new Error("Could not load the next review: " + countError.message);
  return { at, count: count ?? 0 };
}

// Review times of cards due between now and the end of tomorrow (Japan time), for the
// review plan pop-up (grouped by groupReviewPlan). Read in pages, so nothing is cut off at 1,000.
export async function fetchReviewPlanRows() {
  const now = Date.now();
  const { endOfTomorrow } = jstDayBounds(now);
  return fetchAllPages(
    (withCount) => supabase
      .from('user_cards')
      .select('next_review_at, level', withCount ? { count: 'exact' } : undefined)
      .lt('level', MASTERED)
      .gt('next_review_at', new Date(now).toISOString())
      .lt('next_review_at', new Date(endOfTomorrow).toISOString())
      .order('word_id', { ascending: true })
      .order('direction', { ascending: true }),
    "Could not load the review plan: ",
  );
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

// Spelling bonus points the student has earned in typing mode (0 if they have no row yet).
// They count toward rank on top of the peak (see playerRank in points.js).
export async function fetchBonusPoints() {
  const { data, error } = await supabase
    .from('user_study_totals')
    .select('bonus_points')
    .maybeSingle();
  if (error) throw new Error("Could not load bonus points: " + error.message);
  return data?.bonus_points ?? 0;
}

// The database trigger also keeps the highest value, so this can never lower the peak.
export async function savePeakPoints(userId, peakPoints) {
  const { error } = await supabase
    .from('user_stats')
    .upsert({ user_id: userId, peak_points: peakPoints, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error("Could not save points: " + error.message);
}

// ---------------------------------------------------------------------
// Gacha. The app only calls these database functions (see supabase/polycards-gacha.sql),
// never the gacha tables. Reviews and tickets are counted by the database.
// ---------------------------------------------------------------------

// Database error code → i18n key of the message.
const GACHA_ERRORS = {
  no_tickets: "errors.noTickets",
  collection_complete: "errors.collectionComplete",
  not_owned: "errors.notOwned",
  theme_locked: "errors.themeLocked",
  not_signed_in: "errors.notSignedIn",
};

// Turns a database error code (e.g. "no_tickets") into a friendly message.
export function gachaErrorMessage(error) {
  const text = error?.message || "";
  const code = Object.keys(GACHA_ERRORS).find((c) => text.includes(c));
  return code ? t(GACHA_ERRORS[code]) : t("errors.gachaFailed", { detail: text || "unknown error" });
}

async function callGacha(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(gachaErrorMessage(error));
  return data;
}

// Tickets, progress to the next ticket, live odds, owned/total and the equipped avatar.
export function fetchGachaStatus() {
  return callGacha('gacha_status');
}

// One pull: { avatar: { id, slug, name_ja, name_en, rarity, series, image_url }, tickets_left }
export function pullGacha() {
  return callGacha('gacha_pull');
}

// Every avatar for the collection. Unowned ones come without a name; unowned Secrets also without a picture.
export async function fetchGachaCollection() {
  return (await callGacha('gacha_collection')) || [];
}

export function equipAvatar(avatarId) {
  return callGacha('gacha_equip_avatar', { p_avatar_id: avatarId });
}

// Saves the chosen theme on the account (only themes unlocked at the student's rank, else theme_locked).
// gacha_status() returns it as `theme`.
export function setGachaTheme(theme) {
  return callGacha('gacha_set_theme', { p_theme: theme });
}

// The rank needed for each theme: [{ theme_key, unlock_level }]. Signed-in users may read this
// table (the one gacha table the app reads directly). Read once after sign-in.
export async function fetchThemeUnlocks() {
  const { data, error } = await supabase
    .from('theme_unlocks')
    .select('theme_key, unlock_level')
    .order('unlock_level', { ascending: true });
  if (error) throw new Error("Could not load themes: " + error.message);
  return data || [];
}
