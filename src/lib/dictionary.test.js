// Tests for building dictionary links. Run with: npm test
import { describe, it, expect } from 'vitest';
import { cleanSearchTerm, dictionaryUrl } from './dictionary';

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
