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

  it('has the hide switch, the Add to My Deck button and the start button', () => {
    const html = renderList();
    expect(html).toMatch(/role="switch" aria-checked="false"/);
    expect(html).toContain('日本語をかくす');
    expect(html).toContain('マイデッキに追加');
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
  it('keeps the hide switch in a sticky frosted bar (surface at 85% plus a blur)', () => {
    const html = renderList();
    expect(html).toMatch(/<div style="position:sticky;top:0;[^"]*"><button role="switch"/);
    const bar = html.match(/<div style="(position:sticky;top:0;[^"]*)"><button role="switch"/)[1];
    expect(bar).toContain('background:color-mix(in srgb, var(--surface) 85%, transparent)');
    expect(bar).toContain('backdrop-filter:blur(10px)');
    expect(bar).toContain('-webkit-backdrop-filter:blur(10px)');
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

describe('WordRow speaker (発音を聞く)', () => {
  it('shows a speaker after the English word only when the browser can speak', () => {
    expect(renderRow({ speech: { slow: false } })).toMatch(/>already<\/span><button[^>]*aria-label="発音を聞く"/);
    expect(renderRow()).not.toContain('発音を聞く');
  });
});

describe('owned words (所持済み) before adding', () => {
  const owned = (props) => renderToStaticMarkup(
    <WordList activeSet={{ ...SET, ownedWordIds: [1] }} isAdded={false} saving={false} onAddDeck={() => {}} onStart={() => {}} {...props} />
  );
  const tags = (html) => (html.match(/>所持済み<\/span>/g) || []).length;

  it('tags only the owned words, right after the English word', () => {
    const html = owned();
    expect(tags(html)).toBe(1);
    const tagAt = html.indexOf('>所持済み</span>');
    expect(tagAt).toBeGreaterThan(html.indexOf('>already</span>'));
    expect(tagAt).toBeLessThan(html.indexOf('>herb</span>'));
  });

  it('shows the counts on the add button', () => {
    expect(owned()).toContain('＋ マイデッキに追加（新しい単語 1 · 所持済み 1）');
    expect(renderToStaticMarkup(
      <WordList activeSet={{ ...SET, ownedWordIds: [1, 2] }} isAdded={false} saving={false} onAddDeck={() => {}} onStart={() => {}} />
    )).toContain('＋ マイデッキに追加（ぜんぶ所持済み）');
  });

  it('hides every tag once the deck is added', () => {
    const html = owned({ isAdded: true, activeSet: { ...SET, ownedWordIds: [1, 2] } });
    expect(tags(html)).toBe(0);
    expect(html).toContain('✓ マイデッキに追加済み');
  });

  it('shows no tags and the plain button when the check failed or nothing is owned', () => {
    for (const ownedWordIds of [null, undefined, []]) {
      const html = owned({ activeSet: { ...SET, ownedWordIds } });
      expect(tags(html)).toBe(0);
      expect(html).toContain('>＋ マイデッキに追加</button>');
    }
  });

  it('keeps the tap-to-reveal button when the Japanese is hidden', () => {
    const html = renderRow({ owned: true, hideJa: true });
    expect(html).toContain('>所持済み</span>');
    expect(html).toContain('タップで表示');
    expect(html).toMatch(/<button[^>]*aria-label="日本語を見る: already"/);
  });
});

describe('品詞 chip in the word list', () => {
  const CHIP = 'aria-label="品詞：副詞（説明を見る）"';
  it('comes after the English word (and the speaker), before 所持済み', () => {
    const html = renderRow({ word: { ...ALREADY, pos: 'adverb' }, speech: { slow: false }, owned: true });
    expect(html).toContain(CHIP);
    expect(html.indexOf('>already<')).toBeLessThan(html.indexOf('発音を聞く'));
    expect(html.indexOf('発音を聞く')).toBeLessThan(html.indexOf(CHIP));
    expect(html.indexOf(CHIP)).toBeLessThan(html.indexOf('所持済み'));
  });

  it('nothing when the word has no part of speech', () => {
    expect(renderRow()).not.toContain('品詞');
  });
});
