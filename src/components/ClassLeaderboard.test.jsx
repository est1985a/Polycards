// Tests for the weekly class leaderboard (クラス tab and the teacher's ランキング view). Static render.
// Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassLeaderboard, { MyPlace, LastWeek } from './ClassLeaderboard';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const av = (rarity) => ({ slug: 'shiba', rarity, image_url: null });
const BOARD = {
  enabled: true,
  top: [
    { rank: 1, nickname: 'Sora', reviews: 120, is_me: false, avatar: av('secret') },
    { rank: 2, nickname: 'Aiden', reviews: 80, is_me: true, avatar: av('rare') },
    { rank: 2, nickname: 'Momo', reviews: 80, is_me: false, avatar: null },
    { rank: 4, nickname: 'Ken', reviews: 1, is_me: false, avatar: av('normal') },
  ],
  me: { nickname: 'Aiden', rank: 2, reviews: 80 },
  last_week: [{ rank: 1, nickname: 'Momo', reviews: 50, is_me: false, avatar: av('normal') }],
};

describe('ClassLeaderboard', () => {
  it('shows ranks with ties (1, 2, 2, 4), nicknames and reviews', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={BOARD} />);
    expect(h).toContain('今週のランキング');
    expect(h).toContain('月曜日にリセット');
    expect([...h.matchAll(/aria-label="(\d+)位"/g)].map((m) => m[1])).toEqual(['1', '2', '2', '4', '1']);
    expect(h).toContain('Sora');
    expect(h).toContain('120回');
    expect(h).toContain('あなた');
  });

  it('pictures get the generic label, never an avatar name', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={BOARD} />);
    expect(h).toContain('aria-label="ポリアバター"');
    expect(h).not.toMatch(/Shiba|柴犬/);
  });

  it('shows my place, or the encouraging line with 0 reviews', () => {
    expect(renderToStaticMarkup(<MyPlace me={{ nickname: 'A', rank: 14, reviews: 32 }} />)).toMatch(/あなたは <span[^>]*>14<\/span>位（<span[^>]*>32<\/span>回）/);
    expect(renderToStaticMarkup(<MyPlace me={{ nickname: 'A', rank: null, reviews: 0 }} />)).toContain('今週はまだ0回。1回でもランキングに入れます！');
    expect(renderToStaticMarkup(<MyPlace me={null} />)).toBe('');
  });

  it('the teacher view has no "my place"', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={{ ...BOARD, me: null }} viewer="teacher" />);
    expect(h).not.toContain('あなたは');
    expect(h).not.toContain('今週はまだ0回');
  });

  it('an empty week, and no last-week strip when last week was empty', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={{ enabled: true, top: [], me: { rank: null, reviews: 0 }, last_week: [] }} />);
    expect(h).toContain('今週はまだだれも復習していません');
    expect(h).not.toContain('先週のトップ3');
    expect(renderToStaticMarkup(<LastWeek rows={BOARD.last_week} />)).toContain('先週のトップ3');
  });

  it('works in English (plurals)', () => {
    setLang('en');
    const h = renderToStaticMarkup(<ClassLeaderboard board={BOARD} />);
    expect(h).toContain("This week&#x27;s ranking");
    expect(h).toContain('120 reviews');
    expect(h).toContain('1 review<');
    expect(renderToStaticMarkup(<MyPlace me={{ rank: 3, reviews: 1 }} />)).toMatch(/You are #<span[^>]*>3<\/span> \(<span[^>]*>1<\/span> review\)/);
  });
});

// Ranking modes (polycards-class-ranking-modes.sql): typing and handwriting boards, reviews small.
const row = (rank, nickname, count, is_me = false) => ({ rank, nickname, count, is_me, avatar: null });
const BOARDS = {
  typing: { top: [row(1, 'Sora', 12), row(2, 'Aiden', 7, true)], more: 0, me: { rank: 2, count: 7 }, last_week: [row(1, 'Momo', 9)] },
  handwriting: {
    top: [1, 2, 3, 4, 5, 6, 7].map((i) => row(1, `Tie${i}`, 3)), more: 2, me: { rank: null, count: 0 }, last_week: [],
  },
  reviews: { top: [row(1, 'Ken', 200), row(2, 'Aiden', 90, true), row(3, 'Sora', 40)], more: 0, me: { rank: 2, count: 90 } },
};
const MODE_BOARD = { ...BOARD, boards: BOARDS };
const section = (h, kind) => h.match(new RegExp(`data-board="${kind}"[^]*?</section>(?=<section data-board|</div></section>$)`))?.[0] ?? '';

