// Every Supabase query the app makes lives here.
// Each function throws an Error if something goes wrong, so screens can show the message.
import { supabase } from './supabaseClient';
import { DEFAULT_SESSION_SIZE, MASTERED, restoreUpdate } from './srs';
import { shapeLibrary, shapeCollections } from './library';
import { jstDayBounds, jstHourStart } from './schedule';
import { posKey } from './partsOfSpeech';
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
    .select('position, words ( id, english, japanese, example_en, example_ja, alt_answers, audio_path, pos )')
    .eq('deck_id', deckId)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => r.words).filter(Boolean);
}

// Which of these words the student already has (a user_cards row in either direction).
// Returns the word ids (no duplicates), or null when it can't tell (not signed in, no words,
// or the query failed: only a console.warn). Never throws.
export async function fetchOwnedWordIds(userId, wordIds) {
  if (!userId || !wordIds || wordIds.length === 0) return null;
  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select('word_id')
      .eq('user_id', userId)
      .in('word_id', wordIds);
    if (error) throw error;
    return [...new Set((data || []).map((r) => r.word_id))];
  } catch (e) {
    console.warn("Could not check which words you already have: " + e.message);
    return null;
  }
}

// Returns { wordIds, ownedWordIds }: the deck's words, and the ones the student already
// had before adding (for the pack opening's 所持済み cards). ownedWordIds is null when that
// check fails; adding still goes ahead.
export async function addDeckToMyCards(userId, deckId) {
  const wordIds = await fetchDeckWordIds(deckId);
  if (wordIds.length === 0) throw new Error("Could not load this deck's words: no words found");

  // Must run before the upsert below, which would make every word look owned.
  const ownedWordIds = await fetchOwnedWordIds(userId, wordIds);

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
  return { wordIds, ownedWordIds };
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
    ? 'word_id, direction, level, words!inner ( id, english, japanese, example_en, example_ja, alt_answers, audio_path, pos, deck_words!inner ( deck_id ) )'
    : 'word_id, direction, level, words!inner ( id, english, japanese, example_en, example_ja, alt_answers, audio_path, pos )';
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
// the database checks the spelling itself. extra: { mode, revealMs, answerMs } (how the card was
// answered and how fast, for the teachers' honesty hint; each sent only when set). Resolves with
// what the database returns (null for a card that is no longer due, which is only a console warning).
export function recordAnswer(card, result, sessionId, typed = null, extra = null) {
  const save = answerQueue.then(() => sendAnswer(card, result, sessionId, typed, extra));
  answerQueue = save.catch(() => {}); // a failed answer doesn't hold up the next one
  pendingSaves.add(save);
  const done = () => pendingSaves.delete(save);
  save.then(done, done);
  return save;
}

async function sendAnswer(card, result, sessionId, typed, extra) {
  const args = {
    p_word_id: card.wordId,
    p_direction: card.direction,
    p_result: result,
    p_session_id: sessionId,
  };
  if (typed !== null) args.p_typed = typed;
  if (extra?.mode) args.p_mode = extra.mode;
  if (extra?.revealMs != null) args.p_reveal_ms = extra.revealMs;
  if (extra?.answerMs != null) args.p_answer_ms = extra.answerMs;
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

// The last まだ / わかった answer is held back so the student can undo it (StudySession). It is
// sent when the next answer is given, when the review is left, when the app goes to the
// background, and before signing out. heldSend: a function that sends it (calls recordAnswer).
let heldSend = null;

// Holds one answer; an answer already held is sent first, so answers still go in order.
export function holdAnswer(send) {
  flushHeldAnswer();
  heldSend = send;
}

// Sends the held answer now (it goes into pendingSaves straight away). true if there was one.
export function flushHeldAnswer() {
  const send = heldSend;
  heldSend = null;
  if (!send) return false;
  send();
  return true;
}

// Undo: forgets the held answer without sending it.
export function dropHeldAnswer() {
  heldSend = null;
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
      .select('word_id, direction, mastered_at, words ( english, japanese, pos )', withCount ? { count: 'exact' } : undefined)
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
    pos: posKey(r.words.pos),
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

// Stats page: every day the student studied (Japan dates, oldest first). Only effort counters are
// read, never got_it / not_yet (the stats page shows no accuracy).
export async function fetchStudyDays() {
  return fetchAllPages(
    () => supabase
      .from('user_study_daily')
      .select('day, reviews, spelled_correctly, bonus_points', { count: 'exact' })
      .order('day', { ascending: true }),
    "Could not load study days: ",
  );
}

// Stats page: all-time totals (zeros if the student has no row yet).
export async function fetchStudyTotals() {
  const { data, error } = await supabase
    .from('user_study_totals')
    .select('reviews, spelled_correctly, bonus_points')
    .maybeSingle();
  if (error) throw new Error("Could not load study totals: " + error.message);
  return {
    reviews: data?.reviews ?? 0,
    spelled_correctly: data?.spelled_correctly ?? 0,
    bonus_points: data?.bonus_points ?? 0,
  };
}

// Stats page: the most-missed words of the last 30 days (my_trouble_words() with its defaults,
// supabase/polycards-trouble-words.sql): [{ word_id, english, japanese, misses, last_missed, lowest_level }].
export async function fetchTroubleWords() {
  const { data, error } = await supabase.rpc('my_trouble_words');
  if (error) throw new Error("Could not load trouble words: " + error.message);
  return data || [];
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

// Unlocked themes the student has already been told about (saved on the account,
// supabase/polycards-seen-theme-unlocks.sql): a list of theme keys.
export async function fetchSeenThemeUnlocks() {
  const { data, error } = await supabase.rpc('seen_theme_unlocks');
  if (error) throw new Error("Could not load seen themes: " + error.message);
  return Array.isArray(data) ? data : [];
}

// Adds these theme keys to the seen list; returns the whole saved list.
export async function markThemeUnlocksSeen(keys) {
  const { data, error } = await supabase.rpc('mark_theme_unlocks_seen', { p_keys: keys });
  if (error) throw new Error("Could not save seen themes: " + error.message);
  return Array.isArray(data) ? data : [];
}

// Training tab progress (supabase/polycards-training-progress.sql): the student's own rows,
// [{ practice_id, times_completed, first_completed_at, last_completed_at }].
export async function fetchTrainingProgress() {
  const { data, error } = await supabase
    .from('user_training_progress')
    .select('practice_id, times_completed, first_completed_at, last_completed_at');
  if (error) throw new Error("Could not load training progress: " + error.message);
  return data || [];
}

// A practice was completed (practice ids: letterPracticeId() in training.js).
export async function recordTrainingCompletion(practiceId) {
  const { error } = await supabase.rpc('record_training_completion', { p_practice_id: practiceId });
  if (error) throw new Error("Could not save training progress: " + error.message);
}

// ---- Teachers and classes (supabase/polycards-teachers.sql) ----
// Every call goes through a database function that checks who is calling; hiding the 先生 tab is
// only for convenience.

// Database error code → i18n key of the message. Codes that contain another code come first
// (not_class_teacher before not_teacher), because the message is matched by "includes".
const CLASS_ERRORS = {
  not_class_teacher: "errors.notClassTeacher",
  not_teacher: "errors.notTeacher",
  not_signed_in: "errors.notSignedIn",
  bad_code: "errors.badJoinCode",
  class_archived: "errors.classArchived",
  already_member: "errors.alreadyMember",
  not_member: "errors.notMember",
  bad_class_name: "errors.badClassName",
  bad_school_year: "errors.badSchoolYear",
  bad_name: "errors.badRealName",
  bad_number: "errors.badStudentNumber",
  query_too_short: "errors.queryTooShort",
  user_not_found: "errors.userNotFound",
  target_not_teacher: "errors.targetNotTeacher",
  already_teacher: "errors.alreadyTeacher",
  bad_amount: "errors.badAmount",
  message_too_long: "errors.messageTooLong",
  no_students: "errors.noStudents",
  nickname_taken: "errors.nicknameTaken",
  bad_nickname: "errors.badNickname",
};

// Turns a database error (e.g. "bad_code") into a friendly message.
export function classErrorMessage(error) {
  const text = error?.message || "";
  const code = Object.keys(CLASS_ERRORS).find((c) => text.includes(c));
  return code ? t(CLASS_ERRORS[code]) : t("errors.classFailed", { detail: text || "unknown error" });
}

async function callClass(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(classErrorMessage(error));
  return data;
}

// Am I a teacher? (shows the 先生 tab). Never throws: an error counts as "no".
export async function fetchIsTeacher() {
  const { data, error } = await supabase.rpc('is_teacher');
  if (error) {
    console.warn("Could not check teacher status: " + error.message);
    return false;
  }
  return data === true;
}

// My classes as a teacher: [{ id, name, school_year, join_code, archived, student_count, created_at }].
export async function fetchTeacherClasses(archived = false) {
  return (await callClass('teacher_classes', { p_archived: archived })) || [];
}

// A new class (the caller becomes its teacher): { id, join_code }.
export function createClass(name, schoolYear) {
  return callClass('create_class', { p_name: name, p_school_year: schoolYear });
}

export function updateClass(classId, name, schoolYear) {
  return callClass('update_class', { p_class_id: classId, p_name: name, p_school_year: schoolYear });
}

export function setClassArchived(classId, archived) {
  return callClass('set_class_archived', { p_class_id: classId, p_archived: archived });
}

// A new join code (the old one stops working). Returns the new code.
export function regenerateJoinCode(classId) {
  return callClass('regenerate_join_code', { p_class_id: classId });
}

// One class: { class: { id, name, school_year, join_code, archived },
//   students: [{ student_id, real_name, student_number, display_name, email, joined_at }],
//   teachers: [{ teacher_id, display_name, is_me }] }
export async function fetchClassDetail(classId) {
  const data = await callClass('class_detail', { p_class_id: classId });
  return { class: data?.class ?? null, students: data?.students ?? [], teachers: data?.teachers ?? [] };
}

// Teachers only: accounts whose username, Google name or email contains the text (max 20):
// [{ id, display_name, username, email, is_teacher }]. teachersOnly: for adding a co-teacher.
export async function searchUsers(query, teachersOnly = false) {
  return (await callClass('search_users', { p_query: query, p_teachers_only: teachersOnly })) || [];
}

export function addStudentToClass(classId, studentId, realName, studentNumber) {
  return callClass('add_student_to_class', {
    p_class_id: classId, p_student_id: studentId, p_real_name: realName, p_student_number: studentNumber,
  });
}

export function updateClassMember(classId, studentId, realName, studentNumber) {
  return callClass('update_class_member', {
    p_class_id: classId, p_student_id: studentId, p_real_name: realName, p_student_number: studentNumber,
  });
}

export function removeStudentFromClass(classId, studentId) {
  return callClass('remove_student_from_class', { p_class_id: classId, p_student_id: studentId });
}

export function addCoTeacher(classId, teacherUserId) {
  return callClass('add_co_teacher', { p_class_id: classId, p_teacher_user_id: teacherUserId });
}

// Student: is this code a class I can join? { id, name } (else bad_code / class_archived / already_member).
export function checkJoinCode(code) {
  return callClass('check_join_code', { p_code: code });
}

// Student: join the class with this code, with the nickname classmates will see. { id, name }
export function joinClass(code, realName, studentNumber, nickname) {
  return callClass('join_class', { p_code: code, p_real_name: realName, p_student_number: studentNumber, p_nickname: nickname });
}

// Student: the classes I'm in (names only): [{ id, name, joined_at }].
export async function fetchMyClasses() {
  return (await callClass('my_classes')) || [];
}

// ---- Teacher area, Phase 2 (supabase/polycards-teacher-phase2.sql) ----

// Teacher: one student's page (only students in a class I teach): { student, last_studied_at, avatar,
// peak_points, bonus_points, player_level, tickets, level_counts (9), days, totals, trouble, packs, awards }.
export async function fetchStudentDetail(classId, studentId) {
  const d = (await callClass('student_detail', { p_class_id: classId, p_student_id: studentId })) || {};
  return {
    ...d,
    days: d.days ?? [],
    trouble: d.trouble ?? [],
    packs: d.packs ?? [],
    awards: d.awards ?? [],
    level_counts: d.level_counts ?? Array(9).fill(0),
    totals: { reviews: 0, spelled_correctly: 0, bonus_points: 0, ...(d.totals || {}) },
  };
}

// Teacher: give 1–10 tickets (and an optional message) to students of this class.
// Returns { batch_id, students, amount }.
export function awardTickets(classId, studentIds, amount, message) {
  return callClass('award_tickets', { p_class_id: classId, p_student_ids: studentIds, p_amount: amount, p_message: message });
}

// Teacher: recent awards in a class, one row per give:
// [{ batch_id, created_at, teacher_name, amount, message, student_count, student_names }].
export async function fetchClassAwards(classId) {
  return (await callClass('class_awards', { p_class_id: classId })) || [];
}

// ---- Teacher area, Phase 3 (supabase/polycards-teacher-phase3.sql) ----

// Teacher: the whole class in one call, one row per student: [{ student_id, real_name, student_number,
// display_name, last_studied_at, reviews, study_days (both in the last `days` Japan days), streak,
// player_level, cards, tickets, honesty (counts over honestyDays, see src/lib/honesty.js) }].
export async function fetchClassOverview(classId, days, fastMs, honestyDays) {
  return (await callClass('class_overview', {
    p_class_id: classId, p_days: days, p_fast_ms: fastMs, p_honesty_days: honestyDays,
  })) || [];
}

// Teacher: the words the class missed most in the last `days` Japan days (top 20):
// [{ word_id, english, japanese, pos, student_count, misses, students: [{ student_id, real_name, student_number, misses }] }].
export async function fetchClassTroubleWords(classId, days) {
  return (await callClass('class_trouble_words', { p_class_id: classId, p_days: days })) || [];
}

// Teacher: one student's honesty counts (see src/lib/honesty.js).
export async function fetchStudentHonesty(classId, studentId, days, fastMs) {
  return (await callClass('student_honesty', {
    p_class_id: classId, p_student_id: studentId, p_days: days, p_fast_ms: fastMs,
  })) || {};
}

// Student: awards not seen yet, oldest first: [{ id, teacher_name, amount, message, created_at }].
// Never throws (the pop-up is a bonus): an error → console.warn and [].
export async function fetchUnseenAwards() {
  const { data, error } = await supabase.rpc('my_unseen_awards');
  if (error) {
    console.warn("Could not load awards: " + error.message);
    return [];
  }
  return data || [];
}

// Student: the pop-up showed these awards. Never throws (a failure only means it shows again).
export async function markAwardsSeen(ids) {
  if (!ids?.length) return;
  const { error } = await supabase.rpc('mark_awards_seen', { p_ids: ids });
  if (error) console.error("Could not mark awards seen: " + error.message);
}

// ---- クラス tab (supabase/polycards-class-tab.sql) ----

// Student: one of my classes: { id, name, school_year, leaderboard_enabled, nickname (null = not chosen yet),
// teachers: [display names] }.
export async function fetchMyClassInfo(classId) {
  const d = (await callClass('my_class_info', { p_class_id: classId })) || {};
  return { ...d, teachers: d.teachers ?? [], nickname: d.nickname ?? null };
}

// Student: my nickname in a class. Returns it as saved (cleaned).
export function setMyNickname(classId, nickname) {
  return callClass('set_my_nickname', { p_class_id: classId, p_nickname: nickname });
}

// Student or teacher of the class: this week's leaderboard: { enabled, archived, week_start,
// top: [{ rank, nickname, reviews, is_me, avatar }], me: { nickname, rank, reviews } | null,
// last_week: [same as top] }. Switched off (students) or archived: { enabled: false } and nothing else.
export async function fetchClassLeaderboard(classId) {
  const d = (await callClass('class_leaderboard', { p_class_id: classId })) || {};
  return { ...d, enabled: d.enabled === true, top: d.top ?? [], last_week: d.last_week ?? [], me: d.me ?? null };
}

// Teacher: the class's ランキング switch.
export function setClassLeaderboard(classId, enabled) {
  return callClass('set_class_leaderboard', { p_class_id: classId, p_enabled: enabled });
}

// Teacher: a student's nickname ('' clears it, so the student is asked to choose again).
export function setMemberNickname(classId, studentId, nickname) {
  return callClass('set_member_nickname', { p_class_id: classId, p_student_id: studentId, p_nickname: nickname });
}
