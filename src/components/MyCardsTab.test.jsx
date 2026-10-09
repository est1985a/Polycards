// Tests for the review button on My Cards. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReviewButton } from './MyCardsTab';
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
