// Checks that every theme is complete and readable. Run with: npm test
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { COLOR_ROLES, themes, getTheme, DEFAULT_THEME, applyTheme } from './themes';
import { colors } from './styles/theme';

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
const MIN_LARGE = 3; // WCAG minimum for large text (24 px, or about 19 px bold)

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
      ['accentText', 'surface'],
      ['gold', 'surface2'],  // level chip on the back of a study card
      ['muted', 'surface2'], // question word on the back of a study card
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

  it('keeps large text readable (3:1 is enough for big bold text)', () => {
    // the 32 px bold answer on the back of a study card
    expect(contrast(c.accentText, c.surface2), 'accentText on surface2').toBeGreaterThanOrEqual(MIN_LARGE);
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

describe('src/styles/theme.js', () => {
  it('only points to color roles that themes define', () => {
    for (const [key, value] of Object.entries(colors)) {
      if (key === 'level') continue;
      expect(COLOR_ROLES, key).toContain(key);
      expect(value).toBe(`var(--${key})`);
    }
    expect(colors.level(3)).toBe('var(--lv3)');
  });
});

describe('screens', () => {
  // Colors must come from src/styles/theme.js so every theme can change them.
  const dir = new URL('./components/', import.meta.url);
  const files = [
    ['App.jsx', new URL('./App.jsx', import.meta.url)],
    ...readdirSync(dir).filter((f) => f.endsWith('.jsx') && !f.includes('.test.')).map((f) => [f, new URL(f, dir)]),
  ];
  const hardCoded = [
    /#[0-9a-f]{3,8}\b/i,
    /\b(rgba?|hsla?)\(/,
    /["'`](white|black|red|blue|green|navy|gray|grey|yellow|orange|purple|pink)["'`]/,
  ];

  it.each(files)('%s has no hard-coded colors', (_, url) => {
    const source = readFileSync(url, 'utf8');
    for (const pattern of hardCoded) expect(source).not.toMatch(pattern);
  });
});
