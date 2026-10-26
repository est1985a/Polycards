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
