// Tests for the gacha helpers. Run with: npm test
import { describe, it, expect, vi } from 'vitest';
import { ticketProgress, spellingProgress, groupCollection, collectionRows, collectionTotals, rarityCounts, tileState, singleFlight, sparkleLayout, obtainedDate, specialTier, specialColor, RARITY_ORDER, eventSeries, eventActive, eventEndDate, eventShare, seriesTitle } from './gacha';
import { setLang } from '../i18n';
import { metalColors } from '../styles/theme';

describe('ticketProgress', () => {
  it('measures progress to the next ticket from the status', () => {
    expect(ticketProgress({ reviews_to_next_ticket: 25, reviews_per_ticket: 100 })).toEqual({ toNext: 25, per: 100, fraction: 0.75 });
    expect(ticketProgress({ reviews_to_next_ticket: 100, reviews_per_ticket: 100 }).fraction).toBe(0);
  });
});

describe('spellingProgress', () => {
  it('measures progress to the next spelling ticket from the status', () => {
    expect(spellingProgress({ spelling_to_next_ticket: 30, spelling_points_per_ticket: 150 })).toEqual({ toNext: 30, per: 150, fraction: 0.8 });
    expect(spellingProgress({ spelling_to_next_ticket: 150, spelling_points_per_ticket: 150 }).fraction).toBe(0);
  });

  it('falls back to 150 points per ticket when the status has no spelling fields', () => {
    expect(spellingProgress({})).toEqual({ toNext: 150, per: 150, fraction: 0 });
    expect(spellingProgress(null)).toEqual({ toNext: 150, per: 150, fraction: 0 });
  });
});

const rows = [
  { id: 1, series: 'Series 1', rarity: 'normal', owned: true, equipped: true },
  { id: 2, series: 'Series 1', rarity: 'normal', owned: false },
  { id: 3, series: 'Series 1', rarity: 'rare', owned: true },
  { id: 4, series: 'Series 1', rarity: 'secret', owned: false },
  { id: 5, series: 'Series 1', rarity: 'secret', owned: true },
  { id: 6, series: 'Series 2', rarity: 'super_rare', owned: false },
];

describe('collection', () => {
  it('groups avatars by series, then by rarity', () => {
    const groups = groupCollection(rows);
    expect(groups.map((s) => s.series)).toEqual(['Series 1', 'Series 2']);
    expect(groups[0].groups.map((g) => g.rarity)).toEqual(['normal', 'rare', 'secret']);
    expect(groups[0].groups[0].avatars.map((a) => a.id)).toEqual([1, 2]);
  });

  it('counts owned / total per rarity, hiding the Secret total', () => {
    expect(rarityCounts(rows)).toEqual([
      { rarity: 'normal', owned: 1, total: 2 },
      { rarity: 'rare', owned: 1, total: 1 },
      { rarity: 'super_rare', owned: 0, total: 1 },
      { rarity: 'secret', owned: 1, total: null },
    ]);
  });

  it('missing Secrets: one locked row per series, placed after the owned Secrets, not counted', () => {
    const more = [...rows, { id: 7, series: 'Series 1', rarity: 'secret', owned: false }];
    const shown = collectionRows(more);
    expect(shown.filter((r) => r.rarity === 'secret' && !r.owned)).toHaveLength(1);
    expect(shown.at(-1)).toMatchObject({ id: null, rarity: 'secret', series: 'Series 1', owned: false, equipped: false, sort_order: null });
    const groups = groupCollection(more);
    expect(groups[0].groups.at(-1).avatars.map((a) => a.id)).toEqual([5, null]);
    expect(groups[0]).toMatchObject({ owned: 3, total: 4 });
    expect(collectionTotals(more)).toEqual({ owned: 3, total: 5 });
    // Every Secret owned: no locked row
    const all = collectionRows(rows.map((r) => (r.rarity === 'secret' ? { ...r, owned: true } : r)));
    expect(all.some((r) => r.id === null)).toBe(false);
  });

  it('picks the tile look: owned, silhouette, or locked secret', () => {
    expect(tileState(rows[0])).toBe('owned');
    expect(tileState(rows[1])).toBe('silhouette');
    expect(tileState(rows[3])).toBe('secret');
    expect(tileState(rows[4])).toBe('owned'); // an owned Secret shows normally
  });
});

