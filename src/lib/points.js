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
// The only place the rank curve lives in the app. It must match gacha_player_level() in the database
// (supabase/polycards-rank-curve-10.sql, live since 2026-11-01; it was 20 before).
export const RANK_DIVISOR = 10;

// Rank 2 at 10 points, 3 at 40, 4 at 90, 5 at 160 ... (points needed = RANK_DIVISOR × (rank − 1)²).
export function playerRank(rankPoints) {
  return Math.floor(Math.sqrt(rankPoints / RANK_DIVISOR)) + 1;
}

// Rank points (peak + spelling bonus) needed to reach a rank (the reverse of playerRank):
// RANK_DIVISOR × (rank − 1)². Used for the "points to the next rank" bar.
export function pointsForRank(rank) {
  return RANK_DIVISOR * (rank - 1) ** 2;
}
