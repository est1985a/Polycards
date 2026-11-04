// Tests for the dictionary search box, its suggestions and the word pop-up. Run with: npm test
// (No DOM here, so typing, taps and focus are checked in the browser with Playwright.)
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DictionarySearch, { Suggestions } from './DictionarySearch';
import { WordSheetBody } from './WordSheet';
import Header from './Header';
import { isImeKey } from '../lib/dictionary';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const EAT = { id: 'eat', english: 'eat', japanese: '食べる', reading: 'たべる', pos: 'verb', alt_answers: [] };
const READ = { id: 'read', english: 'read', japanese: '読む', reading: 'よむ', pos: 'verb', alt_answers: [] };

describe('DictionarySearch', () => {
  it('wide: a search box at least 16 px (no iPad zoom) and 44 px tall', () => {
    const html = renderToStaticMarkup(<DictionarySearch wide />);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-label="辞書で単語をさがす"');
    expect(html).toContain('font-size:16px');
    expect(html).toContain('min-height:44px');
    expect(html).toContain('placeholder="単語をさがす（英語・日本語）"');
  });

  it('phones: a 44 px magnifier button, the box only after a tap', () => {
    const html = renderToStaticMarkup(<DictionarySearch />);
    expect(html).toContain('aria-label="辞書"');
    expect(html).toContain('width:44px;height:44px');
    expect(html).not.toContain('role="combobox"');
  });

  it('is switched off while a review question shows', () => {
    expect(renderToStaticMarkup(<DictionarySearch wide disabled />)).toContain('disabled=""');
    expect(renderToStaticMarkup(<DictionarySearch wide disabled />)).toContain('placeholder="答えを見てから使えます"');
    const phone = renderToStaticMarkup(<DictionarySearch disabled />);
    expect(phone).toContain('aria-disabled="true"');
    expect(phone).toContain('aria-label="答えを見てから使えます"');
  });

  it('sits in the header: between the logo and the buttons on wide screens, before the gacha button on phones', () => {
    const user = { email: 'a@b.c', user_metadata: {} };
    const wide = renderToStaticMarkup(<Header user={user} wide search={<DictionarySearch wide />} onHome={() => {}} />);
    expect(wide.indexOf('role="combobox"')).toBeGreaterThan(wide.indexOf('Poly'));
    const phone = renderToStaticMarkup(<Header user={user} search={<DictionarySearch />} onHome={() => {}} />);
    expect(phone.indexOf('aria-label="辞書"')).toBeLessThan(phone.indexOf('ガチャ'));
    expect(renderToStaticMarkup(<Header user={null} search={<DictionarySearch />} onHome={() => {}} />)).not.toContain('aria-label="辞書"');
  });
});

describe('Suggestions', () => {
  const list = (props) => renderToStaticMarkup(
    <Suggestions id="s" results={[EAT, READ]} active={1} query="e" loading={false} failed={false} onPick={() => {}} onHover={() => {}} {...props} />
  );

  it('lists English, part of speech and Japanese, with the active row marked', () => {
    const html = list();
    expect(html).toContain('role="listbox"');
    expect(html).toMatch(/id="s-0"[^>]*aria-selected="false"/);
    expect(html).toMatch(/id="s-1"[^>]*aria-selected="true"/);
    expect(html).toContain('食べる');
    expect(html).toContain('動詞');
  });

  it('says when loading, failed or nothing found', () => {
    expect(list({ loading: true })).toContain('読み込み中…');
    expect(list({ failed: true })).toContain('辞書を読み込めませんでした');
    expect(list({ results: [] })).toContain('見つかりませんでした');
    expect(list({ query: '' })).toBe('');
  });
});

describe('isImeKey (Enter that finishes Japanese input never picks)', () => {
  it('spots composing keys', () => {
    expect(isImeKey({ key: 'Enter', nativeEvent: { isComposing: true } })).toBe(true);
    expect(isImeKey({ key: 'Enter', keyCode: 229, nativeEvent: {} })).toBe(true);
    expect(isImeKey({ key: 'Enter', keyCode: 13, nativeEvent: {} }, true)).toBe(true);
    expect(isImeKey({ key: 'Enter', keyCode: 13, nativeEvent: { isComposing: false } })).toBe(false);
  });
});

describe('WordSheetBody', () => {
  const packs = [{ deck: { id: 'd1', name: 'Words 1' }, parts: ['New Horizon 1', 'Unit 1', 'Words 1'] }];
  const details = { word: { example_en: 'I eat bread.', example_ja: '私はパンを食べます。', audio_path: null }, deckIds: ['d1'], cards: [] };
  const body = (props) => renderToStaticMarkup(
    <WordSheetBody word={EAT} details={details} packs={packs} onOpenWord={() => {}} onOpenPack={() => {}} {...props} />
  );

  it('shows the meaning, example and the full path of each pack as a button', () => {
    const html = body();
    expect(html).toContain('食べる');
    expect(html).toContain('I <strong');
    expect(html).toContain('New Horizon 1 › Unit 1');
    expect(html).toMatch(/<button[^>]*>.*Words 1<\/span><\/button>/);
    expect(html).toContain('まだマイデッキにありません');
  });

  it('during a review the packs are plain text with a note (opening one would end the review)', () => {
    const html = body({ inReview: true });
    expect(html).toContain('復習中はパックを開けません');
    expect(html).not.toMatch(/<button[^>]*>.*Words 1<\/span><\/button>/);
  });

  it('shows the levels of my own cards', () => {
    const html = body({ details: { ...details, cards: [{ direction: 'en2jp', level: 3 }, { direction: 'jp2en', level: 8 }] } });
    expect(html).toContain('マイデッキにあります');
    expect(html).toContain('English to Japanese · Lv 3');
    expect(html).toContain('Japanese to English · Mastered');
  });

  it('shows the base form, other meanings and related words as chips', () => {
    const html = body({ baseWords: [READ], related: [{ id: 'x', english: 'exact', japanese: '正確な' }] });
    expect(html).toContain('もとの形');
    expect(html).toContain('同じ意味の単語');
    expect(html).toContain('exact');
  });

  it('says it is loading, or that it failed', () => {
    expect(body({ details: null })).toContain('読み込み中…');
    expect(body({ details: null, failed: true })).toContain('この単語のくわしい情報を読み込めませんでした');
  });

  it('English mode', () => {
    setLang('en');
    expect(body({ inReview: true })).toContain("open packs during a review");
  });
});
