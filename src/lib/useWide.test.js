// Tests for the wide-screen switch. Run with: npm test
import { describe, it, expect } from 'vitest';
import { isWide, WIDE_QUERY } from './useWide';

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
