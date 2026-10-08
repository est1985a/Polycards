// Tests for building dictionary links. Run with: npm test
import { describe, it, expect } from 'vitest';
import { cleanSearchTerm, dictionaryUrl, highlightParts } from './dictionary';

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

describe('dictionaryUrl', () => {
  it('builds an encoded ALC search address', () => {
    expect(dictionaryUrl('Call me ...')).toBe('https://eow.alc.co.jp/search?q=call%20me');
    expect(dictionaryUrl('want to ...')).toBe('https://eow.alc.co.jp/search?q=want%20to');
    expect(dictionaryUrl('South Africa')).toBe('https://eow.alc.co.jp/search?q=south%20africa');
    expect(dictionaryUrl("What's this?")).toBe("https://eow.alc.co.jp/search?q=what's%20this");
  });

  it('gives null when nothing is left to search for', () => {
    expect(dictionaryUrl('')).toBeNull();
    expect(dictionaryUrl('...?')).toBeNull();
    expect(dictionaryUrl(undefined)).toBeNull();
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

  it('returns nothing for a missing sentence', () => {
    expect(highlightParts(null, 'go')).toEqual([]);
    expect(highlightParts('', 'go')).toEqual([]);
  });
});
