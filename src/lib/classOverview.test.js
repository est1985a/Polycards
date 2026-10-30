// Tests for the class overview helpers (sorting, 最終学習, コピー text). Pure. Run with: npm test
import { describe, it, expect } from 'vitest';
import { overviewRows, sortOverview, nextSort, lastStudiedText, troubleListText, SORT_KEYS, DEFAULT_SORT } from './classOverview';

const row = (id, number, name, extra = {}) => ({
  student_id: id, student_number: number, real_name: name, reviews: 10, study_days: 2, streak: 1,
  player_level: 2, cards: 40, tickets: 1, last_studied_at: '2026-10-29T03:00:00Z', honesty: {}, ...extra,
});
const ROWS = [
  row('c', 3, '鈴木', { reviews: 50, last_studied_at: '2026-10-30T01:00:00Z' }),
  row('a', 1, '佐藤', { reviews: 0, last_studied_at: null }),
  row('n', null, '田中', { reviews: 5 }),
  row('b', 2, '高橋', { reviews: 50 }),
];
const ids = (rows) => rows.map((r) => r.student_id);

describe('sortOverview', () => {
  it('starts in roster order: 出席番号, students without one last', () => {
    expect(ids(sortOverview(ROWS, DEFAULT_SORT))).toEqual(['a', 'b', 'c', 'n']);
    expect(ids(sortOverview(ROWS, { key: 'number', dir: 'desc' }))).toEqual(['c', 'b', 'a', 'n']);
  });

  it('sorts numbers both ways, with ties in roster order', () => {
    expect(ids(sortOverview(ROWS, { key: 'reviews', dir: 'desc' }))).toEqual(['b', 'c', 'n', 'a']);
    expect(ids(sortOverview(ROWS, { key: 'reviews', dir: 'asc' }))).toEqual(['a', 'n', 'b', 'c']);
  });

  it('puts students who never studied last, whichever way', () => {
    expect(ids(sortOverview(ROWS, { key: 'lastStudied', dir: 'desc' }))[3]).toBe('a');
    expect(ids(sortOverview(ROWS, { key: 'lastStudied', dir: 'asc' }))[3]).toBe('a');
    expect(ids(sortOverview(ROWS, { key: 'lastStudied', dir: 'desc' }))[0]).toBe('c');
  });

  it('can sort by every column, and flagged students first', () => {
    for (const key of SORT_KEYS) expect(sortOverview(ROWS, { key, dir: 'asc' })).toHaveLength(4);
    const flagged = overviewRows([row('x', 1, 'A'), row('y', 2, 'B', { honesty: { timed_got_it: 40, fast_got_it: 30 } })]);
    expect(ids(sortOverview(flagged, { key: 'flag', dir: 'desc' }))).toEqual(['y', 'x']);
  });
});

describe('overviewRows', () => {
  it('marks students with no reviews in the period and honesty flags', () => {
    const [a, b] = overviewRows([row('a', 1, 'A', { reviews: 0 }), row('b', 2, 'B', { honesty: { tap_answers: 30, tap_got_it: 30, typed_answers: 30, typed_correct: 3 } })]);
    expect(a).toMatchObject({ unstudied: true, flagged: false });
    expect(b).toMatchObject({ unstudied: false, flagged: true });
  });
});

describe('nextSort', () => {
  it('flips the same column and starts new ones sensibly', () => {
    expect(nextSort(DEFAULT_SORT, 'number')).toEqual({ key: 'number', dir: 'desc' });
    expect(nextSort(DEFAULT_SORT, 'name')).toEqual({ key: 'name', dir: 'asc' });
    expect(nextSort(DEFAULT_SORT, 'reviews')).toEqual({ key: 'reviews', dir: 'desc' });
    expect(nextSort({ key: 'reviews', dir: 'desc' }, 'reviews')).toEqual({ key: 'reviews', dir: 'asc' });
  });
});

describe('lastStudiedText (Japan dates)', () => {
  const now = Date.parse('2026-10-30T12:00:00+09:00');
  it('says 今日 / 昨日 / N日前, then the date', () => {
    expect(lastStudiedText('2026-10-30T00:30:00+09:00', now)).toBe('今日');
    expect(lastStudiedText('2026-10-29T23:59:00+09:00', now)).toBe('昨日');
    // 2026-10-29 16:00 UTC is already the 30th in Japan
    expect(lastStudiedText('2026-10-29T16:00:00Z', now)).toBe('今日');
    expect(lastStudiedText('2026-10-27T10:00:00+09:00', now)).toBe('3日前');
    expect(lastStudiedText('2026-10-24T10:00:00+09:00', now)).toBe('6日前');
    expect(lastStudiedText('2026-10-23T10:00:00+09:00', now)).toBe('10月23日');
    expect(lastStudiedText(null, now)).toBe('—');
  });
});

describe('troubleListText', () => {
  it('makes one english – japanese line per word', () => {
    expect(troubleListText([{ english: 'borrow', japanese: '借りる' }, { english: 'lend', japanese: '貸す' }])).toBe('borrow – 借りる\nlend – 貸す');
    expect(troubleListText([])).toBe('');
  });
});
