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
