// Tests for the Card Sets word list (shown before the drill). Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCards } from '../lib/drill';
import { toggleId } from '../lib/library';
import WordList, { WordRow } from './WordList';

const WORDS = [
  { id: 1, english: 'already', japanese: 'もう、すでに', example_en: 'She has already eaten lunch.', example_ja: '彼女はもう昼ご飯を食べました。' },
  { id: 2, english: 'herb', japanese: 'ハーブ', example_en: null, example_ja: null },
];
const SET = { id: 9, name: 'Part 1', cards: buildCards(WORDS) };
const [ALREADY, HERB] = SET.cards.filter((c) => c.direction === 'en2jp');

const renderList = () => renderToStaticMarkup(
  <WordList activeSet={SET} isAdded={false} saving={false} onAddDeck={() => {}} onStart={() => {}} />
);
const renderRow = (props) => renderToStaticMarkup(<WordRow word={ALREADY} hideJa={false} revealed={false} first onToggle={() => {}} {...props} />);

describe('WordList', () => {
  it('shows every word once, in deck order, with the count', () => {
    const html = renderList();
    // the word itself (a <span>), not the highlighted copy in the example (<strong>)
    expect(html.match(/>already<\/span>/g)).toHaveLength(1);
    expect(html.indexOf('>already</span>')).toBeLessThan(html.indexOf('>herb</span>'));
    expect(html).toContain('>2</span>語');
  });

  it('has the hide switch, the Add to My Cards button and the start button', () => {
    const html = renderList();
    expect(html).toMatch(/role="switch" aria-checked="false"/);
    expect(html).toContain('日本語をかくす');
    expect(html).toContain('マイカードに追加');
    expect(html).toContain('ドリルを始める (Start drill)');
  });
});

describe('WordRow', () => {
  it('shows the pair and the example with the word highlighted', () => {
    const html = renderRow();
    expect(html).toContain('もう、すでに');
    expect(html).toMatch(/<strong[^>]*>already<\/strong>/);
    expect(html).toContain('彼女はもう昼ご飯を食べました。');
    expect(html).not.toContain('<button');
  });

  it('shows just the pair for a word without an example', () => {
    const html = renderToStaticMarkup(<WordRow word={HERB} hideJa={false} revealed={false} first onToggle={() => {}} />);
    expect(html).toContain('herb');
    expect(html).toContain('ハーブ');
    expect(html).not.toContain('<strong');
  });

  it('covers the hidden Japanese word with a タップで表示 button and blurs the translation', () => {
    const html = renderRow({ hideJa: true, revealed: false });
    // only the Japanese part is a button, not the whole row
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toMatch(/<button[^>]*aria-label="日本語を見る: already"[^>]*min-height:44px/);
    expect(html).toContain('タップで表示');
    // the word keeps its space under the placeholder, so the row doesn't jump
    expect(html).toMatch(/<span aria-hidden="true" style="[^"]*visibility:hidden[^"]*">もう、すでに<\/span>/);
    expect(html).toMatch(/<span aria-hidden="true" style="[^"]*blur\(6px\)[^"]*">彼女はもう昼ご飯を食べました。<\/span>/);
    // English stays readable
    expect(html).toMatch(/<strong[^>]*>already<\/strong>/);
  });

  it('shows a revealed word as a button that hides it again', () => {
    const html = renderRow({ hideJa: true, revealed: true });
    expect(html).toMatch(/<button[^>]*aria-label="日本語をかくす: already"/);
    expect(html).toMatch(/<span style="[^"]*visibility:visible[^"]*">もう、すでに<\/span>/);
    expect(html).not.toContain('タップで表示');
    expect(html).not.toContain('blur(');
  });
});

describe('WordList sticky switch', () => {
  it('keeps the hide switch in a sticky bar with a solid background', () => {
    expect(renderList()).toMatch(/<div style="position:sticky;top:0;[^"]*background:var\(--bg\)[^"]*"><button role="switch"/);
  });
});

describe('toggleId', () => {
  it('adds a missing id and removes a present one, without changing the original', () => {
    const start = new Set(['a']);
    expect([...toggleId(start, 'b')]).toEqual(['a', 'b']);
    expect([...toggleId(start, 'a')]).toEqual([]);
    expect([...start]).toEqual(['a']);
  });
});
