// Tests for building and shuffling card piles. Run with: npm test
import { describe, it, expect } from 'vitest';
import { buildCards, buildReviewCards, reinsert, shuffle } from './drill';

const withExample = {
  id: 'w1', english: 'already', japanese: 'もう',
  example_en: 'She has already eaten lunch.', example_ja: '彼女はもう昼ご飯を食べました。',
};

describe('buildCards', () => {
  it('makes two cards per word: English to Japanese and Japanese to English', () => {
    const cards = buildCards([{ id: 'w1', english: 'harvest', japanese: '収穫する' }]);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ wordId: 'w1', direction: 'en2jp', front: 'harvest', back: '収穫する' });
    expect(cards[1]).toMatchObject({ wordId: 'w1', direction: 'jp2en', front: '収穫する', back: 'harvest' });
  });

  it('puts the example sentences on both cards', () => {
    const cards = buildCards([withExample]);
    cards.forEach((c) => {
      expect(c).toMatchObject({
        en: 'already', jp: 'もう',
        exampleEn: 'She has already eaten lunch.', exampleJa: '彼女はもう昼ご飯を食べました。',
      });
    });
  });

  it('gives null examples when a word has none, is null, or is blank', () => {
    const words = [
      { id: 'a', english: 'herb', japanese: 'ハーブ' },
      { id: 'b', english: 'stem', japanese: '茎', example_en: null, example_ja: null },
      { id: 'c', english: 'harvest', japanese: '収穫する', example_en: '  ', example_ja: '' },
    ];
    const cards = buildCards(words);
    expect(cards).toHaveLength(6);
    cards.forEach((c) => {
      expect(c.exampleEn).toBeNull();
      expect(c.exampleJa).toBeNull();
    });
    expect(cards[0]).toMatchObject({ direction: 'en2jp', front: 'herb', back: 'ハーブ', en: 'herb', jp: 'ハーブ' });
  });
});

describe('buildReviewCards', () => {
  it('carries level and example sentences from the joined word', () => {
    const [card] = buildReviewCards([{ word_id: 'w1', direction: 'jp2en', level: 3, words: withExample }]);
    expect(card).toMatchObject({
      id: 'w1-j2e', direction: 'jp2en', level: 3, front: 'もう', back: 'already',
      exampleEn: 'She has already eaten lunch.', exampleJa: '彼女はもう昼ご飯を食べました。',
    });
  });

  it('gives null examples when the word has none', () => {
    const [card] = buildReviewCards([
      { word_id: 'w2', direction: 'en2jp', level: 0, words: { id: 'w2', english: 'herb', japanese: 'ハーブ', example_en: null, example_ja: '' } },
    ]);
    expect(card).toMatchObject({ front: 'herb', back: 'ハーブ', exampleEn: null, exampleJa: null });
  });
});

describe('reinsert (a missed card comes back later)', () => {
  it('never puts the card straight back at the front', () => {
    for (let i = 0; i < 200; i++) {
      const pile = reinsert(['a', 'b', 'c'], 'x');
      expect(pile).toHaveLength(4);
      expect(pile[0]).not.toBe('x');
    }
  });

  it('works when the pile is empty', () => {
    expect(reinsert([], 'x')).toEqual(['x']);
  });
});

describe('shuffle', () => {
  it('keeps every card and does not change the original list', () => {
    const original = ['a', 'b', 'c', 'd'];
    const shuffled = shuffle(original);
    expect([...shuffled].sort()).toEqual(original);
    expect(original).toEqual(['a', 'b', 'c', 'd']);
  });
});
