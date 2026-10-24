// Tests for the stats page logic (streaks, calendar, daily chart). Pure, never touches the database.
// Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  currentStreak, bestStreak, daysStudied, shade,
  monthOf, addMonths, compareMonths, firstStudyMonth, monthRange, monthDays, monthGrid, monthTotals,
} from './studyStats';
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

describe('months', () => {
  it('moves between months across years', () => {
    expect(monthOf('2026-10-24')).toEqual({ year: 2026, month: 10 });
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
    expect(addMonths({ year: 2026, month: 10 }, -14)).toEqual({ year: 2025, month: 8 });
    expect(compareMonths({ year: 2026, month: 9 }, { year: 2026, month: 10 })).toBe(-1);
    expect(compareMonths({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBe(1);
  });

  it('finds the first study month, ignoring days with 0 reviews', () => {
    expect(firstStudyMonth([])).toBeNull();
    expect(firstStudyMonth(rows(['2026-07-31', 0], ['2026-08-03', 2], ['2026-10-01', 5]))).toEqual({ year: 2026, month: 8 });
  });

  it('ranges from the first study month to this month (only this month with no data)', () => {
    expect(monthRange(rows(['2026-08-03', 2]), '2026-10-24')).toEqual({ first: { year: 2026, month: 8 }, last: { year: 2026, month: 10 } });
    expect(monthRange([], '2026-10-24')).toEqual({ first: { year: 2026, month: 10 }, last: { year: 2026, month: 10 } });
  });
});

describe('monthDays', () => {
  it('has every day of the month', () => {
    expect(monthDays([], 2026, 10, '2026-10-24')).toHaveLength(31);
    expect(monthDays([], 2026, 11, '2026-10-24')).toHaveLength(30);
    expect(monthDays([], 2026, 2, '2026-10-24')).toHaveLength(28);
    expect(monthDays([], 2028, 2, '2028-03-01').at(-1).day).toBe('2028-02-29');
  });

  it('puts reviews on the right day, and marks today and future days', () => {
    const data = rows(['2026-10-01', 60], ['2026-10-22', 12], ['2026-09-30', 9]);
    const list = monthDays(data, 2026, 10, '2026-10-24');
    expect(list[0]).toEqual({ day: '2026-10-01', date: 1, reviews: 60, future: false, isToday: false });
    expect(list[21].reviews).toBe(12);
    expect(list[23]).toMatchObject({ date: 24, isToday: true, future: false });
    expect(list.slice(24).every((d) => d.future && d.reviews === 0)).toBe(true);
    expect(monthTotals(data, 2026, 10, '2026-10-24')).toEqual({ studied: 2, reviews: 72 });
  });

  it('a past month has no future days', () => {
    expect(monthDays([], 2026, 9, '2026-10-24').some((d) => d.future || d.isToday)).toBe(false);
  });
});

describe('monthGrid', () => {
  const shape = (weeks) => weeks.map((w) => w.map((c) => (c ? c.date : 0)));

  it('a month starting on a Sunday (February 2026) fills exactly 4 weeks', () => {
    const weeks = monthGrid([], 2026, 2, '2026-10-24');
    expect(weekday('2026-02-01')).toBe(0);
    expect(weeks).toHaveLength(4);
    expect(shape(weeks)[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks.flat().every(Boolean)).toBe(true);
  });

  it('a month starting on a Saturday (August 2026) needs 6 weeks', () => {
    const weeks = monthGrid([], 2026, 8, '2026-10-24');
    expect(weekday('2026-08-01')).toBe(6);
    expect(weeks).toHaveLength(6);
    expect(shape(weeks)[0]).toEqual([0, 0, 0, 0, 0, 0, 1]);
    expect(shape(weeks)[5]).toEqual([30, 31, 0, 0, 0, 0, 0]);
  });

  it('February 2028 (leap year) has 29 days', () => {
    const weeks = monthGrid([], 2028, 2, '2028-03-01');
    expect(weekday('2028-02-01')).toBe(2);
    expect(weeks.flat().filter(Boolean)).toHaveLength(29);
    expect(shape(weeks)[0]).toEqual([0, 0, 1, 2, 3, 4, 5]);
    expect(weeks).toHaveLength(5);
  });

  it("today's month has today and future days; every week has 7 cells", () => {
    const weeks = monthGrid(rows(['2026-10-22', 12]), 2026, 10, '2026-10-21');
    weeks.forEach((w) => expect(w).toHaveLength(7));
    const cells = weeks.flat().filter(Boolean);
    expect(cells.find((c) => c.isToday).day).toBe('2026-10-21');
    expect(cells.filter((c) => c.future)).toHaveLength(10);
    expect(cells.find((c) => c.day === '2026-10-22').reviews).toBe(0); // future days show no reviews
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
