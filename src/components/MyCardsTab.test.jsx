// Tests for the review button on My Cards. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MyCardsTab, { ReviewButton, TypingModeSwitch, AboutButton } from './MyCardsTab';
import { extraDueTotal } from '../lib/srs';

const render = (dueCount) => renderToStaticMarkup(<ReviewButton dueCount={dueCount} loading={false} onReview={() => {}} />);

describe('review button', () => {
  it('shows this round (20) in the pill and the full total under the label when more are due', () => {
    const html = render(45);
    expect(html).toContain('>20枚</span>');
    expect(html).toMatch(/全<span[^>]*>45<\/span>枚の復習があります/);
  });

  it('writes big totals with a comma', () => {
    expect(render(1200)).toMatch(/全<span[^>]*>1,200<\/span>枚/);
  });

  it('shows no total line when 20 or fewer are due', () => {
    expect(render(20)).toContain('>20枚</span>');
    expect(render(20)).not.toContain('の復習があります');
    expect(render(5)).toContain('>5枚</span>');
    expect(render(5)).not.toContain('の復習があります');
  });

  it('shows no total line when nothing is due', () => {
    const html = render(0);
    expect(html).toContain('復習するカードはありません');
    expect(html).not.toContain('の復習があります');
  });

  it('returns the total only above the session size', () => {
    expect(extraDueTotal(21)).toBe(21);
    expect(extraDueTotal(20)).toBeNull();
    expect(extraDueTotal(0)).toBeNull();
  });
});

describe('wide screens', () => {
  const tab = (wide) => renderToStaticMarkup(
    <MyCardsTab
      decks={[{ id: 1, name: 'Unit 1' }, { id: 2, name: 'Unit 2' }]} dueRows={[]} nextReview={null} stats={null}
      onReview={() => {}} onOpenPlan={() => {}} onRemove={() => {}} onOpenMastered={() => {}} loading={false} removingDeckId={null}
      wide={wide}
    />
  );

  it('uses two columns, with the decks in a 2-column grid', () => {
    const html = tab(true);
    expect(html).toContain('grid-template-columns:440px minmax(0, 1fr)');
    expect(html).toContain('grid-template-columns:repeat(2, minmax(0, 1fr))');
    expect(html).toContain('min-height:76px');
  });

  it('keeps one column on phones', () => {
    const html = tab(false);
    expect(html).not.toContain('grid-template-columns');
    expect(html).toContain('min-height:64px');
  });
});

describe('next review line (nothing due)', () => {
  const line = (nextReview, dueCount = 0) => renderToStaticMarkup(
    <ReviewButton dueCount={dueCount} loading={false} onReview={() => {}} nextReview={nextReview} onOpenPlan={() => {}} />
  );
  const soon = { text: '次の復習：2時間後に 7枚', tappable: true };

  it('shows the line under 復習するカードはありません, and the button opens the plan', () => {
    const html = line(soon);
    expect(html).toContain('復習するカードはありません');
    expect(html).toContain('次の復習：2時間後に 7枚');
    expect(html).toContain('›');
    expect(html).not.toContain('disabled');
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it('shows the line but cannot be tapped when the review is after tomorrow', () => {
    const html = line({ text: '次の復習：10月20日に 7枚', tappable: false });
    expect(html).toContain('次の復習：10月20日に 7枚');
    expect(html).not.toContain('›');
    expect(html).toContain('disabled');
  });

  it('looks like before with no next review (no cards, or all Mastered)', () => {
    expect(line(null)).toBe(render(0));
  });

  it('only shows the line when nothing is due', () => {
    expect(line(soon, 5)).not.toContain('次の復習');
  });
});

describe('typing mode switch', () => {
  const html = (on) => renderToStaticMarkup(<TypingModeSwitch on={on} onChange={() => {}} />);

  it('shows the label and the note', () => {
    expect(html(false)).toContain('スペル入力（日本語 → English）');
    expect(html(false)).toContain('英語をタイプして答えます。正しいスペルで +1 pt');
  });

  it('is a switch that shows on / off', () => {
    expect(html(false)).toContain('role="switch"');
    expect(html(false)).toContain('aria-checked="false"');
    expect(html(true)).toContain('aria-checked="true"');
  });
});

describe('What is Polycards? button', () => {
  it('is a pill with an accent outline, accent-colored text and both-language aria-label', () => {
    const html = renderToStaticMarkup(<AboutButton onOpen={() => {}} />);
    expect(html).toContain('aria-label="What is Polycards? / ポリカードのしくみ"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('border:2px solid var(--accent)');
    expect(html).toContain('color:var(--accentText)');
    expect(html).toContain('What is Polycards?</button>');
  });

  it('sits on the My Cards dashboard', () => {
    const html = renderToStaticMarkup(<MyCardsTab decks={[]} dueRows={[]} stats={null} onReview={() => {}} />);
    expect(html).toContain('ポリカードのしくみ');
  });
});
