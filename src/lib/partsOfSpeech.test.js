// Tests for the parts of speech data (words.pos). Run with: npm test
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { POS_KEYS, POS_EXAMPLES, posKey, returnFocusTarget } from './partsOfSpeech';
import ja from '../i18n/ja';
import en from '../i18n/en';

describe('parts of speech', () => {
  it('has the 12 keys, in the same list as the SQL CHECK constraint', () => {
    expect(POS_KEYS).toEqual(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'auxiliary', 'article', 'interjection', 'number', 'phrase']);
    const sql = readFileSync(new URL('../../supabase/polycards-pos.sql', import.meta.url), 'utf8');
    const inList = sql.match(/pos in \(([^)]*)\)/)[1].match(/'([a-z]+)'/g).map((s) => s.slice(1, -1));
    expect(inList).toEqual(POS_KEYS);
  });

  it('posKey: a known key, else null (no chip)', () => {
    expect(posKey('noun')).toBe('noun');
    expect(posKey(' Verb ')).toBe('verb');
    expect(posKey(null)).toBeNull();
    expect(posKey(undefined)).toBeNull();
    expect(posKey('')).toBeNull();
    expect(posKey('nouns')).toBeNull();
    expect(posKey(3)).toBeNull();
  });

  it('every key has a label, the other name and an explanation in both languages, and 2–3 examples', () => {
    POS_KEYS.forEach((k) => {
      ['label', 'other', 'desc'].forEach((part) => {
        expect(ja[`pos.${part}.${k}`]).toBeTruthy();
        expect(en[`pos.${part}.${k}`]).toBeTruthy();
      });
      expect(POS_EXAMPLES[k].length).toBeGreaterThanOrEqual(2);
      expect(POS_EXAMPLES[k].length).toBeLessThanOrEqual(3);
    });
    expect(ja['pos.label.noun']).toBe('名詞');
    expect(en['pos.label.auxiliary']).toBe('auxiliary verb');
    expect(POS_EXAMPLES.adverb).toEqual(['slowly', 'often', 'very']);
  });

  it('returnFocusTarget: back to the typing box if it had focus, otherwise to the chip', () => {
    const chip = { tagName: 'BUTTON' };
    const input = { tagName: 'INPUT', isConnected: true };
    expect(returnFocusTarget(chip, input)).toBe(input);
    expect(returnFocusTarget(chip, { tagName: 'TEXTAREA' })).toEqual({ tagName: 'TEXTAREA' });
    expect(returnFocusTarget(chip, chip)).toBe(chip);
    expect(returnFocusTarget(chip, { tagName: 'BODY' })).toBe(chip);
    expect(returnFocusTarget(chip, null)).toBe(chip);
    expect(returnFocusTarget(chip, { tagName: 'INPUT', isConnected: false })).toBe(chip); // box gone (card moved on)
  });
});
