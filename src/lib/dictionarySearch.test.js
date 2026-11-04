// Tests for the dictionary search (src/lib/dictionary.js, bottom part). Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  toHiragana, normalizeJa, normalizeEn, jaSegments, pastFormBases, isEnglishQuery, buildDictionaryIndex,
  searchDictionary, relatedWords, baseFormWords, sameEnglishWords, wordPackPaths, loadCachedIndex, saveCachedIndex,
} from './dictionary';

// Real entries from the live library (2026-11).
const WORDS = [
  { id: 'eat', english: 'eat', japanese: '食べる', reading: 'たべる', pos: 'verb', alt_answers: [] },
  { id: 'ate', english: 'ate', japanese: '食べた（eatの過去形）', reading: 'たべた（eatのかこけい）', pos: 'verb', alt_answers: [] },
  { id: 'read', english: 'read', japanese: '読む', reading: 'よむ', pos: 'verb', alt_answers: [] },
  { id: 'read-past', english: 'read', japanese: '読んだ（readの過去形）', reading: 'よんだ（readのかこけい）', pos: 'verb', alt_answers: [] },
  { id: 'sell', english: 'sell', japanese: '売る', reading: 'うる', pos: 'verb', alt_answers: [] },
  { id: 'sold', english: 'sold', japanese: '売った、売られた（sellの過去形・過去分詞）', reading: 'うった、うられた（sellのかこけい・かこぶんし）', pos: 'verb', alt_answers: [] },
  { id: 'was', english: 'was', japanese: '～だった、～にいた（am・isの過去形）', reading: '～だった、～にいた（am・isのかこけい）', pos: 'verb', alt_answers: [] },
  { id: 'is', english: 'is', japanese: '～である', reading: '～である', pos: 'verb', alt_answers: [] },
  { id: 'spread', english: 'spread', japanese: '広がる、広げる（過去形もspread）', reading: 'ひろがる、ひろげる（かこけいもspread）', pos: 'verb', alt_answers: [] },
  { id: 'episode', english: 'episode', japanese: '（ドラマの）1話、エピソード', reading: '（どらまの）1わ、えぴそーど', pos: 'noun', alt_answers: [] },
  { id: 'approach', english: 'approach', japanese: '取り組み方、接近；近づく', reading: 'とりくみかた、せっきん；ちかづく', pos: 'noun', alt_answers: [] },
  { id: 'accurate', english: 'accurate', japanese: '正確な', reading: 'せいかくな', pos: 'adjective', alt_answers: [] },
  { id: 'exact', english: 'exact', japanese: '正確な', reading: 'せいかくな', pos: 'adjective', alt_answers: [] },
  { id: 'park', english: 'park', japanese: '公園', reading: 'こうえん', pos: 'noun', alt_answers: [] },
  { id: 'park-v', english: 'park', japanese: '駐車する', reading: 'ちゅうしゃする', pos: 'verb', alt_answers: [] },
  { id: 'pretty', english: 'pretty', japanese: 'かわいい、きれい', reading: 'かわいい、きれい', pos: 'adjective', alt_answers: ['cute'] },
  { id: 'look-for', english: 'look for ~', japanese: '～を探す', reading: '～をさがす', pos: 'phrase', alt_answers: [] },
  { id: 'beautiful', english: 'beautiful', japanese: '美しい', reading: 'うつくしい', pos: 'adjective', alt_answers: [] },
];
const index = buildDictionaryIndex(WORDS);
const ids = (q) => searchDictionary(index, q).map((w) => w.id);

describe('normalizing', () => {
  it('turns katakana into hiragana and cleans Japanese', () => {
    expect(toHiragana('タベル')).toBe('たべる');
    expect(normalizeJa('～を　探す')).toBe('を探す');
    expect(normalizeJa('ＡＢＣ')).toBe('abc');
  });

  it('cleans English', () => {
    expect(normalizeEn('Look for ~')).toBe('look for');
    expect(normalizeEn('How old ...?')).toBe('how old');
    expect(normalizeEn('don’t')).toBe("don't");
  });

  it('splits meanings into segments and drops （…） notes', () => {
    expect(jaSegments('（どらまの）1わ、えぴそーど')).toEqual(['1わ', 'えぴそーど']);
    expect(jaSegments('とりくみかた、せっきん；ちかづく')).toEqual(['とりくみかた', 'せっきん', 'ちかづく']);
    expect(jaSegments('読んだ（readの過去形）')).toEqual(['読んだ']);
  });

  it('tells English from Japanese queries', () => {
    expect(isEnglishQuery('eat')).toBe(true);
    expect(isEnglishQuery('ｅａｔ')).toBe(true);
    expect(isEnglishQuery('たべる')).toBe(false);
    expect(isEnglishQuery('食べ')).toBe(false);
  });
});

describe('past forms', () => {
  it('finds the base words', () => {
    expect(pastFormBases('読んだ（readの過去形）')).toEqual(['read']);
    expect(pastFormBases('売った、売られた（sellの過去形・過去分詞）')).toEqual(['sell']);
    expect(pastFormBases('～だった、～にいた（am・isの過去形）')).toEqual(['am', 'is']);
    expect(pastFormBases('beの過去分詞(〜にいた、〜に行ったことがある)')).toEqual(['be']);
    expect(pastFormBases('広がる、広げる（過去形もspread）')).toBe(null);
    expect(pastFormBases('過去')).toBe(null);
  });

  it('links to the base row, never the other past-form row', () => {
    expect(baseFormWords(index, WORDS[3]).map((w) => w.id)).toEqual(['read']);
    expect(baseFormWords(index, WORDS[5]).map((w) => w.id)).toEqual(['sell']);
    expect(baseFormWords(index, WORDS[6]).map((w) => w.id)).toEqual(['is']);
    expect(baseFormWords(index, WORDS[0])).toEqual([]);
  });
});

