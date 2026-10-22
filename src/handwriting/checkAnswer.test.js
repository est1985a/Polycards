// Tests for checking handwritten boxes against the target letters. Run with: npm test
import { describe, it, expect } from 'vitest';
import { scoreBox, scoreWord, lenientMessage } from './checkAnswer.js';

describe('scoreBox', () => {
  it('a match is correct, ignoring case', () => {
    expect(scoreBox('a', 'a')).toBe('correct');
    expect(scoreBox('J', 'j')).toBe('correct');
  });
  it('the four look-alike pairs are lenient', () => {
    expect(scoreBox('i', 'l')).toBe('lenient');
    expect(scoreBox('l', 'i')).toBe('lenient');
    expect(scoreBox('g', 'q')).toBe('lenient');
    expect(scoreBox('q', 'g')).toBe('lenient');
    expect(scoreBox('I', 'l')).toBe('lenient');
  });
  it('other mix-ups are wrong, in either direction of a non-pair', () => {
    expect(scoreBox('o', 'd')).toBe('wrong');
    expect(scoreBox('i', 'j')).toBe('wrong');
  });
  it('an empty box is wrong', () => {
    expect(scoreBox('a', null)).toBe('wrong');
  });
});

describe('scoreWord', () => {
  const word = (target, read) => [...target].map((t, i) => ({ target: t, read: read[i] ?? null }));

  it('all correct', () => {
    expect(scoreWord(word('fish', 'fish'))).toMatchObject({ allCorrect: true, hasLenient: false });
  });
  it('a lenient box still counts as correct and is reported', () => {
    const r = scoreWord(word('fish', 'flsh'));
    expect(r.scores).toEqual(['correct', 'lenient', 'correct', 'correct']);
    expect(r.allCorrect).toBe(true);
    expect(r.lenientPairs).toEqual([{ target: 'i', read: 'l' }]);
  });
  it('lists each lenient pair once', () => {
    const r = scoreWord(word('illig', 'lilli'));
    expect(r.lenientPairs).toEqual([{ target: 'i', read: 'l' }, { target: 'l', read: 'i' }]);
    expect(r.allCorrect).toBe(false); // the last box (g read as i) is wrong
  });
  it('one wrong or empty box makes the word wrong', () => {
    expect(scoreWord(word('dog', 'oog')).allCorrect).toBe(false);
    expect(scoreWord([{ target: 'd', read: 'd' }, { target: 'o', read: null }]).allCorrect).toBe(false);
  });
  it('no boxes is not correct', () => {
    expect(scoreWord([]).allCorrect).toBe(false);
  });
});

describe('lenientMessage', () => {
  it('uses the agreed wording', () => {
    expect(lenientMessage({ target: 'i', read: 'l' })).toBe('「i」が「l」に見えるかも。気をつけて書こう！');
  });
});
