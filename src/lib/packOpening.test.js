// Tests for the pack opening helpers. Run with: npm test
import { describe, it, expect } from 'vitest';
import { packWords, packSummary, fanLayout, reached, PACK_SHOWN, PACK_STEPS, PACK_STEP_ORDER } from './packOpening';
import { buildCards } from './drill';

const words = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, english: `word${i}`, japanese: `ご${i}` }));

describe('packWords', () => {
  it('gives each word once, in deck order, with its English', () => {
    expect(packWords(buildCards(words(3)))).toEqual([
      { id: 'w0', en: 'word0' }, { id: 'w1', en: 'word1' }, { id: 'w2', en: 'word2' },
    ]);
  });

  it('takes the English from a Japanese to English card too', () => {
    const cards = buildCards(words(1)).filter((c) => c.direction === 'jp2en');
    expect(packWords(cards)).toEqual([{ id: 'w0', en: 'word0' }]);
  });

  it('copes with no cards', () => {
    expect(packWords(undefined)).toEqual([]);
  });
});

describe('packSummary', () => {
  const list = packWords(buildCards(words(5)));

  it('counts new and owned words', () => {
    const s = packSummary(list, ['w1', 'w3', 'not-in-deck']);
    expect(s.newCount).toBe(3);
    expect(s.ownedCount).toBe(2);
    expect(s.allOwned).toBe(false);
    expect(s.known).toBe(true);
    expect(s.items.filter((w) => w.owned).map((w) => w.id)).toEqual(['w1', 'w3']);
  });

  it('knows when every word is already owned', () => {
    const s = packSummary(list, list.map((w) => w.id));
    expect(s.newCount).toBe(0);
    expect(s.allOwned).toBe(true);
  });

  it('marks nothing owned when the check failed', () => {
    const s = packSummary(list, null);
    expect(s.known).toBe(false);
    expect(s.ownedCount).toBe(0);
    expect(s.allOwned).toBe(false);
  });

  it(`shows at most ${PACK_SHOWN} cards and counts the rest`, () => {
    const big = packWords(buildCards(words(20)));
    const s = packSummary(big, []);
    expect(s.shown).toHaveLength(PACK_SHOWN);
    expect(s.hiddenCount).toBe(20 - PACK_SHOWN);
    expect(packSummary(list, []).hiddenCount).toBe(0);
  });
});

describe('fanLayout', () => {
  it('gives one position per card', () => {
    for (const n of [0, 1, 5, 6, 7, 12]) expect(fanLayout(n)).toHaveLength(n);
  });

  it('puts a single card in the middle, flat', () => {
    expect(fanLayout(1)).toEqual([{ x: 0, y: 0, rotate: 0 }]);
  });

  it('is symmetric left to right', () => {
    const fan = fanLayout(5);
    expect(fan[0].x).toBe(-fan[4].x);
    expect(fan[0].rotate).toBe(-fan[4].rotate);
    expect(fan[2]).toEqual({ x: 0, y: 0, rotate: 0 });
  });

  it('uses two rows for more than 6 cards', () => {
    const ys = new Set(fanLayout(12).map((p) => Math.sign(p.y)));
    expect(ys.has(-1) && ys.has(1)).toBe(true);
    expect(new Set(fanLayout(6).map((p) => p.y < 0)).has(true)).toBe(false);
  });
});

describe('steps', () => {
  it('run in order and end with the summary', () => {
    const times = PACK_STEP_ORDER.map((s) => PACK_STEPS[s]);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(PACK_STEP_ORDER.at(-1)).toBe('done');
    expect(PACK_STEPS.done).toBeLessThanOrEqual(3000);
  });

  it('reached() follows the order', () => {
    expect(reached('fan', 'tear')).toBe(true);
    expect(reached('fan', 'fan')).toBe(true);
    expect(reached('tear', 'fly')).toBe(false);
  });
});
