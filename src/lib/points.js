// Points and rank (the player's level, called player_level in the database). Pure functions only (no database), so they are easy to test
// and the screens can show the results however they like.
import { CARD_POINTS, MASTERED } from './srs';

// Points for one card at this level.
export function cardPoints(level) {
  return CARD_POINTS[level] ?? 0;
}

// Total points for a list of card levels (one entry per user_cards row,
// so both directions of a word count separately). The database has the same rule
// (card_points() / card_points_total() in supabase/polycards-server-peak-points.sql) and is the one
// that saves the peak; keep CARD_POINTS and card_points() in step.
export function totalPoints(levels) {
  return levels.reduce((sum, level) => sum + cardPoints(level), 0);
}

// How many cards are at each level: [level 0 count, ..., level 7 count, Mastered count].
export function levelCounts(levels) {
  const counts = Array(MASTERED + 1).fill(0);
  levels.forEach((level) => {
    if (counts[level] !== undefined) counts[level]++;
  });
  return counts;
}

// Rank from rank points = peak points + spelling bonus points (typing mode, user_study_totals).
// Change this formula to make ranks go up faster or slower, and change gacha_player_level() in
// supabase/polycards-answers.sql to match.
// Rank 2 at 20 points, 3 at 80, 4 at 180, 5 at 320 ... (points needed = 20 × (rank − 1)²).
export function playerRank(rankPoints) {
  return Math.floor(Math.sqrt(rankPoints / 20)) + 1;
}

// Rank points (peak + spelling bonus) needed to reach a rank (the reverse of playerRank): 20 × (rank − 1)².
// Used for the "points to the next rank" bar. Keep in step with playerRank above.
export function pointsForRank(rank) {
  return 20 * (rank - 1) ** 2;
}
