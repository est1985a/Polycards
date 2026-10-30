// Tests for the SRS rules. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  LEVEL_HOURS, MAX_LEVEL, MASTERED, DEFAULT_SESSION_SIZE, SESSION_SIZES, RESTORED_LEVEL, isMastered,
  levelAfterCorrect, levelAfterWrong, nextReviewDate, restoreUpdate, levelUpLabel, answerTiming,
} from './srs';

describe('settings', () => {
  it('has the agreed wait times: new, 4h, 1d, 3d, 1w, 2w, 30d, ~4 months', () => {
    expect(LEVEL_HOURS).toEqual([0, 4, 24, 72, 168, 336, 720, 2880]);
  });

  it('has levels 0 to 7 and 20 cards per session', () => {
    expect(MAX_LEVEL).toBe(7);
    expect(DEFAULT_SESSION_SIZE).toBe(20);
    expect(SESSION_SIZES).toEqual([10, 20, 30]);
  });
});

describe('correct answer', () => {
  it('moves a card up one level', () => {
    expect(levelAfterCorrect(0)).toBe(1);
    expect(levelAfterCorrect(3)).toBe(4);
    expect(levelAfterCorrect(6)).toBe(7);
  });

  it('makes a level 7 card Mastered (level 8), and never goes higher', () => {
    expect(MASTERED).toBe(8);
    expect(levelAfterCorrect(7)).toBe(MASTERED);
    expect(isMastered(levelAfterCorrect(7))).toBe(true);
    expect(levelAfterCorrect(MASTERED)).toBe(MASTERED);
  });

  it('only counts level 8 as Mastered', () => {
    expect(isMastered(7)).toBe(false);
    expect(isMastered(0)).toBe(false);
    expect(isMastered(8)).toBe(true);
  });
});

describe('a miss at level 7 works as before (not Mastered)', () => {
  it('drops 2 levels for the 1st and 2nd miss, 4 for the 3rd and 4th', () => {
    expect(levelAfterWrong(7, 1)).toBe(5);
    expect(levelAfterWrong(7, 2)).toBe(5);
    expect(levelAfterWrong(7, 3)).toBe(3);
  });

  it('shows no float on a miss at level 7', () => {
    expect(levelUpLabel(7, false)).toBeNull();
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

  it('never schedules a Mastered card', () => {
    expect(nextReviewDate(MASTERED, now)).toBeNull();
  });
});

describe('putting a Mastered card back (restoreUpdate)', () => {
  const now = Date.UTC(2026, 0, 1, 9, 0, 0);

  it('returns it to level 1, due right now, no longer Mastered', () => {
    expect(RESTORED_LEVEL).toBe(1);
    expect(restoreUpdate(now)).toEqual({ level: 1, next_review_at: new Date(now).toISOString(), mastered_at: null });
  });

  it('is due straight away (next review is not later than now)', () => {
    expect(new Date(restoreUpdate(now).next_review_at).getTime()).toBeLessThanOrEqual(now);
  });
});

describe('levelUpLabel (level-up float)', () => {
  it('shows the new level after a clean correct answer', () => {
    expect(levelUpLabel(0, true)).toBe('Lv 1!');
    expect(levelUpLabel(3, true)).toBe('Lv 4!');
    expect(levelUpLabel(6, true)).toBe('Lv 7!');
  });

  it('shows Mastered! (not MAX) when a level 7 card is answered correctly', () => {
    expect(levelUpLabel(MAX_LEVEL, true)).toBe('Mastered!');
  });

  it('shows nothing when a level 7 card missed earlier this session is answered correctly', () => {
    expect(levelUpLabel(7, true, 1)).toBeNull();
  });

  it('shows nothing on a miss', () => {
    expect(levelUpLabel(3, false)).toBeNull();
    expect(levelUpLabel(3, false, 2)).toBeNull();
  });

  it('shows nothing when a card missed earlier this session is answered correctly (it does not move up)', () => {
    expect(levelUpLabel(3, true, 1)).toBeNull();
  });
});

describe('answerTiming (times for the teachers\' honesty hint)', () => {
  it('measures from when the card appeared, in whole ms', () => {
    expect(answerTiming({ shownAt: 1000, revealAt: 1640.4 }, 2900.6)).toEqual({ revealMs: 640, answerMs: 1901 });
  });
  it('leaves out what was not timed', () => {
    expect(answerTiming({ shownAt: 1000, revealAt: null }, 2500)).toEqual({ revealMs: null, answerMs: 1500 });
    expect(answerTiming({ shownAt: null, revealAt: null }, 2500)).toEqual({ revealMs: null, answerMs: null });
    expect(answerTiming(null, 2500)).toEqual({ revealMs: null, answerMs: null });
  });
  it('never gives a negative time', () => {
    expect(answerTiming({ shownAt: 5000, revealAt: 4000 }, 4500)).toEqual({ revealMs: 0, answerMs: 0 });
  });
});
