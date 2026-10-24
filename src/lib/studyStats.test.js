// Tests for the stats page logic (streaks, calendar, daily chart). Pure, never touches the database.
// Run with: npm test
import { describe, it, expect } from 'vitest';
import { currentStreak, bestStreak, daysStudied, lastNDays, calendarWeeks, shade } from './studyStats';
import { jstDateKey } from './schedule';

const rows = (...list) => list.map(([day, reviews]) => ({ day, reviews, spelled_correctly: 0, bonus_points: 0 }));
const weekday = (key) => new Date(`${key}T00:00:00Z`).getUTCDay();

describe('currentStreak', () => {
  it('is 0 with no data', () => {
    expect(currentStreak([], '2026-10-24')).toEqual({ count: 0, todayDone: false });
    expect(currentStreak(null, '2026-10-24')).toEqual({ count: 0, todayDone: false });
  });

  it('counts consecutive study days ending today', () => {
    const days = rows(['2026-10-20', 5], ['2026-10-22', 3], ['2026-10-23', 1], ['2026-10-24', 8]);
    expect(currentStreak(days, '2026-10-24')).toEqual({ count: 3, todayDone: true });
  });

  it('keeps the streak alive when today is not done yet but yesterday was', () => {
    const days = rows(['2026-10-22', 3], ['2026-10-23', 1]);
    expect(currentStreak(days, '2026-10-24')).toEqual({ count: 2, todayDone: false });
  });

  it('is 0 when yesterday was missed', () => {
    const days = rows(['2026-10-20', 5], ['2026-10-21', 5], ['2026-10-22', 5]);
    expect(currentStreak(days, '2026-10-24')).toEqual({ count: 0, todayDone: false });
  });

  it('ignores days with 0 reviews', () => {
    const days = rows(['2026-10-22', 4], ['2026-10-23', 0], ['2026-10-24', 0]);
    expect(currentStreak(days, '2026-10-24')).toEqual({ count: 0, todayDone: false });
  });

  it('runs across month and year boundaries', () => {
    expect(currentStreak(rows(['2026-10-30', 1], ['2026-10-31', 1], ['2026-11-01', 1]), '2026-11-01').count).toBe(3);
    expect(currentStreak(rows(['2026-12-30', 1], ['2026-12-31', 1], ['2027-01-01', 1]), '2027-01-01').count).toBe(3);
    expect(currentStreak(rows(['2028-02-28', 1], ['2028-02-29', 1], ['2028-03-01', 1]), '2028-03-01').count).toBe(3);
  });
});

describe('bestStreak and daysStudied', () => {
  it('are 0 with no data', () => {
    expect(bestStreak([])).toBe(0);
    expect(daysStudied([])).toBe(0);
  });

  it('finds the longest run, with gaps in between', () => {
    const days = rows(
      ['2026-09-01', 2], ['2026-09-02', 2], ['2026-09-03', 2], ['2026-09-04', 2],
      ['2026-09-10', 1], ['2026-09-11', 0], ['2026-09-12', 1], ['2026-09-13', 1],
    );
    expect(bestStreak(days)).toBe(4);
    expect(daysStudied(days)).toBe(7);
  });

  it('counts a run across the end of the year', () => {
    expect(bestStreak(rows(['2026-12-31', 1], ['2027-01-01', 1], ['2027-01-03', 1]))).toBe(2);
  });
});

describe('lastNDays', () => {
  it('fills missing days with 0, oldest first, ending today', () => {
    const list = lastNDays(rows(['2026-10-30', 4], ['2026-11-02', 7]), '2026-11-02', 5);
    expect(list).toEqual([
      { day: '2026-10-29', reviews: 0 },
      { day: '2026-10-30', reviews: 4 },
      { day: '2026-10-31', reviews: 0 },
      { day: '2026-11-01', reviews: 0 },
      { day: '2026-11-02', reviews: 7 },
    ]);
  });

  it('works with no data', () => {
    const list = lastNDays([], '2026-10-24', 14);
    expect(list).toHaveLength(14);
    expect(list.every((d) => d.reviews === 0)).toBe(true);
    expect(list[13].day).toBe('2026-10-24');
  });
});

describe('calendarWeeks', () => {
  it('is 12 weeks of Sunday → Saturday, with this week last', () => {
    const today = '2026-10-21'; // a Wednesday
    const weeks = calendarWeeks([], today);
    expect(weeks).toHaveLength(12);
    weeks.forEach((w) => expect(w).toHaveLength(7));
    expect(weekday(weeks[0][0].day)).toBe(0);
    expect(weekday(weeks[11][6].day)).toBe(6);
    const last = weeks[11];
    expect(last[3]).toMatchObject({ day: today, isToday: true, future: false });
    expect(last.slice(4).every((c) => c.future && c.reviews === 0)).toBe(true);
    expect(last.slice(0, 3).every((c) => !c.future)).toBe(true);
  });

  it('places reviews on the right day, across a month boundary', () => {
    const weeks = calendarWeeks(rows(['2026-09-30', 12], ['2026-10-01', 60]), '2026-10-03');
    const cells = weeks.flat();
    expect(cells.find((c) => c.day === '2026-09-30').reviews).toBe(12);
    expect(cells.find((c) => c.day === '2026-10-01').reviews).toBe(60);
    expect(cells.filter((c) => c.reviews > 0)).toHaveLength(2);
  });

  it('has no future days when today is a Saturday', () => {
    const weeks = calendarWeeks([], '2026-10-24');
    expect(weekday('2026-10-24')).toBe(6);
    expect(weeks.flat().some((c) => c.future)).toBe(false);
  });
});

describe('shade', () => {
  it('steps at 1, 20, 50 and 100 reviews', () => {
    expect([0, 1, 19, 20, 49, 50, 99, 100, 250].map(shade)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('jstDateKey', () => {
  it('uses the Japan date, whatever the device timezone', () => {
    expect(jstDateKey(Date.parse('2026-10-24T14:59:00Z'))).toBe('2026-10-24'); // 23:59 in Japan
    expect(jstDateKey(Date.parse('2026-10-24T15:00:00Z'))).toBe('2026-10-25'); // midnight in Japan
    expect(jstDateKey(Date.parse('2026-12-31T15:30:00Z'))).toBe('2027-01-01');
  });
});
