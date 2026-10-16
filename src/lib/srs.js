// SRS settings (My Cards)
// Wait time (in hours) before a card is due again, by level it has just reached.
// Level 0 = new, level 7 = about 4 months. A correct answer at level 7 makes the card Mastered.
// The database works out the saved level itself: LEVEL_HOURS must stay in step with
// study_level_hours() in supabase/polycards-answers.sql.
export const LEVEL_HOURS = [0, 4, 24, 72, 168, 336, 720, 2880];
export const MAX_LEVEL = LEVEL_HOURS.length - 1; // highest level that is still reviewed
// Mastered is stored as one level above MAX_LEVEL, with no next review.
export const MASTERED = MAX_LEVEL + 1;
// Points each card (one word in one direction) is worth, by its level. New cards are worth 0;
// the last entry is for Mastered cards.
export const CARD_POINTS = [0, 1, 2, 3, 5, 8, 13, 21, 34];
export const SESSION_SIZE = 20; // max cards per review session

// The full due total, but only when it is more than one session can hold (otherwise null).
export function extraDueTotal(dueCount) {
  return dueCount > SESSION_SIZE ? dueCount : null;
}
// A mastered card put back into reviews starts again at this level, due right away.
export const RESTORED_LEVEL = 1;

export function isMastered(level) {
  return level >= MASTERED;
}

// Level after a correct first-try answer (level 7 → Mastered).
export function levelAfterCorrect(level) {
  return Math.min(level + 1, MASTERED);
}

// Wrong-answer penalty (WaniKani style):
// - every 2 misses on the same card in a session = 1 step down
// - from level 5 up, the penalty is doubled
// - a card you had already learned never drops below level 1
// The saved level comes from record_answer() in supabase/polycards-answers.sql (keep both in step);
// the app uses this for the level-up float and tests.
export function levelAfterWrong(level, wrongCount) {
  if (level <= 0) return 0;
  const factor = level >= 5 ? 2 : 1;
  const drop = Math.ceil(wrongCount / 2) * factor;
  return Math.max(1, level - drop);
}

// When a card at this level is due again (null for a Mastered card: it is never due).
export function nextReviewDate(level, now = Date.now()) {
  if (isMastered(level)) return null;
  return new Date(now + LEVEL_HOURS[level] * 3600 * 1000);
}

// user_cards fields that put a Mastered card back into reviews: level 1, due now.
export function restoreUpdate(now = Date.now()) {
  return { level: RESTORED_LEVEL, next_review_at: new Date(now).toISOString(), mastered_at: null };
}

// Text of the "Level Up!" float after an SRS answer, or null when nothing should show.
// level: the card's level at the start of the session. wrongsSoFar: misses on it this session.
// Only a clean correct answer moves a card up (same rule as record_answer); a card
// at the top level becomes Mastered.
export function levelUpLabel(level, knew, wrongsSoFar = 0) {
  if (!knew || wrongsSoFar > 0) return null;
  const next = levelAfterCorrect(level);
  if (isMastered(next)) return "Mastered!";
  return `Lv ${next}!`;
}

// A new id for one review session (record_answer uses it to spot a まだ card coming back).
// crypto.randomUUID() is missing in older browsers and on plain-http addresses, so fall back
// to building a random UUID v4 by hand.
export function newSessionId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// What one SRS answer does. level: the card's level at the start of the session.
// wrongsSoFar: misses on it this session. Every answer is sent to record_answer (result),
// even わかった on a card missed earlier: the database logs it without changing the level.
// label / mastered: the level-up float (null label = no float). again: the card comes back later.
export function srsAnswer(level, knew, wrongsSoFar = 0) {
  const label = levelUpLabel(level, knew, wrongsSoFar);
  return {
    result: knew ? "got_it" : "not_yet",
    wrongs: knew ? wrongsSoFar : wrongsSoFar + 1,
    label,
    mastered: Boolean(label) && isMastered(levelAfterCorrect(level)),
    again: !knew,
  };
}

// Shows a failed review save at most once per session (each failure is still logged in
// api.js). Make a new one for each review session.
export function saveErrorReporter(show = (message) => alert(message)) {
  let shown = false;
  return (error) => {
    if (shown) return;
    shown = true;
    show(error.message);
  };
}
