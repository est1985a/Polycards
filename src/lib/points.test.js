// Tests for points and rank. Pure functions only: no database, no test account.
// Run with: npm test
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_POINTS, MASTERED } from './srs';
import { cardPoints, totalPoints, levelCounts, playerRank, pointsForRank, RANK_DIVISOR } from './points';

describe('points per card', () => {
  it('uses the agreed values for levels 0 to 7 and Mastered', () => {
    expect(CARD_POINTS).toEqual([0, 1, 2, 3, 5, 8, 13, 21, 34]);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(cardPoints)).toEqual([0, 1, 2, 3, 5, 8, 13, 21]);
  });

  it('makes a Mastered card worth 34 points', () => {
    expect(cardPoints(MASTERED)).toBe(34);
  });

  it('gives 0 for a level outside 0 to 8', () => {
    expect(cardPoints(9)).toBe(0);
    expect(cardPoints(undefined)).toBe(0);
  });
});

describe('total points', () => {
  it('counts both directions of a word separately', () => {
    // one word: English to Japanese at level 3, Japanese to English at level 1
    expect(totalPoints([3, 1])).toBe(3 + 1);
    // 20 words with both directions at level 3 = 40 cards
    expect(totalPoints(Array(40).fill(3))).toBe(120);
  });

  it('gives nothing for level 0 cards (a newly added deck)', () => {
    expect(totalPoints(Array(20).fill(0))).toBe(0);
    expect(totalPoints([0, 0, 2])).toBe(2);
  });

  it('counts Mastered cards', () => {
    expect(totalPoints([7, MASTERED, MASTERED])).toBe(21 + 34 + 34);
  });

  it('is 0 with no cards at all', () => {
    expect(totalPoints([])).toBe(0);
  });
});

describe('cards per level', () => {
  it('counts how many cards are at each level 0 to 7, then Mastered', () => {
    expect(levelCounts([0, 0, 1, 3, 7, 7, 7])).toEqual([2, 1, 0, 1, 0, 0, 0, 3, 0]);
    expect(levelCounts([7, MASTERED, MASTERED])).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 2]);
    expect(levelCounts([])).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('rank', () => {
  it('uses the divisor 10 (same as gacha_player_level() in the database)', () => {
    expect(RANK_DIVISOR).toBe(10);
  });

  it('starts at rank 1', () => {
    expect(playerRank(0)).toBe(1);
    expect(playerRank(9)).toBe(1);
  });

  it('goes up at 10, 40, 90 points ...', () => {
    expect(playerRank(10)).toBe(2);
    expect(playerRank(39)).toBe(2);
    expect(playerRank(40)).toBe(3);
    expect(playerRank(90)).toBe(4);
  });

  it('matches the fixed checks', () => {
    expect(playerRank(0)).toBe(1);
    expect(playerRank(10)).toBe(2);
    expect(playerRank(1000)).toBe(11);
    expect(playerRank(47610)).toBe(70);
    expect(playerRank(47609)).toBe(69);
  });
});

describe('rank curve SQL', () => {
  it('gacha_player_level() in the SQL record uses RANK_DIVISOR', () => {
    const sql = readFileSync(join(import.meta.dirname, '../../supabase/polycards-rank-curve-10.sql'), 'utf8');
    const match = sql.match(/\)\s*\/\s*([\d.]+)\)\)::int \+ 1/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBe(RANK_DIVISOR);
  });
});

describe('server peak points', () => {
  // The database calculates and saves the peak (card_points() in this SQL file), so its table
  // must be the same as CARD_POINTS.
  it('card_points() in the SQL uses the same values as CARD_POINTS', () => {
    const sql = readFileSync(join(import.meta.dirname, '../../supabase/polycards-server-peak-points.sql'), 'utf8');
    const match = sql.match(/function public\.card_points\(p_level int\)[\s\S]*?array\[([\d,\s]+)\]/);
    expect(match).not.toBeNull();
    expect(match[1].split(',').map(Number)).toEqual(CARD_POINTS);
  });
});

describe('points needed for a rank', () => {
  it('matches the agreed steps', () => {
    expect(pointsForRank(1)).toBe(0);
    expect(pointsForRank(2)).toBe(10);
    expect(pointsForRank(3)).toBe(40);
    expect(pointsForRank(9)).toBe(640);
    expect(pointsForRank(70)).toBe(47610);
  });

  it('is exactly where playerRank goes up', () => {
    for (let n = 1; n <= 100; n++) {
      expect(playerRank(pointsForRank(n))).toBe(n);
      if (n > 1) expect(playerRank(pointsForRank(n) - 1)).toBe(n - 1);
    }
  });
});
