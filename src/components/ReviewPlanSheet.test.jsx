// Tests for the review plan pop-up. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReviewPlanSheet from './ReviewPlanSheet';

const NOW = Date.parse('2026-10-13T09:00:00Z'); // 18:00 Japan time
const render = (rows) => renderToStaticMarkup(<ReviewPlanSheet rows={rows} now={NOW} onClose={() => {}} />);

describe('ReviewPlanSheet', () => {
  it('is a dialog with an X close button', () => {
    const html = render([]);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="閉じる (Close)"');
  });

  it('shows a row per hour and a total for each day', () => {
    const html = render([
      { next_review_at: '2026-10-13T10:10:00Z', level: 2 },
      { next_review_at: '2026-10-13T10:40:00Z', level: 2 },
      { next_review_at: '2026-10-14T00:00:00Z', level: 4 },
    ]);
    expect(html).toContain('19:00');
    expect(html).toContain('09:00');
    expect(html).toMatch(/合計 <span[^>]*>2<\/span>枚/);
    expect(html).toMatch(/合計 <span[^>]*>1<\/span>枚/);
    expect(html).not.toContain('はありません');
  });

  it('shows +N枚 for each hour and a running 計N枚 that carries over into tomorrow', () => {
    const html = render([
      { next_review_at: '2026-10-13T10:10:00Z', level: 2 },
      { next_review_at: '2026-10-13T10:40:00Z', level: 2 },
      { next_review_at: '2026-10-14T00:00:00Z', level: 4 },
    ]);
    const added = [...html.matchAll(/\+<span[^>]*>(\d+)<\/span>枚/g)].map((m) => m[1]);
    const running = [...html.matchAll(/計<span[^>]*>(\d+)<\/span>枚/g)].map((m) => m[1]);
    expect(added).toEqual(['2', '1']); // 19:00 today, 09:00 tomorrow
    expect(running).toEqual(['2', '3']); // tomorrow continues from today's 2
  });

  it('highlights the new cards in gold, and the running total less (muted, smaller)', () => {
    const html = render([{ next_review_at: '2026-10-13T10:10:00Z', level: 2 }]);
    expect(html).toMatch(/\+<span[^>]*var\(--gold\)[^>]*>1<\/span>枚/);
    expect(html).toMatch(/<span[^>]*font-size:13px;color:var\(--muted\)[^>]*>計/);
  });

  it('says so when a day has no reviews', () => {
    const html = render([]);
    expect(html).toContain('今日はもう復習はありません');
    expect(html).toContain('明日の復習はありません');
  });

  it('shows 読み込み中… while the plan loads', () => {
    expect(render(null)).toContain('読み込み中…');
  });
});
