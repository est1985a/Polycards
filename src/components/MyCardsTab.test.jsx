// Tests for the review button on My Cards. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MyCardsTab, { ReviewButton, AnswerModeSwitch, AboutButton } from './MyCardsTab';
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

describe('review button with another 1回の枚数', () => {
  const renderSize = (dueCount, sessionSize) =>
    renderToStaticMarkup(<ReviewButton dueCount={dueCount} loading={false} onReview={() => {}} sessionSize={sessionSize} />);

  it('caps the pill at the chosen size and shows the total only above it', () => {
    expect(renderSize(15, 10)).toContain('>10枚</span>');
    expect(renderSize(15, 10)).toMatch(/全<span[^>]*>15<\/span>枚/);
    expect(renderSize(25, 30)).toContain('>25枚</span>');
    expect(renderSize(25, 30)).not.toContain('の復習があります');
  });

  it('extraDueTotal uses the chosen size', () => {
    expect(extraDueTotal(15, 10)).toBe(15);
    expect(extraDueTotal(25, 30)).toBeNull();
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

describe('answer mode switch なし / タイピング / 手書き', () => {
  const html = (mode, handwritingEnabled = true) =>
    renderToStaticMarkup(<AnswerModeSwitch mode={mode} onChange={() => {}} handwritingEnabled={handwritingEnabled} />);

  it('shows the label and the three choices', () => {
    const h = html('off');
    expect(h).toContain('答え方（日本語 → English）');
    expect(h).toContain('>なし</button>');
    expect(h).toContain('>タイピング</button>');
    expect(h).toContain('>手書き</button>');
  });

  it('marks the chosen one and shows its note', () => {
    expect(html('off')).toMatch(/aria-pressed="true"[^>]*>なし</);
    expect(html('typing')).toMatch(/aria-pressed="true"[^>]*>タイピング</);
    expect(html('typing')).toContain('英語をタイプして答えます。正しいスペルで +1 EXP');
    expect(html('handwriting')).toMatch(/aria-pressed="true"[^>]*>手書き</);
    expect(html('handwriting')).toContain('Apple Pencil');
  });

  it('hides 手書き when handwriting is switched off', () => {
    expect(html('off', false)).not.toContain('手書き');
    expect(html('handwriting', false)).toMatch(/aria-pressed="true"[^>]*>なし</);
  });

  it('is on My Cards', () => {
    const h = renderToStaticMarkup(<MyCardsTab decks={[]} dueRows={[]} stats={null} onReview={() => {}} answerMode="typing" />);
    expect(h).toContain('答え方（日本語 → English）');
  });
});

describe('What is Polycards? button', () => {
  it('is a pill with an accent outline, accent-colored text and an aria-label', () => {
    const html = renderToStaticMarkup(<AboutButton onOpen={() => {}} />);
    expect(html).toContain('aria-label="Polycardsとは？"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('border:2px solid var(--accent)');
    expect(html).toContain('color:var(--accentText)');
    expect(html).toContain('Polycardsとは？</button>');
  });

  it('sits on the My Cards dashboard', () => {
    const html = renderToStaticMarkup(<MyCardsTab decks={[]} dueRows={[]} stats={null} onReview={() => {}} />);
    expect(html).toContain('Polycardsとは？');
  });
});

describe('empty My Cards (no decks yet)', () => {
  const html = renderToStaticMarkup(<MyCardsTab decks={[]} dueRows={[]} stats={null} onReview={() => {}} />);

  it('explains in Japanese how to add a deck', () => {
    expect(html).toContain('まだデッキがありません');
    expect(html).toContain('「単語パック」タブで教科書のユニットを選んで、「＋ マイデッキに追加」を押しましょう。');
    expect(html).not.toContain('Personal Rotation');
  });

  it('has a button to the Word Packs tab', () => {
    expect(html).toMatch(/<button[^>]*>単語パックを見る<\/button>/);
  });
});
