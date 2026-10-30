// Tests for cleaning a card's English and highlighting it in examples. Run with: npm test
import { describe, it, expect } from 'vitest';
import { cleanSearchTerm, highlightParts } from './dictionary';

describe('cleanSearchTerm', () => {
  it('removes "..." and the extra space it leaves', () => {
    expect(cleanSearchTerm('Call me ...')).toBe('call me');
    expect(cleanSearchTerm('want to ...')).toBe('want to');
    expect(cleanSearchTerm('want to …')).toBe('want to');
  });

  it('lowercases names', () => {
    expect(cleanSearchTerm('South Africa')).toBe('south africa');
  });

  it('removes parentheses and the words inside them', () => {
    expect(cleanSearchTerm('look (at)')).toBe('look');
    expect(cleanSearchTerm('fish (pl. fish)')).toBe('fish');
  });

  it('removes question marks', () => {
    expect(cleanSearchTerm("What's this?")).toBe("what's this");
  });

  it('collapses extra spaces', () => {
    expect(cleanSearchTerm('  get   up  ')).toBe('get up');
  });
});

describe('highlightParts', () => {
  // The highlighted pieces only, for short checks.
  const hits = (sentence, english) => highlightParts(sentence, english).filter((p) => p.hit).map((p) => p.text);

  it('marks the word and keeps the whole sentence', () => {
    const parts = highlightParts('She has already eaten lunch.', 'already');
    expect(parts).toEqual([
      { text: 'She has ', hit: false },
      { text: 'already', hit: true },
      { text: ' eaten lunch.', hit: false },
    ]);
  });

  it('ignores capitals', () => {
    expect(hits('Already done!', 'already')).toEqual(['Already']);
  });

  it('finds common word forms', () => {
    expect(hits('He eats rice.', 'eat')).toEqual(['eats']);
    expect(hits('I have eaten.', 'eat')).toEqual(['eaten']);
    expect(hits('She studied hard.', 'study')).toEqual(['studied']);
    expect(hits('We are making a cake.', 'make')).toEqual(['making']);
    expect(hits('The bus stopped.', 'stop')).toEqual(['stopped']);
  });

  it('does not mark other words that just start the same way', () => {
    expect(hits('Be careful with the car.', 'car')).toEqual(['car']);
    expect(hits('I want an apple.', 'a')).toEqual([]);
  });

  it('marks a phrase, even across extra spaces', () => {
    expect(hits('I am looking for my key. Look  for it!', 'look for')).toEqual(['Look  for']);
  });

  it('uses the same clean-up as the dictionary link', () => {
    expect(hits('Call me Ken.', 'Call me ...')).toEqual(['Call me']);
    expect(hits('Please look at this.', 'look (at)')).toEqual(['look']);
  });

  it('matches each part of a "~" phrase on its own', () => {
    expect(hits('It is too hot to swim.', 'too ~ to')).toEqual(['too', 'to']);
  });

  it('returns the sentence as one plain piece when the word is not found', () => {
    expect(highlightParts('He went home.', 'go')).toEqual([{ text: 'He went home.', hit: false }]);
  });

  it('matches any form of "be" inside a phrase', () => {
    expect(hits('She is interested in music.', 'be interested in ~')).toEqual(['is interested in']);
    expect(hits('He was interested in art.', 'be interested in ~')).toEqual(['was interested in']);
    expect(hits("I'm interested in music.", 'be interested in ~')).toEqual(["'m interested in"]);
    expect(hits('They are good at tennis.', 'be good at ~')).toEqual(['are good at']);
  });

  it('tries again without "be" only when the full phrase is not found', () => {
    expect(hits('She is not interested in music.', 'be interested in ~')).toEqual(['interested in']);
  });

  it('returns one plain piece when a "be" phrase is not found at all', () => {
    expect(highlightParts('He likes music.', 'be interested in ~')).toEqual([
      { text: 'He likes music.', hit: false },
    ]);
  });

  it('keeps the single word "be" as it was', () => {
    expect(hits('Be careful.', 'be')).toEqual(['Be']);
    expect(hits('She is kind.', 'be')).toEqual([]);
  });

  it('returns nothing for a missing sentence', () => {
    expect(highlightParts(null, 'go')).toEqual([]);
    expect(highlightParts('', 'go')).toEqual([]);
  });
});
