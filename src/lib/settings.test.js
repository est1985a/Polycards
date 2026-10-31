// Tests for the settings saved on the device. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadSessionSize, saveSessionSize, loadReduceMotion, saveReduceMotion,
  loadThemeCache, saveThemeCache, clearThemeCache,
  applyReduceMotion, reduceMotionOn, devThemeOverride, loadLang, saveLang, applyLang,
  loadAutoPlay, saveAutoPlay, loadSlowSpeech, saveSlowSpeech,
} from './settings';
import { getLang, setLang } from '../i18n';

const memory = () => {
  const data = {};
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
};
const blocked = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
  removeItem: () => { throw new Error('blocked'); },
};

describe('1回の枚数 (polycards.sessionSize)', () => {
  it('is 20 until the student chooses, then remembers 10, 20 or 30', () => {
    const storage = memory();
    expect(loadSessionSize(storage)).toBe(20);
    for (const n of [10, 30, 20]) {
      saveSessionSize(storage, n);
      expect(storage.getItem('polycards.sessionSize')).toBe(String(n));
      expect(loadSessionSize(storage)).toBe(n);
    }
  });

  it('falls back to 20 for unknown or broken values', () => {
    const storage = memory();
    for (const bad of ['15', '0', '-10', 'abc', '', '20.5', '{"n":10}']) {
      storage.setItem('polycards.sessionSize', bad);
      expect(loadSessionSize(storage), bad).toBe(20);
    }
  });

  it('falls back to 20 when storage is blocked or missing', () => {
    expect(loadSessionSize(blocked)).toBe(20);
    expect(() => saveSessionSize(blocked, 10)).not.toThrow();
    expect(loadSessionSize(undefined)).toBe(20);
  });
});

describe('言語 / Language (polycards.lang)', () => {
  afterEach(() => setLang('ja'));

  it('is Japanese by default and remembers the choice', () => {
    const storage = memory();
    expect(loadLang(storage)).toBe('ja');
    saveLang(storage, 'en');
    expect(storage.getItem('polycards.lang')).toBe('en');
    expect(loadLang(storage)).toBe('en');
    saveLang(storage, 'ja');
    expect(loadLang(storage)).toBe('ja');
  });

  it('falls back to Japanese for unknown values or blocked storage', () => {
    const storage = memory();
    for (const bad of ['fr', 'EN', 'english', '']) {
      storage.setItem('polycards.lang', bad);
      expect(loadLang(storage), bad).toBe('ja');
    }
    expect(loadLang(blocked)).toBe('ja');
    expect(() => saveLang(blocked, 'en')).not.toThrow();
  });

  it('switches the app text and sets <html lang>', () => {
    const root = { lang: 'ja' };
    expect(applyLang('en', root)).toBe('en');
    expect(getLang()).toBe('en');
    expect(root.lang).toBe('en');
    expect(applyLang('xx', root)).toBe('ja');
    expect(getLang()).toBe('ja');
    expect(root.lang).toBe('ja');
  });
});

describe('カードの動きを減らす (polycards.reduceMotion)', () => {
  it('is off by default and remembers the choice', () => {
    const storage = memory();
    expect(loadReduceMotion(storage)).toBe(false);
    saveReduceMotion(storage, true);
    expect(storage.getItem('polycards.reduceMotion')).toBe('true');
    expect(loadReduceMotion(storage)).toBe(true);
    saveReduceMotion(storage, false);
    expect(loadReduceMotion(storage)).toBe(false);
  });

  it('is off for broken values or blocked storage', () => {
    const storage = memory();
    for (const bad of ['1', 'yes', 'TRUE', '']) {
      storage.setItem('polycards.reduceMotion', bad);
      expect(loadReduceMotion(storage), bad).toBe(false);
    }
    expect(loadReduceMotion(blocked)).toBe(false);
    expect(() => saveReduceMotion(blocked, true)).not.toThrow();
  });

  it('sets or removes data-reduce-motion on <html>', () => {
    const attrs = {};
    const root = { setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: (k) => { delete attrs[k]; } };
    applyReduceMotion(true, root);
    expect(attrs['data-reduce-motion']).toBe('true');
    applyReduceMotion(false, root);
    expect(attrs).not.toHaveProperty('data-reduce-motion');
  });

  it('JavaScript motion checks both the app switch and the device setting', () => {
    const win = (attr, matches) => ({
      document: { documentElement: { getAttribute: () => attr } },
      matchMedia: () => ({ matches }),
    });
    expect(reduceMotionOn(win('true', false))).toBe(true);
    expect(reduceMotionOn(win(null, true))).toBe(true);
    expect(reduceMotionOn(win(null, false))).toBe(false);
    expect(reduceMotionOn({ document: {} })).toBe(false); // no matchMedia
    expect(reduceMotionOn(null)).toBe(false);
  });
});

