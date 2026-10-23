// ja.js and en.js must match: the same keys, and English may only use placeholders that the
// Japanese entry has. Run with: npm test
import { describe, it, expect } from 'vitest';
import ja from './ja';
import en from './en';

const placeholders = (text) => new Set(text.match(/\{\w+\}/g) || []);

describe('ja.js and en.js', () => {
  it('have exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ja).sort());
  });

  it('English text uses only placeholders that the Japanese entry has', () => {
    for (const [key, text] of Object.entries(en)) {
      if (typeof text !== 'string' || text === '') continue;
      const allowed = placeholders(ja[key]);
      for (const p of placeholders(text)) expect(allowed.has(p), `${key} uses ${p}`).toBe(true);
    }
  });

  it('English plural functions return text that still has {n} (the date is plain text)', () => {
    for (const [key, entry] of Object.entries(en)) {
      if (typeof entry !== 'function') continue;
      for (const n of [1, 3]) {
        const text = entry({ n, count: n, month: 10, day: 24 });
        expect(typeof text, key).toBe('string');
        expect(text.length, key).toBeGreaterThan(0);
        if (key !== 'time.monthDay') expect(text, `${key} (${n})`).toContain('{n}');
        const allowed = placeholders(ja[key]);
        for (const p of placeholders(text)) expect(allowed.has(p), `${key} uses ${p}`).toBe(true);
      }
    }
  });

  it('the language switch looks the same in both languages', () => {
    for (const key of ['settings.language', 'settings.languageJa', 'settings.languageEn']) {
      expect(en[key], key).toBe(ja[key]);
    }
  });
});
