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
});
