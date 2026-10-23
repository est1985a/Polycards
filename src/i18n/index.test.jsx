import { describe, it, expect, vi, afterEach } from 'vitest';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { t, tx, getLang, setLang } from './index';
import en from './en';

afterEach(() => setLang('ja'));

describe('t()', () => {
  it('returns the Japanese text for a key (Japanese is the default)', () => {
    expect(getLang()).toBe('ja');
    expect(t('menu.settings')).toBe('設定');
  });

  it('returns the English text in English mode', () => {
    setLang('en');
    expect(t('menu.settings')).toBe('Settings');
  });

  it('falls back to Japanese for an unknown language', () => {
    expect(setLang('fr')).toBe('ja');
    expect(t('menu.settings')).toBe('設定');
  });

  it('fills in placeholders', () => {
    expect(t('myCards.nextReview', { when: '2時間後', n: 7 })).toBe('次の復習：2時間後に 7枚');
    expect(t('time.monthDay', { month: 10, day: 15 })).toBe('10月15日');
  });

  it('leaves a placeholder with no value as it is', () => {
    expect(t('menu.rank')).toBe('ランク {n}');
  });

  it('calls a function entry first, then fills in the placeholders it returns', () => {
    setLang('en');
    expect(t('cardSets.wordCount', { n: 1 })).toBe('1 word');
    expect(t('cardSets.wordCount', { n: 3 })).toBe('3 words');
    expect(t('myCards.nextReview', { n: 7, when: 'in 2 hours' })).toBe('Next review: 7 cards in 2 hours');
    expect(t('time.monthDay', { month: 10, day: 24 })).toBe('on Oct 24');
  });

  it('shows an empty string as nothing', () => {
    setLang('en');
    expect(t('review.notYet.ja')).toBe('');
    expect(t('cardSets.titleJa')).toBe('');
  });

  it('uses the Japanese text and warns when a key is missing in English', () => {
    const saved = en['menu.settings'];
    delete en['menu.settings'];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      setLang('en');
      expect(t('menu.settings')).toBe('設定');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('menu.settings'));
    } finally {
      en['menu.settings'] = saved;
      warn.mockRestore();
    }
  });

  it('shows the key and warns when a key is missing everywhere', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(t('no.such.key')).toBe('no.such.key');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no.such.key'));
    warn.mockRestore();
  });
});

describe('tx()', () => {
  const html = (parts) => renderToStaticMarkup(<span>{parts}</span>);

  it('puts React elements in place of placeholders', () => {
    const parts = tx('gacha.toNextTicket', { n: <b>12</b>, count: 12 });
    expect(parts.some(isValidElement)).toBe(true);
    expect(html(parts)).toBe('<span>次のガチャ券まで あと <b>12</b> レビュー</span>');
  });

  it('picks the plural from count when {n} is an element', () => {
    setLang('en');
    expect(html(tx('cardSets.wordCount', { n: <b>1</b>, count: 1 }))).toBe('<span><b>1</b> word</span>');
    expect(html(tx('cardSets.wordCount', { n: <b>3</b>, count: 3 }))).toBe('<span><b>3</b> words</span>');
  });

  it('shows nothing for an empty string', () => {
    setLang('en');
    expect(tx('cardSets.titleJa')).toEqual([]);
  });
});
