// Tests for points and rank. Pure functions only: no database, no test account.
// Run with: npm test
import { describe, it, expect } from 'vitest';
import { CARD_POINTS, MASTERED, RESTORED_LEVEL } from './srs';
import { cardPoints, totalPoints, levelCounts, playerRank, pointsForRank, newPeak } from './points';

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
  it('starts at rank 1', () => {
    expect(playerRank(0)).toBe(1);
    expect(playerRank(19)).toBe(1);
  });

  it('goes up at 20, 80, 180 points ...', () => {
    expect(playerRank(20)).toBe(2);
    expect(playerRank(79)).toBe(2);
    expect(playerRank(80)).toBe(3);
    expect(playerRank(180)).toBe(4);
  });

  it('matches the approved example table', () => {
    expect(playerRank(120)).toBe(3);    // 20 words at level 3
    expect(playerRank(1000)).toBe(8);   // 100 words at level 4
    expect(playerRank(4200)).toBe(15);  // 100 words at level 7
    expect(playerRank(21000)).toBe(33); // 500 words at level 7
  });
});

describe('peak points', () => {
  it('goes up when current points are higher', () => {
    expect(newPeak(150, 100)).toBe(150);
  });

  it('never goes down when current points drop (e.g. a deck was removed)', () => {
    expect(newPeak(40, 100)).toBe(100);
    expect(newPeak(0, 100)).toBe(100);
  });

  it('stays the same when they are equal', () => {
    expect(newPeak(100, 100)).toBe(100);
  });

  it('never goes down when a Mastered card is put back (34 → 1 point)', () => {
    const before = totalPoints([MASTERED]);
    const after = totalPoints([RESTORED_LEVEL]);
    expect([before, after]).toEqual([34, 1]);
    expect(newPeak(after, newPeak(before, 0))).toBe(34);
  });
});

describe('points needed for a rank', () => {
  it('matches the agreed steps', () => {
    expect(pointsForRank(1)).toBe(0);
    expect(pointsForRank(2)).toBe(20);
    expect(pointsForRank(3)).toBe(80);
    expect(pointsForRank(9)).toBe(1280);
  });

  it('is exactly where playerRank goes up', () => {
    for (let n = 1; n <= 20; n++) {
      expect(playerRank(pointsForRank(n))).toBe(n);
      if (n > 1) expect(playerRank(pointsForRank(n) - 1)).toBe(n - 1);
    }
  });
});
