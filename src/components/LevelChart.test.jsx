// Tests for the level bar chart on My Cards. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LevelChart from './LevelChart';

// Bar heights in px, Lv0 to Lv7, read from the rendered page.
function barHeights(counts) {
  const html = renderToStaticMarkup(<LevelChart counts={counts} />);
  return [...html.matchAll(/data-level="(\d)" style="[^"]*height:(\d+)(?:px)?[;"]/g)].map((m) => Number(m[2]));
}

describe('LevelChart', () => {
  it('shows all 8 levels and the total', () => {
    const html = renderToStaticMarkup(<LevelChart counts={[100, 50, 40, 30, 20, 30, 28, 10]} />);
    for (let i = 0; i < 8; i++) expect(html).toContain(`Lv${i}</span>`);
    expect(html).toContain('>308</span>枚');
  });

  it('makes bar heights proportional, with the biggest count the tallest', () => {
    const h = barHeights([100, 50, 0, 0, 0, 0, 0, 0]);
    expect(h).toHaveLength(8);
    expect(h[0]).toBe(130);
    expect(h[1]).toBe(65);
  });

  it('keeps a bar with at least one card 8 px tall, and an empty level at 0', () => {
    const h = barHeights([1000, 1, 0, 0, 0, 0, 0, 0]);
    expect(h[1]).toBe(8);
    expect(h[2]).toBe(0);
  });

  it('works when there are no cards yet', () => {
    expect(barHeights([0, 0, 0, 0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
