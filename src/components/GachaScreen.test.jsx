// Tests for the gacha screen. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GachaScreen, { GachaOdds, PullButton } from './GachaScreen';
import GachaMachine from './GachaMachine';
import { themes } from '../themes';

// The percentage shown in one rarity box.
const boxText = (html, rarity) => html.match(new RegExp(`data-rarity="${rarity}"[^>]*>(.*?)</div></div>`))[1];

describe('GachaOdds', () => {
  it('shows the odds from the status', () => {
    const html = renderToStaticMarkup(<GachaOdds odds={{ normal: 69, rare: 25, super_rare: 5, secret: 1 }} />);
    expect(boxText(html, 'normal')).toContain('69%');
    expect(boxText(html, 'rare')).toContain('25%');
    expect(boxText(html, 'super_rare')).toContain('5%');
    expect(boxText(html, 'secret')).toContain('1%');
    expect(html).toContain('出る確率');
    expect(html).toContain('同じポリアバターは出ません。毎回新しいポリアバター！');
  });

  it('follows the status when the odds change, and dims a rarity at 0%', () => {
    const html = renderToStaticMarkup(<GachaOdds odds={{ normal: 0, rare: 80.6, super_rare: 16.1, secret: 3.2 }} />);
    expect(boxText(html, 'rare')).toContain('80.6%');
    expect(html).toMatch(/data-rarity="normal" data-empty=""[^>]*opacity:0.4/);
    expect(html).not.toMatch(/data-rarity="rare" data-empty/);
  });
});

describe('PullButton', () => {
  it('is disabled with a note when there are no tickets', () => {
    const html = renderToStaticMarkup(<PullButton tickets={0} pulling={false} onPull={() => {}} />);
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).toContain('ガチャ券がありません');
  });

  it('is disabled while a pull is running', () => {
    const html = renderToStaticMarkup(<PullButton tickets={2} pulling onPull={() => {}} />);
    expect(html).toMatch(/<button[^>]*disabled/);
  });

  it('can be tapped when tickets are waiting', () => {
    const html = renderToStaticMarkup(<PullButton tickets={2} pulling={false} onPull={() => {}} />);
    expect(html).not.toMatch(/<button[^>]*disabled/);
    expect(html).toContain('ガチャを回す');
  });
});

describe('GachaScreen', () => {
  const status = {
    tickets: 2, owned: 4, total: 50, reviews_to_next_ticket: 30, reviews_per_ticket: 100,
    odds: { normal: 69, rare: 25, super_rare: 5, secret: 1 },
  };

  it('shows tickets, the collection link and progress to the next ticket', () => {
    for (const wide of [false, true]) {
      const html = renderToStaticMarkup(<GachaScreen status={status} pulling={false} wide={wide} />);
      expect(html).toContain('ポリアバター図鑑 4 / 50 →');
      expect(html).toContain('× 2');
      expect(html).toMatch(/次のガチャ券まで あと .*30.* レビュー/);
      expect(html).toContain('100 レビューごとに 1枚（1日1枚まで）');
      expect(html).toContain('aria-valuenow="70"');
      expect(html).not.toContain('今日のガチャ券はゲット！');
    }
  });

  it("says the next ticket comes tomorrow once today's ticket is earned, with a full bar", () => {
    for (const wide of [false, true]) {
      const capped = { ...status, next_ticket_tomorrow: true };
      const html = renderToStaticMarkup(<GachaScreen status={capped} pulling={false} wide={wide} />);
      expect(html).toContain('今日のガチャ券はゲット！ 次の券は明日もらえます');
      expect(html).not.toContain('次のガチャ券まで');
      expect(html).toContain('aria-valuenow="100"');
      expect(html).toContain('width:100%');
      expect(html).toContain('100 レビューごとに 1枚（1日1枚まで）');
    }
  });

  it('shows progress to the next spelling ticket, with no daily cap', () => {
    const spelled = { ...status, spelling_points: 120, spelling_to_next_ticket: 30, spelling_points_per_ticket: 150 };
    for (const next_ticket_tomorrow of [false, true]) {
      const html = renderToStaticMarkup(<GachaScreen status={{ ...spelled, next_ticket_tomorrow }} pulling={false} />);
      expect(html).toMatch(/スペルのガチャ券まで あと .*30.* pt/);
      expect(html).toContain('スペルボーナス 150 ptごとに 1枚');
      expect(html).toContain('aria-valuemax="150" aria-valuenow="120"');
      expect(html).toContain('width:80%');
    }
  });
});

describe('GachaMachine', () => {
  it('is always drawn in Midnight colors, whatever the theme', () => {
    const html = renderToStaticMarkup(<GachaMachine />);
    expect(html).toMatch(new RegExp(`<svg[^>]*style="[^"]*--accent:${themes.midnight.colors.accent};`));
    expect(html).toContain(`--gold:${themes.midnight.colors.gold}`);
  });
});
