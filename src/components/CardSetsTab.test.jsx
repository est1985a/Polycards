// Tests for the Card Sets hub and its list screens. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { shapeLibrary } from '../lib/library';
import CardSetsTab from './CardSetsTab';

const TEXTBOOKS = shapeLibrary([
  { id: 1, name: 'Power On 1', school_level: 'HS', units: [{ id: 10, name: 'Lesson 5', unit_order: 5, decks: [{ id: 100, name: '5-1', deck_words: [{ count: 10 }] }] }] },
  { id: 2, name: 'New Horizon 3', school_level: 'JHS', units: [
    { id: 21, name: 'Unit 2', unit_order: 2, decks: [] },
    { id: 20, name: 'Unit 1', unit_order: 1, decks: [
      { id: 201, name: 'Part 1', deck_words: [{ count: 5 }] },
      { id: 202, name: 'Part 2', deck_words: [{ count: 3 }] },
    ] },
  ] },
]);

const render = (path, props) => renderToStaticMarkup(
  <CardSetsTab textbooks={TEXTBOOKS} loading={false} path={path} onNavigate={() => {}} onOpenDeck={() => {}} disabled={false} {...props} />
);
// Text content in order, without tags.
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('CardSetsTab', () => {
  it('hub: title, subtitle and the two big cards', () => {
    const t = text(render({ screen: 'hub' }));
    for (const s of ['Card Sets', 'カードセット', '学びたいセットをえらんで、マイカードに追加しよう。',
      'Textbooks', '教科書から探す', 'Tests &amp; Themes', 'テスト・テーマ別']) expect(t).toContain(s);
    expect(t).not.toContain('← ');
  });

  it('textbooks: back button to the hub, JHS by default, no school-level subtitle', () => {
    const t = text(render({ screen: 'textbooks' }));
    expect(t).toContain('← Card Sets');
    expect(t).toContain('New Horizon 3');
    expect(t).not.toContain('Power On 1');
    expect(t).toContain('2 ユニット');
    // 中学 · JHS appears once: in the switch, not under the row
    expect(t.match(/中学 · JHS/g)).toHaveLength(1);
  });

  it('textbooks: the switch shows JHS and HS, with aria-pressed on the selected one', () => {
    const html = render({ screen: 'textbooks', level: 'HS' });
    expect(html.match(/aria-pressed/g)).toHaveLength(2);
    expect(html).toMatch(/aria-pressed="false"[^>]*>中学 · JHS</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>高校 · HS</);
    expect(html).not.toContain('>Other<');
  });

  it('textbooks: only the selected level is listed', () => {
    const t = text(render({ screen: 'textbooks', level: 'HS' }));
    expect(t).toContain('Power On 1');
    expect(t).not.toContain('New Horizon 3');
    expect(t).toContain('1 ユニット');
  });

  it('textbooks: Other appears only when an Other textbook exists', () => {
    const withOther = [...TEXTBOOKS, ...shapeLibrary([{ id: 3, name: 'Extra Words', school_level: 'Other', units: [] }])];
    const html = render({ screen: 'textbooks', level: 'Other' }, { textbooks: withOther });
    expect(html.match(/aria-pressed/g)).toHaveLength(3);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Other</);
    expect(text(html)).toContain('Extra Words');
    expect(text(html)).not.toContain('New Horizon 3');
  });

  it('textbooks: a saved Other level with no Other textbooks shows JHS', () => {
    const html = render({ screen: 'textbooks', level: 'Other' });
    expect(html).toMatch(/aria-pressed="true"[^>]*>中学 · JHS</);
    expect(text(html)).toContain('New Horizon 3');
  });

  it('textbooks: a level with no textbooks says so', () => {
    const t = text(render({ screen: 'textbooks', level: 'HS' }, { textbooks: TEXTBOOKS.filter((tb) => tb.school_level === 'JHS') }));
    expect(t).toContain('まだ教科書がありません');
  });

  it('units: in unit_order, back to Textbooks, deck counts', () => {
    const t = text(render({ screen: 'units', textbookId: 2 }));
    expect(t).toContain('← Textbooks');
    expect(t.indexOf('Unit 1')).toBeLessThan(t.indexOf('Unit 2'));
    expect(t).toContain('2 デッキ');
    expect(t).toContain('0 デッキ');
  });

  it('decks: word counts, back to the textbook', () => {
    const t = text(render({ screen: 'decks', textbookId: 2, unitId: 20 }));
    expect(t).toContain('← New Horizon 3');
    expect(t).toContain('Part 1');
    expect(t).toContain('5 語');
    expect(t).toContain('3 語');
  });

  it('decks: an empty unit says so', () => {
    expect(text(render({ screen: 'decks', textbookId: 2, unitId: 21 }))).toContain('まだデッキがありません');
  });

  it('decks: rows are disabled while a deck is loading', () => {
    const html = render({ screen: 'decks', textbookId: 2, unitId: 20 }, { disabled: true });
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it('tests: coming soon with a back button', () => {
    const t = text(render({ screen: 'tests' }));
    expect(t).toContain('← Card Sets');
    expect(t).toContain('準備中 — Coming soon');
  });

  it('a textbook that no longer exists falls back to the hub', () => {
    expect(text(render({ screen: 'units', textbookId: 99 }))).toContain('学びたいセットをえらんで');
  });

  it('shows loading only before the library first arrives', () => {
    expect(render({ screen: 'textbooks' }, { textbooks: [], loading: true })).toContain('Loading library');
    expect(render({ screen: 'textbooks' }, { loading: true })).not.toContain('Loading library');
  });
});
