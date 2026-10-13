// Tests for the next-review line and the review plan (src/lib/schedule.js). Run with: npm test
// All times are fixed UTC moments, so the results never depend on the clock or the device.
/* global process */ // the device-timezone test sets process.env.TZ
import { describe, it, expect, afterEach } from 'vitest';
import { jstDayBounds, jstHourStart, nextReviewWhen, nextReviewSummary, groupReviewPlan } from './schedule';
import { MASTERED } from './srs';

const t = (iso) => Date.parse(iso);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

// 2026-10-13 18:00 Japan time
const NOW = t('2026-10-13T09:00:00Z');
const row = (iso, level = 3) => ({ next_review_at: iso, level });

describe('Japan-time days and hours', () => {
  it('finds the coming midnight and the end of tomorrow in Japan time', () => {
    expect(jstDayBounds(NOW)).toEqual({ midnight: t('2026-10-13T15:00:00Z'), endOfTomorrow: t('2026-10-14T15:00:00Z') });
  });

  it('uses the Japan date even when it is still the day before in UTC (00:30 Japan time)', () => {
    expect(jstDayBounds(t('2026-10-12T15:30:00Z')).midnight).toBe(t('2026-10-13T15:00:00Z'));
  });

  it('rounds a time down to its clock hour', () => {
    expect(jstHourStart(t('2026-10-13T09:42:10Z'))).toBe(t('2026-10-13T09:00:00Z'));
  });
});

describe('next review wording', () => {
  it('uses minutes under 1 hour, rounded up', () => {
    expect(nextReviewWhen(NOW + 45 * MIN, NOW)).toBe('45分後');
    expect(nextReviewWhen(NOW + 59 * MIN, NOW)).toBe('59分後');
    expect(nextReviewWhen(NOW + 30 * 1000, NOW)).toBe('1分後');
  });

  it('uses hours under 24 hours, rounded up', () => {
    expect(nextReviewWhen(NOW + 59 * MIN + 30 * 1000, NOW)).toBe('1時間後');
    expect(nextReviewWhen(NOW + 2 * HOUR, NOW)).toBe('2時間後');
    expect(nextReviewWhen(NOW + 70 * MIN, NOW)).toBe('2時間後');
    expect(nextReviewWhen(NOW + 23.5 * HOUR, NOW)).toBe('24時間後');
  });

  it('uses the Japan date from 24 hours on', () => {
    expect(nextReviewWhen(NOW + 48 * HOUR, NOW)).toBe('10月15日');
    // 01:00 on Oct 15 in Japan is still Oct 14 in UTC
    expect(nextReviewWhen(t('2026-10-14T16:00:00Z'), NOW)).toBe('10月15日');
  });
});

describe('next review line', () => {
  it('shows when and how many', () => {
    expect(nextReviewSummary({ at: NOW + 2 * HOUR, count: 7 }, NOW).text).toBe('次の復習：2時間後に 7枚');
  });

  it('can be tapped when the review is today or tomorrow', () => {
    expect(nextReviewSummary({ at: NOW + 2 * HOUR, count: 7 }, NOW).tappable).toBe(true);
    expect(nextReviewSummary({ at: t('2026-10-14T14:59:00Z'), count: 1 }, NOW).tappable).toBe(true);
  });

  it('cannot be tapped after tomorrow (the plan would be empty)', () => {
    const line = nextReviewSummary({ at: t('2026-10-20T03:00:00Z'), count: 7 }, NOW);
    expect(line.text).toBe('次の復習：10月20日に 7枚');
    expect(line.tappable).toBe(false);
  });

  it('shows nothing with no cards waiting (no cards, or all Mastered)', () => {
    expect(nextReviewSummary(null, NOW)).toBeNull();
    expect(nextReviewSummary({ at: NOW + HOUR, count: 0 }, NOW)).toBeNull();
  });

  it('shows nothing once the time has passed (the cards are due)', () => {
    expect(nextReviewSummary({ at: NOW - MIN, count: 3 }, NOW)).toBeNull();
  });
});

