// SRS settings (My Cards)
// Wait time (in hours) before a card is due again, by level it has just reached.
// Level 0 = new, level 7 = about 4 months. A correct answer at level 7 makes the card Mastered.
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

// user_cards fields to save after an answer that leaves the card at this level.
export function progressUpdate(level, now = Date.now()) {
  const next = nextReviewDate(level, now);
  return {
    level,
    next_review_at: next ? next.toISOString() : null,
    mastered_at: isMastered(level) ? new Date(now).toISOString() : null,
  };
}

// user_cards fields that put a Mastered card back into reviews: level 1, due now.
export function restoreUpdate(now = Date.now()) {
  return { level: RESTORED_LEVEL, next_review_at: new Date(now).toISOString(), mastered_at: null };
}

// Text of the "Level Up!" float after an SRS answer, or null when nothing should show.
// level: the card's level at the start of the session. wrongsSoFar: misses on it this session.
// Only a clean correct answer moves a card up (same rule as StudySession's save); a card
// at the top level becomes Mastered.
export function levelUpLabel(level, knew, wrongsSoFar = 0) {
  if (!knew || wrongsSoFar > 0) return null;
  const next = levelAfterCorrect(level);
  if (isMastered(next)) return "Mastered!";
  return `Lv ${next}!`;
}
