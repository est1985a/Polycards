// Tests for the gacha helpers. Run with: npm test
import { describe, it, expect, vi } from 'vitest';
import { ticketProgress, groupCollection, rarityCounts, tileState, singleFlight, sparkleLayout } from './gacha';

describe('ticketProgress', () => {
  it('measures progress to the next ticket from the status', () => {
    expect(ticketProgress({ reviews_to_next_ticket: 25, reviews_per_ticket: 100 })).toEqual({ toNext: 25, per: 100, fraction: 0.75 });
    expect(ticketProgress({ reviews_to_next_ticket: 100, reviews_per_ticket: 100 }).fraction).toBe(0);
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
