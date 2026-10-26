// Tests for the pack opening helpers. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  packWords, packSummary, packShown, packFit, cardFontSize, closeTooSoon, fanLayout, reached,
  PACK_SHOWN, PACK_STEPS, PACK_STEP_ORDER, PACK_NARROW_BELOW, PACK_CLOSE_GUARD_MS,
} from './packOpening';
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
});

describe('packShown', () => {
  const big = packWords(buildCards(words(20)));

  it(`shows at most ${PACK_SHOWN} cards and counts the rest`, () => {
    const { shown, hiddenCount } = packShown(big);
    expect(shown).toHaveLength(PACK_SHOWN);
    expect(hiddenCount).toBe(20 - PACK_SHOWN);
    expect(packShown(big.slice(0, 5)).hiddenCount).toBe(0);
  });

  it('shows fewer on a narrow screen', () => {
    const { shown, hiddenCount } = packShown(big, packFit(375).shownMax);
    expect(shown).toHaveLength(10);
    expect(hiddenCount).toBe(10);
  });
});

describe('packFit', () => {
  it('uses 6 per row on wide screens and 5 smaller cards per row on narrow ones', () => {
    expect(packFit(1180)).toMatchObject({ perRow: 6, shownMax: 12 });
    expect(packFit(PACK_NARROW_BELOW)).toMatchObject({ perRow: 6 });
    const narrow = packFit(PACK_NARROW_BELOW - 1);
    expect(narrow).toMatchObject({ perRow: 5, shownMax: 10 });
    expect(narrow.card.width).toBeLessThan(packFit(1180).card.width);
  });

  it('fits the fan inside a 320 px phone (16 px padding each side)', () => {
    for (const width of [320, 375, 390]) {
      const fit = packFit(width);
      const fan = fanLayout(fit.shownMax, fit);
      const half = Math.max(...fan.map((p) => Math.abs(p.x))) + fit.card.width / 2 + 10; // + room for the tilt
      expect(half * 2).toBeLessThanOrEqual(width - 32);
    }
  });
});

describe('cardFontSize', () => {
  it('keeps short words at the normal size', () => {
    expect(cardFontSize('ever', 54)).toBe(12);
    expect(cardFontSize('have been to', 54)).toBe(12);
  });

  it('shrinks for a long word instead of breaking it', () => {
    const size = cardFontSize('basketball', 54);
    expect(size).toBeLessThan(12);
    expect(10 * 0.6 * size).toBeLessThanOrEqual(54);
    expect(cardFontSize('basketball', 46)).toBeLessThan(size);
  });

  it('goes by the longest word of a phrase, never below the minimum', () => {
    expect(cardFontSize('table tennis', 54)).toBe(cardFontSize('tennis', 54));
    expect(cardFontSize('internationalization', 46)).toBe(7);
    expect(cardFontSize('', 54)).toBe(12);
  });
});

describe('closeTooSoon', () => {
  it('ignores a tap on OK right after the summary appears', () => {
    expect(closeTooSoon(1000, 1000)).toBe(true);
    expect(closeTooSoon(1000, 1000 + PACK_CLOSE_GUARD_MS - 1)).toBe(true);
  });

  it('accepts it after the short wait', () => {
    expect(closeTooSoon(1000, 1000 + PACK_CLOSE_GUARD_MS)).toBe(false);
  });
});

describe('fanLayout', () => {
  it('gives one position per card', () => {
    for (const n of [0, 1, 5, 6, 7, 12]) expect(fanLayout(n)).toHaveLength(n);
    expect(fanLayout(10, { perRow: 5 })).toHaveLength(10);
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

  it('uses two rows for more than 5 cards when perRow is 5', () => {
    expect(new Set(fanLayout(6, { perRow: 5 }).map((p) => Math.sign(p.y))).size).toBe(2);
    expect(new Set(fanLayout(5, { perRow: 5 }).map((p) => p.y < 0)).has(true)).toBe(false);
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
