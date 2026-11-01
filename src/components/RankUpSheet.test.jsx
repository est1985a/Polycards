// Tests for the rank-up pop-up. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RankUpBox } from './RankUpSheet';
import { rankUpView } from '../lib/rankUp';
import { themes } from '../themes';
import { themeList } from '../lib/themeUnlocks';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const themeItems = themeList(
  [['midnight', 1], ['ryukoku', 5], ['snow', 10], ['pizza', 15], ['lagoon', 20], ['sakura', 30], ['matcha', 40], ['autumn', 50], ['neon', 60], ['galaxy', 70]]
    .map(([theme_key, unlock_level]) => ({ theme_key, unlock_level })),
  themes,
);
const specials = [80, 90, 100, 110, 120].map((r, i) => ({
  id: 100 + i, slug: `special-${['bronze', 'silver', 'gold', 'platinum', 'diamond'][i]}`, rarity: 'special',
  name_ja: 'ポリボ', name_en: `Polyvo ${i}`, image_url: null, unlock_rank: r, owned: false,
}));
const box = (rank, seen) => renderToStaticMarkup(
  <RankUpBox view={rankUpView({ rank, last_seen_rank: seen, specials }, themeItems)} onUseTheme={() => {}} onEquip={() => {}} onClose={() => {}} />,
);

describe('RankUpBox', () => {
  it('a plain rank-up: title, the new rank, and how many ranks to the next theme', () => {
    const html = box(12, 11);
    expect(html).toContain('ランクアップ！');
    expect(html).toContain('Rank 12');
    expect(html).toContain('3</span>ランクで次のごほうび');
    expect(html).toContain('data-reward="next"');
    expect(html).toContain('（ランク15）');
    expect(html).not.toContain('data-reward="theme"');
    expect(html).not.toContain('rankup-wide');
  });

  it('a theme rank: 新しいテーマをゲット！ with 今すぐ使う, two columns on wide screens', () => {
    const html = box(20, 19);
    expect(html).toContain('新しいテーマをゲット！');
    expect(html).toContain('data-reward="theme"');
    expect(html).toContain('今すぐ使う');
    expect(html).toContain('rankup-wide');
  });

  it('after Rank 70 the next reward is a Special Polyavatar, shown in full color', () => {
    const html = box(72, 71);
    expect(html).toContain('スペシャルポリアバター（ランク80）');
    expect(html).not.toContain('brightness(0)');
  });

  it('Rank 80: スペシャルポリアバターをゲット！ with つける', () => {
    const html = box(80, 79);
    expect(html).toContain('スペシャルポリアバターをゲット！');
    expect(html).toContain('data-reward="special"');
    expect(html).toContain('つける');
  });

  it('after Rank 120: congratulations only', () => {
    const html = box(121, 120);
    expect(html).toContain('data-reward="done"');
    expect(html).not.toContain('data-reward="next"');
  });

  it('English mode', () => {
    setLang('en');
    const html = box(13, 12);
    expect(html).toContain('Rank Up!');
    expect(html).toContain('2</span> more Ranks to your next reward');
    const one = box(14, 13);
    expect(one).toContain('1</span> more Rank to your next reward');
  });
});
