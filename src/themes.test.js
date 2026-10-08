// Checks that every theme is complete and readable. Run with: npm test
import { describe, it, expect } from 'vitest';
import { COLOR_ROLES, themes, getTheme, DEFAULT_THEME, applyTheme } from './themes';

// WCAG contrast ratio between two #rrggbb colors (1 to 21; 4.5 is the minimum for normal text).
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const HEX = /^#[0-9a-f]{6}$/i;
const MIN = 4.5;

describe.each(Object.entries(themes))('theme "%s"', (id, theme) => {
  const c = theme.colors;

  it('defines every color role, and nothing else', () => {
    expect(Object.keys(c).sort()).toEqual([...COLOR_ROLES].sort());
    for (const role of COLOR_ROLES) expect(c[role], role).toMatch(HEX);
  });

  it('has a name, a light/dark scheme, and 8 level colors', () => {
    expect(theme.name).toBeTruthy();
    expect(['light', 'dark']).toContain(theme.scheme);
    expect(theme.levels).toHaveLength(8);
    theme.levels.forEach((lv) => expect(lv).toMatch(HEX));
  });

  it('keeps text readable on its backgrounds', () => {
    const pairs = [
      ['text', 'bg'], ['text', 'surface'], ['text', 'surface2'],
      ['muted', 'bg'], ['muted', 'surface'],
      ['gold', 'surface'],
      ['danger', 'surface'],
      ['accentInk', 'accent'],
      ['dangerInk', 'danger'],
    ];
    for (const [fg, bg] of pairs) {
      expect(contrast(c[fg], c[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(MIN);
    }
    theme.levels.forEach((lv, i) => {
      expect(contrast(lv, c.surface), `Lv${i} on surface`).toBeGreaterThanOrEqual(MIN);
    });
  });
});

describe('getTheme', () => {
  it('returns the named theme', () => {
    expect(getTheme('pizza')).toBe(themes.pizza);
  });
  it('falls back to the default for unknown or missing ids', () => {
    expect(getTheme('nope')).toBe(themes[DEFAULT_THEME]);
    expect(getTheme(null)).toBe(themes[DEFAULT_THEME]);
  });
});

describe('applyTheme', () => {
  it('sets a CSS variable for every role and level', () => {
    const set = {};
    const root = { style: { setProperty: (k, v) => { set[k] = v; } } };
    applyTheme(themes.lagoon, root);
    for (const role of COLOR_ROLES) expect(set[`--${role}`]).toBe(themes.lagoon.colors[role]);
    for (let i = 0; i < 8; i++) expect(set[`--lv${i}`]).toBe(themes.lagoon.levels[i]);
    expect(root.style.colorScheme).toBe('light');
  });
});