describe('searchDictionary', () => {
  it('finds a word by kana, katakana, kanji and English', () => {
    expect(ids('たべる')[0]).toBe('eat');
    expect(ids('タベル')[0]).toBe('eat');
    expect(ids('食べる')[0]).toBe('eat');
    expect(ids('eat')[0]).toBe('eat');
  });

  it('forgives a small spelling mistake (swapped letters count as one)', () => {
    expect(ids('eta')[0]).toBe('eat');
    expect(ids('beautful')).toContain('beautiful');
  });

  it('matches each meaning segment, ignoring notes', () => {
    expect(ids('えぴそーど')[0]).toBe('episode');
    expect(ids('ちかづく')[0]).toBe('approach');
    expect(ids('どらま')).not.toContain('episode');
  });

  it('ranks exact before starts-with before contains', () => {
    expect(ids('かわいい')[0]).toBe('pretty');
    expect(ids('pa')).toEqual(expect.arrayContaining(['park', 'park-v']));
  });

  it('finds alternates and phrases', () => {
    expect(ids('cute')).toContain('pretty');
    expect(ids('look for')[0]).toBe('look-for');
    expect(ids('for')).toContain('look-for');
  });

  it('lists a base word before a past form with the same spelling', () => {
    expect(ids('read').slice(0, 2)).toEqual(['read', 'read-past']);
  });

  it('lists past forms after their base word', () => {
    expect(ids('sell')).toEqual(['sell', 'sold']);
    expect(ids('eat').indexOf('ate')).toBeGreaterThan(0);
  });

  it('needs 2 English letters, but 1 Japanese character is enough', () => {
    expect(ids('e')).toEqual([]);
    expect(ids('売')).toEqual(expect.arrayContaining(['sell', 'sold']));
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
  });

  it('returns at most 8 words', () => {
    expect(searchDictionary(index, 'a').length).toBe(0);
    expect(searchDictionary(index, 'る').length).toBeLessThanOrEqual(8);
  });
});

describe('related words', () => {
  it('lists words that share a meaning', () => {
    expect(relatedWords(index, 'accurate').map((w) => w.id)).toEqual(['exact']);
  });

  it('leaves out the same English and past forms', () => {
    expect(relatedWords(index, 'park')).toEqual([]);
    expect(sameEnglishWords(index, WORDS[13]).map((w) => w.id)).toEqual(['park-v']);
  });
});

describe('wordPackPaths', () => {
  const textbooks = [{ name: 'New Horizon 1', units: [{ name: 'Unit 1', decks: [{ id: 'd1', name: 'Words 1' }] }] }];
  const collections = [{
    name: 'コア単語 / Core', decks: [],
    children: [{ name: '基本の単語 / Beginner', decks: [{ id: 'd2', name: 'Beginner 1' }], children: [] }],
  }];

  it('gives the full path of each pack', () => {
    expect(wordPackPaths(['d2', 'd1', 'gone'], textbooks, collections)).toEqual([
      { deck: { id: 'd1', name: 'Words 1' }, parts: ['New Horizon 1', 'Unit 1', 'Words 1'] },
      { deck: { id: 'd2', name: 'Beginner 1' }, parts: ['コア単語 / Core', '基本の単語 / Beginner', 'Beginner 1'] },
    ]);
  });

  it('copes with nothing loaded', () => {
    expect(wordPackPaths(['d1'], null, null)).toEqual([]);
  });
});

describe('index cache', () => {
  const store = () => {
    const data = {};
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  };

  it('saves and loads the words', () => {
    const s = store();
    saveCachedIndex(s, WORDS, 1000);
    expect(loadCachedIndex(s, 2000)).toEqual(WORDS);
  });

  it('ignores an old or broken copy, and storage that throws', () => {
    const s = store();
    saveCachedIndex(s, WORDS, 0);
    expect(loadCachedIndex(s, 7 * 3600 * 1000)).toBe(null);
    s.setItem('polycards.dictionaryIndex', '{bad');
    expect(loadCachedIndex(s)).toBe(null);
    const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(loadCachedIndex(broken)).toBe(null);
    expect(() => saveCachedIndex(broken, WORDS)).not.toThrow();
  });
});

describe('word details (phase 3)', () => {
  it('lists the verb forms, base form first, leaving out missing ones', async () => {
    const { verbFormRows } = await import('./dictionary');
    expect(verbFormRows('go', { verb_past: 'went', verb_pp: 'gone', verb_ing: 'going', verb_third: 'goes' })).toEqual([
      { key: 'base', form: 'go' }, { key: 'past', form: 'went' }, { key: 'pp', form: 'gone' },
      { key: 'ing', form: 'going' }, { key: 'third', form: 'goes' },
    ]);
    expect(verbFormRows('go', { verb_past: 'went', verb_pp: null })).toHaveLength(2);
    expect(verbFormRows('go', {})).toEqual([]);
    expect(verbFormRows('go', null)).toEqual([]);
  });

  it('shows a plural only for countable / both nouns', async () => {
    const { pluralForm } = await import('./dictionary');
    expect(pluralForm({ countable: 'countable', plural: 'dogs' })).toBe('dogs');
    expect(pluralForm({ countable: 'both', plural: 'papers' })).toBe('papers');
    expect(pluralForm({ countable: 'uncountable', plural: 'waters' })).toBe(null);
    expect(pluralForm({ countable: 'plural', plural: 'jeans' })).toBe(null);
    expect(pluralForm({ countable: 'countable', plural: null })).toBe(null);
  });
});
