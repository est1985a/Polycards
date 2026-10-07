// Tests for the SRS rules. Run with: npm test
import { describe, it, expect } from 'vitest';
import { LEVEL_HOURS, MAX_LEVEL, SESSION_SIZE, levelAfterCorrect, levelAfterWrong, nextReviewDate } from './srs';

describe('settings', () => {
  it('has the agreed wait times: new, 4h, 1d, 3d, 1w, 2w, 30d, ~4 months', () => {
    expect(LEVEL_HOURS).toEqual([0, 4, 24, 72, 168, 336, 720, 2880]);
  });

  it('has levels 0 to 7 and 20 cards per session', () => {
    expect(MAX_LEVEL).toBe(7);
    expect(SESSION_SIZE).toBe(20);
  });
});

describe('correct answer', () => {
  it('moves a card up one level', () => {
    expect(levelAfterCorrect(0)).toBe(1);
    expect(levelAfterCorrect(3)).toBe(4);
    expect(levelAfterCorrect(6)).toBe(7);
  });

  it('never goes above level 7', () => {
    expect(levelAfterCorrect(7)).toBe(7);
  });
});

describe('wrong answers (below level 5)', () => {
  it('drops 1 level for the 1st and 2nd miss in a session', () => {
    expect(levelAfterWrong(3, 1)).toBe(2);
    expect(levelAfterWrong(3, 2)).toBe(2);
  });

  it('drops 2 levels for the 3rd and 4th miss', () => {
    expect(levelAfterWrong(4, 3)).toBe(2);
    expect(levelAfterWrong(4, 4)).toBe(2);
  });
});

describe('wrong answers (level 5 and up: penalty doubled)', () => {
  it('drops 2 levels for the 1st and 2nd miss', () => {
    expect(levelAfterWrong(5, 1)).toBe(3);
    expect(levelAfterWrong(6, 2)).toBe(4);
  });

  it('drops 4 levels for the 3rd and 4th miss', () => {
    expect(levelAfterWrong(7, 3)).toBe(3);
    expect(levelAfterWrong(7, 4)).toBe(3);
  });
});

describe('floors', () => {
  it('never drops a learned card below level 1', () => {
    expect(levelAfterWrong(1, 1)).toBe(1);
    expect(levelAfterWrong(2, 10)).toBe(1);
    expect(levelAfterWrong(5, 5)).toBe(1);
  });

  it('keeps a new card (level 0) at level 0', () => {
    expect(levelAfterWrong(0, 1)).toBe(0);
    expect(levelAfterWrong(0, 3)).toBe(0);
  });
});

describe('next review date', () => {
  const now = Date.UTC(2026, 0, 1, 9, 0, 0); // fixed time so the test is repeatable
  const hoursLater = (level) => (nextReviewDate(level, now).getTime() - now) / 3600000;

  it('waits the right number of hours for each level', () => {
    expect(hoursLater(0)).toBe(0);
    expect(hoursLater(1)).toBe(4);
    expect(hoursLater(2)).toBe(24);
    expect(hoursLater(4)).toBe(168);
    expect(hoursLater(7)).toBe(2880); // 120 days
  });
});
