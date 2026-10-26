// Tests for the wide-screen switch. Run with: npm test
import { describe, it, expect } from 'vitest';
import { isWide, matches, WIDE_QUERY, SIDE_CHIP_QUERY, SHORT_QUERY } from './useWide';

// A pretend browser window whose screen is (or isn't) wide.
const fakeWindow = (matches) => {
  const asked = [];
  return { asked, matchMedia: (q) => { asked.push(q); return { matches }; } };
};

describe('isWide', () => {
  it('is false with no window or no matchMedia (tests, server)', () => {
    expect(isWide(undefined)).toBe(false);
    expect(isWide({})).toBe(false);
  });

  it('follows the screen width check', () => {
    expect(isWide(fakeWindow(true))).toBe(true);
    expect(isWide(fakeWindow(false))).toBe(false);
  });

  it('switches at 900 px', () => {
    const win = fakeWindow(true);
    isWide(win);
    expect(win.asked).toEqual(['(min-width: 900px)']);
    expect(WIDE_QUERY).toBe('(min-width: 900px)');
  });
});

describe('side chip breakpoint', () => {
  it('leaves room for a 150 px chip, a gap and an edge on both sides of the 780 px study column', () => {
    expect(780 + 2 * (150 + 16 + 16)).toBeLessThanOrEqual(1150);
    expect(SIDE_CHIP_QUERY).toBe('(min-width: 1150px)');
  });

  it('asks the browser with that query', () => {
    const win = fakeWindow(true);
    expect(matches(SIDE_CHIP_QUERY, win)).toBe(true);
    expect(win.asked).toEqual(['(min-width: 1150px)']);
    expect(matches(SIDE_CHIP_QUERY, {})).toBe(false);
  });
});

describe('short screen query', () => {
  it('covers landscape iPads with the browser bars showing (650–800 px tall) but not a portrait iPad', () => {
    expect(SHORT_QUERY).toBe('(max-height: 820px)');
    const win = fakeWindow(true);
    expect(matches(SHORT_QUERY, win)).toBe(true);
    expect(win.asked).toEqual(['(max-height: 820px)']);
  });
});