describe('review plan', () => {
  it('groups cards by Japan-time hour, in order, with totals', () => {
    const plan = groupReviewPlan([
      row('2026-10-13T11:20:00Z'), // 20:20
      row('2026-10-13T09:30:00Z'), // 18:30
      row('2026-10-13T11:05:00Z'), // 20:05
      row('2026-10-14T00:00:00Z'), // tomorrow 09:00
    ], NOW);
    expect(plan.today).toEqual({ hours: [{ label: '18:00', count: 1, runningTotal: 1 }, { label: '20:00', count: 2, runningTotal: 3 }], total: 3 });
    expect(plan.tomorrow).toEqual({ hours: [{ label: '09:00', count: 1, runningTotal: 4 }], total: 1 });
  });

  it('keeps a running total that carries over from today into tomorrow', () => {
    const plan = groupReviewPlan([
      row('2026-10-13T10:00:00Z'), row('2026-10-13T10:10:00Z'), // 19:00 ×2
      row('2026-10-13T13:00:00Z'), // 22:00
      row('2026-10-13T23:00:00Z'), row('2026-10-13T23:30:00Z'), row('2026-10-13T23:45:00Z'), // tomorrow 08:00 ×3
      row('2026-10-14T05:00:00Z'), // tomorrow 14:00
    ], NOW);
    expect(plan.today.hours.map((h) => h.runningTotal)).toEqual([2, 3]);
    expect(plan.tomorrow.hours.map((h) => [h.count, h.runningTotal])).toEqual([[3, 6], [1, 7]]);
    expect(plan.today.total).toBe(3); // section totals stay per day
    expect(plan.tomorrow.total).toBe(4);
  });

  it('starts the running total from zero in tomorrow when today is empty', () => {
    const plan = groupReviewPlan([row('2026-10-14T00:00:00Z'), row('2026-10-14T03:00:00Z')], NOW);
    expect(plan.tomorrow.hours.map((h) => h.runningTotal)).toEqual([1, 2]);
  });

  it('puts 23:59 in today and 00:00 in tomorrow', () => {
    const plan = groupReviewPlan([row('2026-10-13T14:59:00Z'), row('2026-10-13T15:00:00Z')], NOW);
    expect(plan.today.hours).toEqual([{ label: '23:00', count: 1, runningTotal: 1 }]);
    expect(plan.tomorrow.hours).toEqual([{ label: '00:00', count: 1, runningTotal: 2 }]);
  });

  it('leaves out cards after tomorrow and cards already due', () => {
    const plan = groupReviewPlan([row('2026-10-14T15:00:00Z'), row('2026-10-13T08:00:00Z'), row('2026-10-13T09:00:00Z')], NOW);
    expect(plan.today.total + plan.tomorrow.total).toBe(0);
  });

  it('can have an empty today', () => {
    const plan = groupReviewPlan([row('2026-10-14T03:00:00Z')], NOW);
    expect(plan.today).toEqual({ hours: [], total: 0 });
    expect(plan.tomorrow.total).toBe(1);
  });

  it('can have an empty tomorrow', () => {
    const plan = groupReviewPlan([row('2026-10-13T10:00:00Z')], NOW);
    expect(plan.today.total).toBe(1);
    expect(plan.tomorrow).toEqual({ hours: [], total: 0 });
  });

  it('can be empty on both days', () => {
    expect(groupReviewPlan([], NOW)).toEqual({ today: { hours: [], total: 0 }, tomorrow: { hours: [], total: 0 } });
  });

  it('ignores Mastered cards and cards with no review time', () => {
    const plan = groupReviewPlan([
      row(null, MASTERED),
      row('2026-10-13T10:00:00Z', MASTERED),
      row(null, 2),
      row('2026-10-13T10:00:00Z', 2),
    ], NOW);
    expect(plan.today).toEqual({ hours: [{ label: '19:00', count: 1, runningTotal: 1 }], total: 1 });
  });
});

describe('device timezone', () => {
  const saved = process.env.TZ;
  afterEach(() => { process.env.TZ = saved; });

  it('gives the same plan and wording on a device set to another timezone', () => {
    process.env.TZ = 'America/Los_Angeles';
    const plan = groupReviewPlan([row('2026-10-13T14:59:00Z'), row('2026-10-13T15:00:00Z')], NOW);
    expect(plan.today.hours).toEqual([{ label: '23:00', count: 1, runningTotal: 1 }]);
    expect(plan.tomorrow.hours).toEqual([{ label: '00:00', count: 1, runningTotal: 2 }]);
    expect(nextReviewWhen(t('2026-10-14T16:00:00Z'), NOW)).toBe('10月15日');
  });
});
