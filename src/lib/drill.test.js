// Tests for building and shuffling card piles. Run with: npm test
import { describe, it, expect } from 'vitest';
import { buildCards, reinsert, shuffle } from './drill';

describe('buildCards', () => {
  it('makes two cards per word: English to Japanese and Japanese to English', () => {
    const cards = buildCards([{ id: 'w1', english: 'harvest', japanese: '収穫する' }]);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ wordId: 'w1', direction: 'en2jp', front: 'harvest', back: '収穫する' });
    expect(cards[1]).toMatchObject({ wordId: 'w1', direction: 'jp2en', front: '収穫する', back: 'harvest' });
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