describe('ClassLeaderboard: typing / handwriting boards', () => {
  it('shows the typing and handwriting boards and a small reviews panel, in that order', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={MODE_BOARD} />);
    const order = [...h.matchAll(/data-board="(\w+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['typing', 'handwriting', 'reviews']);
    expect(h).toContain('タイピング');
    expect(h).toContain('正しいスペルでタイプした数');
    expect(h).toContain('手書き');
    expect(h).toContain('復習回数');
    expect(section(h, 'typing')).toContain('12語');
    expect(section(h, 'reviews')).toContain('200回');
    expect(h).not.toContain('120回'); // the old reviews board isn't drawn
  });

  it('shows ＋N人 同点 only when the database left tied students out', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={MODE_BOARD} />);
    expect(section(h, 'handwriting')).toContain('＋2人 同点');
    expect(section(h, 'typing')).not.toContain('同点');
    expect([...section(h, 'handwriting').matchAll(/data-board-row/g)]).toHaveLength(7);
  });

  it('my place on each board (students), none for the teacher', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={MODE_BOARD} />);
    expect(section(h, 'typing')).toMatch(/あなたは <span[^>]*>2<\/span>位（<span[^>]*>7<\/span>語）/);
    expect(section(h, 'reviews')).toContain('あなた：2位（90回）');
    const teacher = renderToStaticMarkup(<ClassLeaderboard board={{ ...MODE_BOARD, me: null }} viewer="teacher" />);
    expect(teacher).not.toContain('あなたは');
    expect(teacher).not.toContain('あなた：');
    expect(teacher).not.toContain('今週はまだ0語');
  });

  it('the zero line names the real answer-mode switch (off by default)', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={MODE_BOARD} />);
    expect(section(h, 'handwriting')).toContain('今週はまだ0語。「マイデッキ」の「答え方（日本語 → English）」で「手書き」をえらんで');
    const zero = { ...BOARDS, typing: { ...BOARDS.typing, me: { rank: null, count: 0 } } };
    const z = renderToStaticMarkup(<ClassLeaderboard board={{ ...MODE_BOARD, boards: zero }} />);
    expect(section(z, 'typing')).toContain('「マイデッキ」の「答え方（日本語 → English）」で「タイピング」をえらんで');
    expect(section(z, 'typing')).toContain('復習画面の右上でも切りかえられます');
    setLang('en');
    const en = renderToStaticMarkup(<ClassLeaderboard board={{ ...MODE_BOARD, boards: zero }} />);
    expect(en).toContain('On My Deck, choose &quot;Typing&quot; under &quot;How to answer (Japanese → English)&quot;');
    expect(en).toContain('7 words');
    expect(en).toContain('+2 more tied');
  });

  it('each board has its own last-week strip (not the reviews panel)', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={MODE_BOARD} />);
    expect(section(h, 'typing')).toContain('先週のトップ3');
    expect(section(h, 'typing')).toContain('9語');
    expect(section(h, 'handwriting')).not.toContain('先週のトップ3');
    expect(section(h, 'reviews')).not.toContain('先週のトップ3');
  });

  it('empty boards', () => {
    const empty = { top: [], more: 0, me: { rank: null, count: 0 }, last_week: [] };
    const h = renderToStaticMarkup(<ClassLeaderboard board={{ enabled: true, boards: { typing: empty, handwriting: empty, reviews: empty } }} />);
    expect(h).toContain('今週はまだだれもいません。最初の1人になろう！');
    expect(h).toContain('まだだれもいません');
    expect(h).toContain('あなた：今週はまだ0回');
  });

  it('handwriting switched off: the typing board and the reviews panel only', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={MODE_BOARD} wide handwritingEnabled={false} />);
    expect([...h.matchAll(/data-board="(\w+)"/g)].map((m) => m[1])).toEqual(['typing', 'reviews']);
    expect(h).toMatch(/data-board-grid=""[^>]*grid-template-columns:minmax\(0, 1fr\) 220px/);
    const both = renderToStaticMarkup(<ClassLeaderboard board={MODE_BOARD} wide />);
    expect(both).toMatch(/data-board-grid=""[^>]*grid-template-columns:minmax\(0, 1fr\) minmax\(0, 1fr\);/);
    expect(both).toMatch(/data-board="reviews"[^>]*grid-column:1 \/ -1/); // a strip under both boards
  });

  it('without the new SQL (boards null) the old reviews board is shown', () => {
    const h = renderToStaticMarkup(<ClassLeaderboard board={{ ...BOARD, boards: null }} />);
    expect(h).toContain('120回');
    expect(h).not.toContain('data-board="typing"');
  });
});
