// Points and player level. Pure functions only (no database), so they are easy to test
// and the screens can show the results however they like.
import { CARD_POINTS, MAX_LEVEL } from './srs';

// Points for one card at this level.
export function cardPoints(level) {
  return CARD_POINTS[level] ?? 0;
}

// Total points for a list of card levels (one entry per user_cards row,
// so both directions of a word count separately).
export function totalPoints(levels) {
  return levels.reduce((sum, level) => sum + cardPoints(level), 0);
}

// How many cards are at each level: [level 0 count, level 1 count, ..., level 7 count].
export function levelCounts(levels) {
  const counts = Array(MAX_LEVEL + 1).fill(0);
  levels.forEach((level) => {
    if (counts[level] !== undefined) counts[level]++;
  });
  return counts;
}

// Player level from peak points. Change this formula to make levels faster or slower.
// Level 2 at 20 points, 3 at 80, 4 at 180, 5 at 320 ... (points needed = 20 × (level − 1)²).
export function playerLevel(peakPoints) {
  return Math.floor(Math.sqrt(peakPoints / 20)) + 1;
}

// Peak points needed to reach a player level (the reverse of playerLevel): 20 × (level − 1)².
// Used for the "points to the next level" bar. Keep in step with playerLevel above.
export function pointsForLevel(level) {
  return 20 * (level - 1) ** 2;
}

// The peak only goes up: removing a deck or losing levels never lowers it.
export function newPeak(currentPoints, savedPeak) {
  return Math.max(currentPoints, savedPeak);
}
