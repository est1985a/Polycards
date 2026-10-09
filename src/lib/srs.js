// SRS settings (My Cards)
// Wait time (in hours) before a card is due again, by level it has just reached.
// Level 0 = new, level 7 = mastered (about 4 months).
export const LEVEL_HOURS = [0, 4, 24, 72, 168, 336, 720, 2880];
// Points each card (one word in one direction) is worth, by its level. New cards are worth 0.
export const CARD_POINTS = [0, 1, 2, 3, 5, 8, 13, 21];
export const MAX_LEVEL = LEVEL_HOURS.length - 1;
export const SESSION_SIZE = 20; // max cards per review session

// Level after a correct first-try answer.
export function levelAfterCorrect(level) {
  return Math.min(level + 1, MAX_LEVEL);
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

// When a card at this level is due again.
export function nextReviewDate(level, now = Date.now()) {
  return new Date(now + LEVEL_HOURS[level] * 3600 * 1000);
}

// Text of the "Level Up!" float after an SRS answer, or null when nothing should show.
// level: the card's level at the start of the session. wrongsSoFar: misses on it this session.
// Only a clean correct answer moves a card up (same rule as StudySession's save); a card already
// at the top level shows "MAX".
export function levelUpLabel(level, knew, wrongsSoFar = 0) {
  if (!knew || wrongsSoFar > 0) return null;
  if (level >= MAX_LEVEL) return "MAX";
  return `Level Up! Lv ${levelAfterCorrect(level)}`;
}
