// Tests for drafting the dictionary's word-detail batches. Run with: npm test
import { describe, it, expect } from 'vitest';
import { meaningSegments, candidates, draftRow, toSql, toCsv, formBase } from './wordDetailsPlan';

const W = (id, english, japanese, pos) => ({ id, english, japanese, pos });
const WORDS = [
  W('1', 'dog', '犬', 'noun'),
  W('2', 'attack', '攻撃する；攻撃', 'verb'),
  W('3', 'snow', '雪；雪が降る', 'noun'),
  W('4', 'honey', 'はちみつ', 'noun'),
  W('5', 'went', '行った（goの過去形）', 'verb'),
  W('6', 'go', '行く', 'verb'),
  W('7', 'beautiful', '美しい', 'adjective'),
  W('8', 'Japan', '日本', 'noun'),
  W('9', 'soccer', 'サッカー', 'noun'),
  W('10', 'cut', '切る', 'verb'),
];

describe('candidates', () => {
  it('nouns: pos noun, plus verbs with a noun meaning; never past forms', () => {
    expect(candidates(WORDS, 'nouns').map((w) => w.english)).toEqual(['attack', 'dog', 'honey', 'Japan', 'snow', 'soccer']);
  });

  it('verbs: pos verb, plus nouns with a verb meaning; katakana and past forms never', () => {
    expect(candidates(WORDS, 'verbs').map((w) => w.english)).toEqual(['attack', 'cut', 'go', 'honey', 'snow']);
  });

  it('fixes can skip or include a word', () => {
    const fixes = { verbs: { 4: { skip: true }, 7: { include: true } } };
    expect(candidates(WORDS, 'verbs', fixes).map((w) => w.english)).toEqual(['attack', 'beautiful', 'cut', 'go', 'snow']);
  });

  it('splits meanings and drops notes', () => {
    expect(meaningSegments('（災害などが）襲う；攻撃')).toEqual(['襲う', '攻撃']);
  });
});

describe('draftRow', () => {
  it('drafts countable + plural, proper nouns get nothing, fixes win', () => {
    expect(draftRow(WORDS[0], 'nouns')).toMatchObject({ countable: 'countable', plural: 'dogs' });
    expect(draftRow(WORDS[7], 'nouns')).toMatchObject({ countable: null, plural: null });
    expect(draftRow(WORDS[0], 'nouns', { nouns: { 1: { countable: 'uncountable', plural: null } } })).toMatchObject({ countable: 'uncountable', plural: null });
    expect(draftRow(W('x', 'T-shirt', 'Tシャツ', 'noun'), 'nouns')).toMatchObject({ countable: 'countable', plural: 'T-shirts' });
  });

  it('drafts verb forms, fixes win', () => {
    expect(draftRow(WORDS[5], 'verbs')).toMatchObject({ past: 'went', pp: 'gone', ing: 'going', third: 'goes' });
    expect(draftRow(WORDS[5], 'verbs', { verbs: { 6: { pp: 'been' } } })).toMatchObject({ pp: 'been' });
  });

  it('builds forms from the English without ( ) and ~', () => {
    expect(formBase('look for ~')).toBe('look for');
    expect(formBase('(be) interested')).toBe('interested');
  });
});

describe('toSql / toCsv', () => {
  const rows = [draftRow(WORDS[0], 'nouns'), draftRow(WORDS[7], 'nouns'), draftRow(W('q', "o'clock", 'x', 'noun'), 'nouns')];
  const sql = toSql(rows, 'nouns', 'word-details-nouns-1', 'batch 1 of 1');

  it('fills only empty columns, leaves out rows with nothing to write, escapes quotes', () => {
    expect(sql).toContain('where w.id = v.id and w.countable is null and w.plural is null;');
    expect(sql).toContain("('1'::uuid, 'countable', 'dogs'),  -- dog");
    expect(sql).toContain("'o''clocks'");
    expect(sql).not.toContain("'8'::uuid, 'countable'");
    expect(sql).toContain('should both be 2');
  });

  it('the last value has no comma', () => {
    const values = sql.split('from (values\n')[1].split('\n) as v')[0].split('\n');
    expect(values.at(-1)).not.toMatch(/\),\s+--/);
    expect(values.slice(0, -1).every((l) => /\),\s+--/.test(l))).toBe(true);
  });

  it('the readable list has a BOM and Japanese labels', () => {
    const csv = toCsv(rows, 'nouns');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('dog,犬,countable,数えられる,dogs');
    expect(csv).toContain('（なし）');
  });
});