describe('自動再生 (polycards.autoPlay)', () => {
  it('is on by default and remembers the choice', () => {
    const storage = memory();
    expect(loadAutoPlay(storage)).toBe(true);
    saveAutoPlay(storage, false);
    expect(storage.getItem('polycards.autoPlay')).toBe('false');
    expect(loadAutoPlay(storage)).toBe(false);
    saveAutoPlay(storage, true);
    expect(loadAutoPlay(storage)).toBe(true);
  });

  it('stays on for broken values or blocked storage (only "false" turns it off)', () => {
    const storage = memory();
    for (const bad of ['1', 'no', 'FALSE', '']) {
      storage.setItem('polycards.autoPlay', bad);
      expect(loadAutoPlay(storage), bad).toBe(true);
    }
    expect(loadAutoPlay(blocked)).toBe(true);
    expect(() => saveAutoPlay(blocked, false)).not.toThrow();
  });
});

describe('ゆっくり (polycards.slowSpeech)', () => {
  it('is off by default and remembers the choice', () => {
    const storage = memory();
    expect(loadSlowSpeech(storage)).toBe(false);
    saveSlowSpeech(storage, true);
    expect(storage.getItem('polycards.slowSpeech')).toBe('true');
    expect(loadSlowSpeech(storage)).toBe(true);
    saveSlowSpeech(storage, false);
    expect(loadSlowSpeech(storage)).toBe(false);
  });

  it('is off for broken values or blocked storage', () => {
    const storage = memory();
    for (const bad of ['1', 'yes', 'TRUE', '']) {
      storage.setItem('polycards.slowSpeech', bad);
      expect(loadSlowSpeech(storage), bad).toBe(false);
    }
    expect(loadSlowSpeech(blocked)).toBe(false);
    expect(() => saveSlowSpeech(blocked, true)).not.toThrow();
  });
});

describe('theme cache (polycards.theme)', () => {
  it('remembers the last theme and forgets it on log-out', () => {
    const storage = memory();
    expect(loadThemeCache(storage)).toBeNull();
    saveThemeCache(storage, 'galaxy');
    expect(storage.getItem('polycards.theme')).toBe('galaxy');
    expect(loadThemeCache(storage)).toBe('galaxy');
    clearThemeCache(storage);
    expect(loadThemeCache(storage)).toBeNull();
  });

  it('gives null for an empty value or blocked storage (getTheme then uses the default)', () => {
    const storage = memory();
    storage.setItem('polycards.theme', '');
    expect(loadThemeCache(storage)).toBeNull();
    expect(loadThemeCache(blocked)).toBeNull();
    expect(() => saveThemeCache(blocked, 'neon')).not.toThrow();
    expect(() => clearThemeCache(blocked)).not.toThrow();
  });
});

describe('?theme= in the URL', () => {
  it('only works in development', () => {
    expect(devThemeOverride(true, '?theme=pizza')).toBe('pizza');
    expect(devThemeOverride(true, '')).toBeNull();
    expect(devThemeOverride(false, '?theme=pizza')).toBeNull();
  });
});

describe('src/index.css', () => {
  // Every class switched off by the device's Reduce Motion setting must also be switched off by
  // the app's カードの動きを減らす switch (data-reduce-motion="true" on <html>).
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  const appRules = css.split('\n').filter((line) => line.startsWith(':root[data-reduce-motion="true"]')).join('\n');

  it('has reduce-motion blocks to check', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(6);
  });

  it.each(blocks.map((b, i) => [i, b]))('block %i also applies under data-reduce-motion', (_, block) => {
    const classes = [...new Set([...block.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]))];
    for (const name of classes) expect(appRules, name).toContain(`.${name}`);
  });
});
