// Tests for the player card on My Cards. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PlayerStats from './PlayerStats';

const stats = { playerRank: 4, peakPoints: 100, levelCounts: [] };

describe('PlayerStats', () => {
  it('calls the player level "Rank", so it is not confused with card levels', () => {
    const html = renderToStaticMarkup(<PlayerStats stats={stats} />);
    expect(html).toContain('ランク');
    expect(html).toContain('>Rank 4<');
    expect(html).not.toContain('プレイヤーレベル');
    expect(html).not.toContain('Lv ');
  });

  it('shows the points still needed for the next rank', () => {
    const html = renderToStaticMarkup(<PlayerStats stats={stats} />);
    // 100 EXP is Rank 4 (90–159); Rank 5 starts at 10 × 4² = 160: 160 − 100 = 60.
    expect(html).toMatch(/60 EXP → Rank 5</);
  });

  it('counts the spelling bonus toward the next rank and shows it', () => {
    // 100 peak + 30 bonus = 130, still Rank 4; Rank 5 needs 160: 160 − 130 = 30.
    const html = renderToStaticMarkup(<PlayerStats stats={{ ...stats, bonusPoints: 30 }} />);
    expect(html).toMatch(/30 EXP → Rank 5</);
    expect(html).toContain('スペルボーナス 30 EXP');
  });

  it('shows peak + bonus as the big EXP number, never the (lower) current points, and no best line', () => {
    const html = renderToStaticMarkup(<PlayerStats stats={stats} />);
    expect(html).toContain('>100 EXP<');
    expect(html).not.toContain('>90 EXP<');
    expect(html).not.toContain('ベスト');
    expect(renderToStaticMarkup(<PlayerStats stats={{ ...stats, bonusPoints: 30 }} />)).toContain('>130 EXP<');
  });

  it('shows no bonus line without a bonus', () => {
    expect(renderToStaticMarkup(<PlayerStats stats={stats} />)).not.toContain('スペルボーナス');
    expect(renderToStaticMarkup(<PlayerStats stats={{ ...stats, bonusPoints: 0 }} />)).not.toContain('スペルボーナス');
  });

  it('the avatar is a button that opens the avatar collection', () => {
    for (const wide of [false, true]) {
      const html = renderToStaticMarkup(<PlayerStats stats={stats} wide={wide} onOpenCollection={() => {}} />);
      expect(html).toMatch(/<button type="button" aria-label="ポリアバター図鑑を開く" class="avatar-button"/);
      expect(html).toContain(wide ? 'width:128px;height:128px' : 'width:104px;height:104px');
    }
  });

  it('opens the stats page from the card (role="button", no button inside a button) and shows the hint', () => {
    const html = renderToStaticMarkup(<PlayerStats stats={stats} onOpenStats={() => {}} onOpenCollection={() => {}} />);
    expect(html).toMatch(/^<div role="button" tabindex="0" aria-label="学習の記録を見る"/);
    expect(html).toMatch(/color:var\(--muted\)[^>]*>記録を見る ›</);
    expect(html).toContain('aria-label="ポリアバター図鑑を開く"');
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it('is a plain card without onOpenStats', () => {
    const html = renderToStaticMarkup(<PlayerStats stats={stats} />);
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('記録を見る');
  });
});
