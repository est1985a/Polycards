// Tests for the typing-mode spelling check. These must give the same results as spelling_check()
// in supabase/polycards-answers.sql. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  normalizeSpelling, spellingDistance, checkSpelling, loadAnswerMode, saveAnswerMode,
  ignoreNextKey, NEXT_KEY_GUARD_MS, needsOtherMeaningCheck, spellingAnswers, isAlternateAnswer,
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

describe('answer mode なし / タイピング / 手書き (saved on the device)', () => {
  const memory = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  };

  it('is off by default and remembers the choice', () => {
    const storage = memory();
    expect(loadAnswerMode(storage)).toBe('off');
    saveAnswerMode(storage, 'typing');
    expect(storage.getItem('polycards.answerMode')).toBe('typing');
    expect(loadAnswerMode(storage)).toBe('typing');
    saveAnswerMode(storage, 'handwriting');
    expect(loadAnswerMode(storage)).toBe('handwriting');
    saveAnswerMode(storage, 'off');
    expect(loadAnswerMode(storage)).toBe('off');
  });

  it('keeps typing for a student who had the old スペル入力 switch on', () => {
    const storage = memory();
    storage.setItem('polycards.typingMode', '1');
    expect(loadAnswerMode(storage)).toBe('typing');
    storage.setItem('polycards.typingMode', '0');
    expect(loadAnswerMode(storage)).toBe('off');
  });

  it('a new choice wins over the old switch', () => {
    const storage = memory();
    storage.setItem('polycards.typingMode', '1');
    saveAnswerMode(storage, 'off');
    expect(loadAnswerMode(storage)).toBe('off');
  });

  it('ignores an unknown saved value', () => {
    const storage = memory();
    storage.setItem('polycards.answerMode', 'voice');
    expect(loadAnswerMode(storage)).toBe('off');
  });

  it('turns 手書き into typing when handwriting is switched off', () => {
    const storage = memory();
    saveAnswerMode(storage, 'handwriting');
    expect(loadAnswerMode(storage, false)).toBe('typing');
    expect(loadAnswerMode(storage, true)).toBe('handwriting');
  });

  it('stays off when storage is blocked', () => {
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadAnswerMode(blocked)).toBe('off');
    expect(() => saveAnswerMode(blocked, 'typing')).not.toThrow();
    expect(loadAnswerMode(undefined)).toBe('off');
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

describe('needsOtherMeaningCheck: one retry for another word with the same meaning', () => {
  it('asks only for a wrong answer, and only once per showing of the card', () => {
    expect(needsOtherMeaningCheck('wrong', false)).toBe(true);
    expect(needsOtherMeaningCheck('wrong', true)).toBe(false); // the retry was already used
  });

  it('never asks for a correct or nearly correct spelling', () => {
    expect(needsOtherMeaningCheck('exact', false)).toBe(false);
    expect(needsOtherMeaningCheck('close', false)).toBe(false);
  });
});

// Must match spelling_answers() / spelling_check(typed, english, alts) in supabase/polycards-alt-answers.sql.
describe('alternate answers (alt_answers)', () => {
  it('lists every accepted spelling, with and without the ( ) words, once each', () => {
    expect(spellingAnswers('look (at)', ['See', 'watch [TV]'])).toEqual(['look', 'look at', 'see', 'watch', 'watch tv']);
    expect(spellingAnswers('pretty', ['pretty', ' ', null])).toEqual(['pretty']);
    expect(spellingAnswers('pretty')).toEqual(['pretty']);
    expect(spellingAnswers('pretty', null)).toEqual(['pretty']);
  });

  it('an alternate spelled right is exact, with the same clean-up as the main answer', () => {
    expect(checkSpelling('cute', 'pretty', ['cute'])).toBe('exact');
    expect(checkSpelling('ＣＵＴＥ.', 'pretty', ['cute'])).toBe('exact');
    expect(checkSpelling("don’t", 'do not', ["don't"])).toBe('exact');
    expect(checkSpelling('watch', 'look (at)', ['watch [TV]'])).toBe('exact');
    expect(checkSpelling('watch tv', 'look (at)', ['watch [TV]'])).toBe('exact');
    expect(checkSpelling('pretty', 'pretty', ['cute'])).toBe('exact');
  });

  it('one change away from an alternate is close; anything else is wrong', () => {
    expect(checkSpelling('cuet', 'pretty', ['cute'])).toBe('close');
    expect(checkSpelling('cut', 'pretty', ['cute'])).toBe('close');
    expect(checkSpelling('dont', 'do not', ["don't"])).toBe('close');
    expect(checkSpelling('lovely', 'pretty', ['cute'])).toBe('wrong');
    expect(checkSpelling('', 'pretty', ['cute'])).toBe('wrong');
  });

  it('without alternates nothing changes', () => {
    expect(checkSpelling('cute', 'pretty')).toBe('wrong');
    expect(checkSpelling('cute', 'pretty', [])).toBe('wrong');
    expect(checkSpelling('cute', 'pretty', null)).toBe('wrong');
  });

  it('isAlternateAnswer: right only because of an alternate', () => {
    expect(isAlternateAnswer('cute', 'pretty', ['cute'])).toBe(true);
    expect(isAlternateAnswer('pretty', 'pretty', ['cute'])).toBe(false);
    expect(isAlternateAnswer('cuet', 'pretty', ['cute'])).toBe(false);
    expect(isAlternateAnswer('cute', 'pretty', [])).toBe(false);
  });

  it('an exact alternate never asks for the other-meaning retry', () => {
    expect(needsOtherMeaningCheck(checkSpelling('cute', 'pretty', ['cute']), false)).toBe(false);
  });
});
