// Tests for the pack opening after Add to My Cards. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PackOpening, { PackSummaryPanel } from './PackOpening';
import { packSummary, PACK_SHOWN } from '../lib/packOpening';

const words = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i}`, en: `word${i}` }));
const panel = (summary) => renderToStaticMarkup(
  <PackSummaryPanel summary={summary} onClose={() => {}} onReview={() => {}} onGoToMyDeck={() => {}} />
);

describe('PackSummaryPanel buttons', () => {
  it('offers 今すぐ復習する and あとで when words were added', () => {
    const html = panel(packSummary(words(4), ['w1']));
    expect(html).toContain('>今すぐ復習する</button>');
    expect(html).toContain('>あとで</button>');
    expect(html.indexOf('今すぐ復習する')).toBeLessThan(html.indexOf('あとで'));
    expect(html).not.toContain('マイデッキへ<');
  });

  it('also offers the review when the owned check failed', () => {
    expect(panel(packSummary(words(3), null))).toContain('>今すぐ復習する</button>');
  });

  it('offers マイデッキへ instead when every word was already owned', () => {
    const html = panel(packSummary(words(2), ['w0', 'w1']));
    expect(html).toContain('>マイデッキへ</button>');
    expect(html).toContain('>あとで</button>');
    expect(html).not.toContain('今すぐ復習する');
  });

  it('shows only あとで when there is nothing to do next', () => {
    const html = renderToStaticMarkup(<PackSummaryPanel summary={packSummary(words(2), [])} onClose={() => {}} />);
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('>あとで</button>');
  });
});

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
