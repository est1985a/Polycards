// Tests for the gacha helpers. Run with: npm test
import { describe, it, expect, vi } from 'vitest';
import { ticketProgress, spellingProgress, groupCollection, rarityCounts, tileState, singleFlight, sparkleLayout, obtainedDate, specialTier, specialColor, RARITY_ORDER } from './gacha';
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

  it('sparkle like the other high rarities', () => {
    expect(sparkleLayout('special').length).toBeGreaterThan(0);
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
