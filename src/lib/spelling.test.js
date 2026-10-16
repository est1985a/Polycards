// Tests for the typing-mode spelling check. These must give the same results as spelling_check()
// in supabase/polycards-answers.sql. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  normalizeSpelling, spellingDistance, checkSpelling, loadTypingMode, saveTypingMode,
  ignoreNextKey, NEXT_KEY_GUARD_MS,
} from './spelling';

describe('checkSpelling: exact', () => {
  it.each([
    ['Apple', 'apple'],
    ['ａｐｐｌｅ', 'apple'],          // full-width letters from the Japanese keyboard
    ['apple.', 'apple'],
    ['ms', 'Ms.'],
    ['how about you', 'How about you?'],
    ['call me', 'Call me ...'],
    ['call me…', 'Call me ...'],
    ['be good at', 'be good at ~'],
    ['be good at ～', 'be good at ~'],
    ['look', 'look (at)'],
    ['look at', 'look (at)'],
    ['have never been to', 'have never [not] been to'],
    ['don’t', "don't"],
    ['don`t', "don't"],              // backtick
    ['excuse me', 'Excuse me,'],
  ])('%s = %s', (typed, english) => {
    expect(checkSpelling(typed, english)).toBe('exact');
  });
});

describe('checkSpelling: close (one change away)', () => {
  it.each([
    ['aple', 'apple'],
    ['appel', 'apple'],
    ['dont', "don't"],
    ['icecream', 'ice cream'],
  ])('%s ≈ %s', (typed, english) => {
    expect(checkSpelling(typed, english)).toBe('close');
  });
});

describe('checkSpelling: wrong', () => {
  it('a different word', () => {
    expect(checkSpelling('banana', 'apple')).toBe('wrong');
  });

  it('an empty answer (or only spaces / dots)', () => {
    expect(checkSpelling('', 'apple')).toBe('wrong');
    expect(checkSpelling('  . ', 'apple')).toBe('wrong');
    expect(checkSpelling(null, 'apple')).toBe('wrong');
  });
});

describe('clean-up and distance', () => {
  it('cleans up in the same order as the SQL', () => {
    expect(normalizeSpelling('  Ｈｏｗ  about   YOU？ ')).toBe('how about you');
    expect(normalizeSpelling('Call me …')).toBe('call me');
    // NFKC runs first and turns ´ into a space + accent, so the ´ → ' rule never fires (same in the SQL).
    expect(normalizeSpelling('I´m')).not.toBe("i'm");
  });

  it('counts one added, removed, changed or swapped letter as 1', () => {
    expect(spellingDistance('apple', 'apple')).toBe(0);
    expect(spellingDistance('aple', 'apple')).toBe(1);
    expect(spellingDistance('applee', 'apple')).toBe(1);
    expect(spellingDistance('appla', 'apple')).toBe(1);
    expect(spellingDistance('appel', 'apple')).toBe(1);
    expect(spellingDistance('', 'abc')).toBe(3);
    expect(spellingDistance('ab', 'ba')).toBe(1);
    expect(spellingDistance('banana', 'apple')).toBeGreaterThan(1);
  });
});

describe('typing mode switch (saved on the device)', () => {
  const memory = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  };

  it('is off by default and remembers the choice', () => {
    const storage = memory();
    expect(loadTypingMode(storage)).toBe(false);
    saveTypingMode(storage, true);
    expect(storage.getItem('polycards.typingMode')).toBe('1');
    expect(loadTypingMode(storage)).toBe(true);
    saveTypingMode(storage, false);
    expect(loadTypingMode(storage)).toBe(false);
  });

  it('stays off when storage is blocked', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadTypingMode(blocked)).toBe(false);
    expect(() => saveTypingMode(blocked, true)).not.toThrow();
    expect(loadTypingMode(undefined)).toBe(false);
  });
});

describe('次へ ignores the Enter that answered', () => {
  const shownAt = 10_000;

  it('ignores Enter just after 次へ appears', () => {
    expect(ignoreNextKey({ key: 'Enter', repeat: false }, shownAt, shownAt + 50)).toBe(true);
    expect(ignoreNextKey({ key: 'Enter', repeat: false }, shownAt, shownAt + NEXT_KEY_GUARD_MS - 1)).toBe(true);
  });

  it('accepts Enter after the short wait', () => {
    expect(ignoreNextKey({ key: 'Enter', repeat: false }, shownAt, shownAt + NEXT_KEY_GUARD_MS)).toBe(false);
  });

  it('always ignores a held-down key', () => {
    expect(ignoreNextKey({ key: 'Enter', repeat: true }, shownAt, shownAt + 5000)).toBe(true);
    expect(ignoreNextKey({ key: ' ', repeat: true }, shownAt, shownAt + 5000)).toBe(true);
  });
});
