// Tests for checking handwritten boxes against the target letters. Run with: npm test
import { describe, it, expect } from 'vitest';
import { scoreBox, scoreWord, lenientMessage } from './checkAnswer.js';
import { MIN_TARGET_PROB } from './config.js';

describe('scoreBox', () => {
  it('the top letter being the target is correct, ignoring case', () => {
    expect(scoreBox('a', 'a', 0.9)).toBe('correct');
    expect(scoreBox('J', 'j', 0.6)).toBe('correct');
  });
  it('a target probability of at least MIN_TARGET_PROB is lenient', () => {
    expect(MIN_TARGET_PROB).toBe(0.25);
    expect(scoreBox('i', 'j', 0.45)).toBe('lenient');
    expect(scoreBox('o', 'd', 0.25)).toBe('lenient'); // exactly at the limit
  });
  it('below MIN_TARGET_PROB is wrong, unless it is a look-alike pair', () => {
    expect(scoreBox('o', 'd', 0.249)).toBe('wrong');
    expect(scoreBox('i', 'j', 0.1)).toBe('wrong');
    expect(scoreBox('a', 'q', 0)).toBe('wrong');
  });
  it('the four look-alike pairs are lenient whatever the probability', () => {
    expect(scoreBox('i', 'l', 0)).toBe('lenient');
    expect(scoreBox('l', 'i', 0.01)).toBe('lenient');
    expect(scoreBox('g', 'q', 0)).toBe('lenient');
    expect(scoreBox('q', 'g', 0)).toBe('lenient');
    expect(scoreBox('I', 'l', 0)).toBe('lenient');
  });
  it('a missing probability counts as 0', () => {
    expect(scoreBox('o', 'd')).toBe('wrong');
  });
  it('an empty box is wrong', () => {
    expect(scoreBox('a', null, 0)).toBe('wrong');
  });
  it('the limit can be changed', () => {
    expect(scoreBox('o', 'd', 0.3, { minProb: 0.5 })).toBe('wrong');
  });
});

describe('scoreWord', () => {
  // read: the letters the model read; probs: the target letter's probability per box (default 0)
  const word = (target, read, probs = []) =>
    [...target].map((t, i) => ({ target: t, read: read[i] ?? null, targetProb: probs[i] ?? (read[i] === t ? 0.9 : 0) }));

  it('all correct', () => {
    expect(scoreWord(word('fish', 'fish'))).toMatchObject({ allCorrect: true, hasLenient: false });
  });
  it('a look-alike box still counts as correct and is reported', () => {
    const r = scoreWord(word('fish', 'flsh'));
    expect(r.scores).toEqual(['correct', 'lenient', 'correct', 'correct']);
    expect(r.allCorrect).toBe(true);
    expect(r.lenientPairs).toEqual([{ target: 'i', read: 'l' }]);
  });
  it('a box saved by the target probability is reported with the letter the model read', () => {
    const r = scoreWord(word('fish', 'fjsh', [0.9, 0.45, 0.9, 0.9]));
    expect(r.scores[1]).toBe('lenient');
    expect(r.allCorrect).toBe(true);
    expect(r.lenientPairs).toEqual([{ target: 'i', read: 'j' }]);
  });
  it('lists each lenient pair once', () => {
    const r = scoreWord(word('illig', 'lilli'));
    expect(r.lenientPairs).toEqual([{ target: 'i', read: 'l' }, { target: 'l', read: 'i' }]);
    expect(r.allCorrect).toBe(false); // the last box (g read as i, low probability) is wrong
  });
  it('one wrong or empty box makes the word wrong', () => {
    expect(scoreWord(word('dog', 'oog', [0.1, 0.9, 0.9])).allCorrect).toBe(false);
    expect(scoreWord([{ target: 'd', read: 'd', targetProb: 0.9 }, { target: 'o', read: null, targetProb: 0 }]).allCorrect).toBe(false);
  });
  it('no boxes is not correct', () => {
    expect(scoreWord([]).allCorrect).toBe(false);
  });
});

describe('lenientMessage', () => {
  it('names the letter the model read', () => {
    expect(lenientMessage({ target: 'i', read: 'l' })).toBe('「i」が「l」に見えるかも。気をつけて書こう！');
    expect(lenientMessage({ target: 'i', read: 'j' })).toBe('「i」が「j」に見えるかも。気をつけて書こう！');
  });
});
