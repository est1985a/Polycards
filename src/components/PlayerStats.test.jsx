// Tests for the player card on My Cards. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PlayerStats from './PlayerStats';

const stats = { playerRank: 3, currentPoints: 90, peakPoints: 100, levelCounts: [] };

describe('PlayerStats', () => {
  it('calls the player level "Rank", so it is not confused with card levels', () => {
    const html = renderToStaticMarkup(<PlayerStats stats={stats} />);
    expect(html).toContain('ランク');
    expect(html).toContain('>Rank 3<');
    expect(html).not.toContain('プレイヤーレベル');
    expect(html).not.toContain('Lv ');
  });

  it('shows the points still needed for the next rank', () => {
    const html = renderToStaticMarkup(<PlayerStats stats={stats} />);
    // Rank 4 starts at 180 peak points: 180 − 100 = 80.
    expect(html).toMatch(/80 pt → Rank 4</);
  });

  it('counts the spelling bonus toward the next rank and shows it', () => {
    // 100 peak + 30 bonus = 130 → still Rank 2 in the bar; Rank 3 needs 80, Rank 4 needs 180: 180 − 130 = 50.
    const html = renderToStaticMarkup(<PlayerStats stats={{ ...stats, bonusPoints: 30 }} />);
    expect(html).toMatch(/50 pt → Rank 4</);
    expect(html).toContain('スペルボーナス 30 pt');
  });

  it('shows no bonus line without a bonus', () => {
    expect(renderToStaticMarkup(<PlayerStats stats={stats} />)).not.toContain('スペルボーナス');
    expect(renderToStaticMarkup(<PlayerStats stats={{ ...stats, bonusPoints: 0 }} />)).not.toContain('スペルボーナス');
  });
});
