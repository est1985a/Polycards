// Tests for the Add to My Deck button and its word counts. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AddDeckButton from './AddDeckButton';

const render = (props) => renderToStaticMarkup(<AddDeckButton isAdded={false} saving={false} onAdd={() => {}} {...props} />);

describe('AddDeckButton', () => {
  it('is the plain button without counts', () => {
    expect(render()).toContain('>＋ マイデッキに追加</button>');
  });

  it('shows new and owned words', () => {
    expect(render({ counts: { newCount: 14, ownedCount: 6, allOwned: false } }))
      .toContain('＋ マイデッキに追加（新しい単語 14 · 所持済み 6）');
  });

  it('says when every word is owned', () => {
    expect(render({ counts: { newCount: 0, ownedCount: 20, allOwned: true } }))
      .toContain('＋ マイデッキに追加（ぜんぶ所持済み）');
  });

  it('shows 追加中... while saving, and the added note once added', () => {
    expect(render({ saving: true, counts: { newCount: 1, ownedCount: 1, allOwned: false } })).toContain('追加中...');
    const added = render({ isAdded: true, counts: { newCount: 1, ownedCount: 1, allOwned: false } });
    expect(added).toContain('✓ マイデッキに追加済み');
    expect(added).not.toContain('<button');
  });
});

describe('AddDeckButton primary (word list bottom bar)', () => {
  it('is a big filled button with the same labels', () => {
    const html = render({ primary: true, counts: { newCount: 14, ownedCount: 6, allOwned: false } });
    expect(html).toMatch(/<button style="[^"]*background:var\(--accent\)[^"]*min-height:56px[^"]*">＋ マイデッキに追加（新しい単語 14 · 所持済み 6）<\/button>/);
    expect(render({ primary: true, saving: true })).toContain('追加中...');
  });

  it('once added, shows the ✓ line and a マイデッキへ button', () => {
    const html = render({ primary: true, isAdded: true, onGoToMyDeck: () => {} });
    expect(html).toContain('✓ マイデッキに追加済み');
    expect(html).toContain('>マイデッキへ ›</button>');
    expect(html).not.toContain('disabled');
  });
});
