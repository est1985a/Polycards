import { describe, it, expect, vi } from 'vitest';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { t, tx } from './index';
import ja from './ja';

describe('t()', () => {
  it('returns the Japanese text for a key', () => {
    expect(t('menu.settings')).toBe('設定');
  });

  it('fills in placeholders', () => {
    expect(t('myCards.nextReview', { when: '2時間後', n: 7 })).toBe('次の復習：2時間後に 7枚');
    expect(t('time.monthDay', { month: 10, day: 15 })).toBe('10月15日');
  });

  it('leaves a placeholder with no value as it is', () => {
    expect(t('menu.rank')).toBe('ランク {n}');
  });

  it('calls an entry that is a function with the placeholders', () => {
    ja['test.plural'] = ({ n }) => (n === 1 ? '1 card' : '{n} cards');
    try {
      expect(t('test.plural', { n: 1 })).toBe('1 card');
      expect(t('test.plural', { n: 3 })).toBe('3 cards');
    } finally {
      delete ja['test.plural'];
    }
  });

  it('shows the key and warns when a key is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(t('no.such.key')).toBe('no.such.key');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no.such.key'));
    warn.mockRestore();
  });
});

describe('tx()', () => {
  it('puts React elements in place of placeholders', () => {
    const parts = tx('gacha.toNextTicket', { n: <b>12</b> });
    expect(parts.some(isValidElement)).toBe(true);
    expect(renderToStaticMarkup(<span>{parts}</span>)).toBe('<span>次のガチャ券まで あと <b>12</b> レビュー</span>');
  });
});