describe('Special Polyavatars', () => {
  const special = [
    { id: 10, series: 'Special', rarity: 'special', owned: true, slug: 'special-bronze', unlock_rank: 80 },
    { id: 11, series: 'Special', rarity: 'special', owned: false, slug: null, unlock_rank: 90 },
  ];

  it('come last in the rarity order and get their own group', () => {
    expect(RARITY_ORDER[RARITY_ORDER.length - 1]).toBe('special');
    const groups = groupCollection([...rows, ...special]);
    expect(groups.map((s) => s.series)).toEqual(['Series 1', 'Series 2', 'Special']);
    expect(groups[2].groups.map((g) => g.rarity)).toEqual(['special']);
  });

  it('are counted (with their total) only when the collection has them', () => {
    expect(rarityCounts(rows).map((r) => r.rarity)).not.toContain('special');
    expect(rarityCounts([...rows, ...special]).at(-1)).toEqual({ rarity: 'special', owned: 1, total: 2 });
  });

  it('show a locked Special as its own tile state', () => {
    expect(tileState(special[0])).toBe('owned');
    expect(tileState(special[1])).toBe('special');
  });

  it('find the tier from the slug, else from the unlock rank', () => {
    expect(specialTier(special[0])).toBe('bronze');
    expect(specialTier(special[1])).toBe('silver');
    expect(specialTier({ rarity: 'special', unlock_rank: 120 })).toBe('diamond');
    expect(specialTier({ rarity: 'rare', slug: 'special-gold' })).toBeNull();
    expect(specialColor({ rarity: 'special', slug: 'special-platinum' })).toBe(metalColors.platinum);
    expect(specialColor({ rarity: 'normal' })).toBeNull();
  });

  it('get no app sparkles (their art has its own)', () => {
    expect(sparkleLayout('special')).toEqual([]);
  });
});

describe('singleFlight (double tap on ガチャを回す)', () => {
  it('pulls only once when tapped twice quickly', async () => {
    let finish;
    const pull = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    const tap = singleFlight(pull);
    const first = tap();
    const second = tap();
    await Promise.resolve();
    expect(pull).toHaveBeenCalledTimes(1);
    finish();
    await Promise.all([first, second]);
    expect(pull).toHaveBeenCalledTimes(1);
  });

  it('allows the next pull once the first one has finished', async () => {
    const pull = vi.fn(async () => {});
    const tap = singleFlight(pull);
    await tap();
    await tap();
    expect(pull).toHaveBeenCalledTimes(2);
  });

  it('allows another pull after a failed one', async () => {
    const pull = vi.fn().mockRejectedValueOnce(new Error('no_tickets')).mockResolvedValueOnce();
    const tap = singleFlight(pull);
    await expect(tap()).rejects.toThrow('no_tickets');
    await tap();
    expect(pull).toHaveBeenCalledTimes(2);
  });
});

describe('sparkleLayout', () => {
  it('gives 0 / 3 / 5 / 6 sparkles by rarity', () => {
    expect(sparkleLayout('normal')).toHaveLength(0);
    expect(sparkleLayout('rare')).toHaveLength(3);
    expect(sparkleLayout('super_rare')).toHaveLength(5);
    expect(sparkleLayout('secret')).toHaveLength(6);
  });

  it('uses the approved positions and gives none for an unknown rarity', () => {
    expect(sparkleLayout('rare')[0]).toEqual([8, 14, 0.16, 0]);
    expect(sparkleLayout('secret')[5]).toEqual([70, 98, 0.14, 1.0]);
    expect(sparkleLayout('mystery')).toEqual([]);
    expect(sparkleLayout(undefined)).toEqual([]);
  });
});

