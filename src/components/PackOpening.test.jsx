// Tests for the pack opening after Add to My Cards. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PackOpening, { PackSummaryPanel } from './PackOpening';
import { packSummary, PACK_SHOWN } from '../lib/packOpening';

const words = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, en: `word${i}` }));
const panel = (summary) => renderToStaticMarkup(<PackSummaryPanel summary={summary} onClose={() => {}} />);

describe('PackSummaryPanel', () => {
  it('shows how many words were added and lists the ones already owned', () => {
    const html = panel(packSummary(words(5), ['w1', 'w3']));
    expect(html).toContain('+3');
    expect(html).toContain('3語をマイデッキに追加しました！');
    expect(html).toContain('2語はもう持っているので、追加しませんでした。');
    expect(html).toContain('もう持っている単語');
    expect(html).toContain('>word1<');
    expect(html).toContain('>word3<');
    expect(html).not.toContain('>word0<');
  });

  it('has no owned section when every word is new', () => {
    const html = panel(packSummary(words(4), []));
    expect(html).toContain('4語をマイデッキに追加しました！');
    expect(html).not.toContain('もう持っている');
  });

  it('says so when every word is already owned', () => {
    const html = panel(packSummary(words(3), ['w0', 'w1', 'w2']));
    expect(html).toContain('このパックの単語は、ぜんぶもう持っています！');
    expect(html).toContain('同じ単語が2回追加されることはありません。');
    expect(html).not.toContain('data-testid="pack-new-count"');
  });

  it('shows a plain line when the owned check failed', () => {
    const html = panel(packSummary(words(3), null));
    expect(html).toContain('マイデッキに追加しました！');
    expect(html).not.toContain('data-testid="pack-new-count"');
  });
});

describe('PackOpening', () => {
  it('starts with the pack and at most the shown number of cards', () => {
    const html = renderToStaticMarkup(<PackOpening summary={packSummary(words(20), [])} onClose={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('タップでスキップ');
    expect(html.match(/class="pack-card"/g)).toHaveLength(PACK_SHOWN);
    expect(html).toContain('pack-shake');
  });
});