describe('obtainedDate (入手日, Japan time)', () => {
  it('turns a UTC time into the Japan date', () => {
    expect(obtainedDate('2026-10-27T03:00:00+00:00')).toEqual({ year: 2026, month: 10, day: 27 });
    // 15:30 UTC on the 26th is already 00:30 on the 27th in Japan.
    expect(obtainedDate('2026-10-26T15:30:00Z')).toEqual({ year: 2026, month: 10, day: 27 });
    expect(obtainedDate('2026-12-31T14:59:59Z')).toEqual({ year: 2026, month: 12, day: 31 });
    expect(obtainedDate('2026-12-31T15:00:00Z')).toEqual({ year: 2027, month: 1, day: 1 });
  });

  it('is null when there is no real time', () => {
    expect(obtainedDate(null)).toBeNull();
    expect(obtainedDate(undefined)).toBeNull();
    expect(obtainedDate('not a date')).toBeNull();
  });
});

describe('Halloween 2026 event', () => {
  const halloween = [
    { id: 20, series: 'Halloween 2026', rarity: 'normal', owned: true },
    { id: 21, series: 'Halloween 2026', rarity: 'rare', owned: false },
    { id: 22, series: 'Halloween 2026', rarity: 'super_rare', owned: false },
    { id: 23, series: 'Halloween 2026', rarity: 'normal', owned: false },
  ];
  const special = [{ id: 10, series: 'Special', rarity: 'special', owned: false, unlock_rank: 80 }];
  const ends = '2026-11-08T14:59:59+00:00'; // 2026-11-08 23:59:59 Japan time

  it('is its own section after the ordinary series and before Special, ★ first like the other series', () => {
    // The database sorts series by name, so Halloween comes first there.
    const groups = groupCollection([...halloween, ...rows, ...special]);
    expect(groups.map((s) => s.series)).toEqual(['Series 1', 'Series 2', 'Halloween 2026', 'Special']);
    expect(groups[2].groups.map((g) => g.rarity)).toEqual(['normal', 'rare', 'super_rare']);
    expect(groups[2].groups[0].avatars.map((a) => a.id)).toEqual([20, 23]);
    expect(groups[2]).toMatchObject({ owned: 1, total: 4 });
    expect(groups[0].groups.map((g) => g.rarity)).toEqual(['normal', 'rare', 'secret']);
  });

  it('knows which avatars belong to an event', () => {
    expect(eventSeries(halloween[0])).toEqual({ key: 'halloween2026', mark: '2026' });
    expect(eventSeries('Halloween 2026')?.key).toBe('halloween2026');
    expect(eventSeries(rows[0])).toBeNull();
    expect(eventSeries(null)).toBeNull();
  });

  it('translates the section headings', () => {
    setLang('ja');
    expect(seriesTitle('Halloween 2026')).toBe('ハロウィン 2026');
    expect(seriesTitle('Special')).toBe('スペシャル');
    expect(seriesTitle('Series 1')).toBe('Series 1');
    setLang('en');
    expect(seriesTitle('Halloween 2026')).toBe('Halloween 2026');
    setLang('ja');
  });

  it('is on only while the database says so and the end time has not passed', () => {
    const status = { event: { active: true, ends_at: ends, share: 50 } };
    expect(eventActive(status, Date.parse('2026-11-08T14:00:00Z'))).toBe(true);
    expect(eventActive(status, Date.parse('2026-11-08T15:00:00Z'))).toBe(false);
    expect(eventActive({ event: { ...status.event, active: false } }, Date.parse('2026-11-02T00:00:00Z'))).toBe(false);
    expect(eventActive({})).toBe(false);
    expect(eventActive(null)).toBe(false);
  });

  it('gives the last day in Japan time and the Halloween share', () => {
    expect(eventEndDate({ event: { ends_at: ends } })).toEqual({ month: 11, day: 8 });
    expect(eventEndDate({})).toBeNull();
    expect(eventShare({ event: { share: 50 } })).toBe(50);
    expect(eventShare({ event: { share: 0 } })).toBe(0);
    expect(eventShare({})).toBe(0);
  });
});
