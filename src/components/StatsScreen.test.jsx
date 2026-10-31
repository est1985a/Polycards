// Tests for the stats page (学習の記録). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { setLang } from '../i18n';
import StatsScreen, { MonthCalendar, MonthChart } from './StatsScreen';

afterEach(() => setLang('ja'));

const TODAY = '2026-10-21'; // a Wednesday
const day = (d, reviews) => ({ day: d, reviews, spelled_correctly: 0, bonus_points: 0 });
const DATA = {
  days: [day('2026-10-01', 120), day('2026-10-02', 5), day('2026-10-19', 30), day('2026-10-20', 12)],
  totals: { reviews: 1234, spelled_correctly: 40, bonus_points: 38 },
  trouble: [
    { word_id: 'w1', english: 'since', japanese: '〜から', misses: 4, last_missed: '2026-10-20T09:00:00Z', lowest_level: 1 },
    { word_id: 'w2', english: 'station', japanese: '駅', misses: 1, last_missed: '2026-10-19T09:00:00Z', lowest_level: 3 },
  ],
};

const render = (props = {}) => renderToStaticMarkup(<StatsScreen data={DATA} today={TODAY} onBack={() => {}} masteredCount={1500} {...props} />);
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const count = (html, re) => (html.match(re) || []).length;

describe('StatsScreen', () => {
  it('the back button stays pinned to the top while the page scrolls', () => {
    expect(render()).toMatch(/data-sticky-back="" style="position:sticky/);
  });

  it('shows the streak, calendar, daily chart, totals and trouble words', () => {
    const html = render();
    const plain = text(html);
    expect(plain).toContain('学習の記録');
    expect(html).toContain('class="back-button"');
    expect(html).toContain('>戻る</span>');
    // Mon 19 + Tue 20, today not done yet: the streak is still alive.
    expect(plain).toContain('2日連続');
    expect(plain).toContain('ベスト 2日');
    expect(plain).toContain('今日も復習して記録をのばそう！');
    // October 2026 starts on a Thursday: 4 blanks, 31 days, 5 weeks; the 10 days after today are future.
    expect(plain).toContain('勉強した日');
    expect(plain).toContain('2026年10月');
    expect(count(html, /data-day="/g)).toBe(31);
    expect(count(html, /data-blank=""/g)).toBe(4);
    expect(count(html, /data-shade="future"/g)).toBe(10);
    expect(plain).toContain('この月は4日勉強しました');
    expect(plain).toContain('少ない');
    expect(plain).toContain('多い');
    // The chart shows the same month: 31 bars, and no numbers until a day is tapped.
    expect(count(html, /data-bar="/g)).toBe(31);
    expect(plain).toContain('レビュー数 2026年10月');
    expect(plain).toContain('この月のレビュー：167');
    expect(html).not.toContain('毎日のレビュー数');
    // Totals: days studied comes from the days, the rest from the totals row.
    expect(plain).toContain('レビュー1,234');
    expect(plain).toContain('勉強した日4');
    expect(plain).toContain('スペル正解40');
    expect(plain).toContain('マスターしたカード1,500');
    expect(plain).not.toContain('スペルボーナス');
    // Trouble words.
    expect(count(html, /data-trouble="/g)).toBe(2);
    expect(plain).toContain('since');
    expect(plain).toContain('〜から');
    expect(plain).toContain('Lv1');
    expect(plain).toContain('4回');
    expect(plain).toContain('最近30日で「まだ」「わからない」が多かった単語');
  });

  it('never shows accuracy', () => {
    const plain = text(render());
    expect(plain).not.toMatch(/%|正解率|わかった/);
  });

  it('shows no hint when today is done, and the start hint when there is no streak', () => {
    const done = text(render({ data: { ...DATA, days: [...DATA.days, day(TODAY, 3)] } }));
    expect(done).toContain('3日連続');
    expect(done).not.toContain('今日も復習して');
    expect(done).not.toContain('今日から始めよう！');
    const broken = text(render({ data: { ...DATA, days: [day('2026-10-01', 3)] } }));
    expect(broken).toContain('0日連続');
    expect(broken).toContain('ベスト 1日');
    expect(broken).toContain('今日から始めよう！');
  });

  it('shows only the title and a note when there are no study days', () => {
    const html = render({ data: { days: [], totals: { reviews: 0, spelled_correctly: 0, bonus_points: 0 }, trouble: [] } });
    const plain = text(html);
    expect(plain).toContain('学習の記録');
    expect(plain).toContain('まだ記録がありません。マイデッキで復習すると、ここに記録が出ます。');
    expect(plain).not.toContain('日連続');
    expect(html).not.toContain('data-cell');
    expect(plain).not.toContain('苦手な単語');
  });

  it('praises an empty trouble list', () => {
    const plain = text(render({ data: { ...DATA, trouble: [] } }));
    expect(plain).toContain('苦手な単語はありません。すごい！');
  });

  it('shows loading, then errors', () => {
    expect(text(render({ data: null }))).toContain('読み込み中…');
    const html = render({ data: null, error: 'Could not load study days: boom' });
    expect(html).toMatch(/role="alert"[^>]*>Could not load study days: boom</);
  });

  it('shows 0 mastered cards when no count is passed (stats not loaded yet)', () => {
    const plain = text(renderToStaticMarkup(<StatsScreen data={DATA} today={TODAY} onBack={() => {}} />));
    expect(plain).toContain('マスターしたカード0');
  });

  it('puts the totals in 4 columns on wide screens', () => {
    expect(render()).toContain('repeat(2, minmax(0, 1fr))');
    expect(render({ wide: true })).toContain('repeat(4, minmax(0, 1fr))');
  });

  it('works in English, with plurals', () => {
    setLang('en');
    const plain = text(render({ data: { ...DATA, days: [day('2026-10-20', 4)], trouble: [{ ...DATA.trouble[1] }] } }));
    expect(plain).toContain('My Stats');
    expect(plain).toContain('1-day streak');
    expect(plain).toContain('Best: 1 day');
    expect(plain).toContain('Review today to keep your streak going!');
    expect(plain).toContain('Study days');
    expect(plain).toContain('October 2026');
    expect(plain).toContain('SunMonTueWedThuFriSat');
    expect(plain).toContain('Studied on 1 day this month');
    expect(plain).toContain('Reviews October 2026');
    expect(plain).toContain('4 reviews this month');
    expect(plain).toContain('Cards mastered1,500');
    expect(plain).not.toContain('Spelling bonus');
    expect(plain).toContain('1 time');
    expect(plain).not.toMatch(/[぀-ヿ]/); // no kana left (the word's Japanese, 駅, is data and kanji only)
    const empty = text(render({ data: { ...DATA, trouble: [] } }));
    expect(empty).toContain('Best: 2 days');
    expect(empty).toContain('No trouble words right now. Great job!');
  });
});

describe('MonthCalendar', () => {
  const OCT = { year: 2026, month: 10 };
  const cal = (props = {}) => renderToStaticMarkup(<MonthCalendar days={DATA.days} today={TODAY} month={OCT} {...props} />);
  const prev = (html) => /<button[^>]*aria-label="前の月"[^>]*>/.exec(html)[0];
  const next = (html) => /<button[^>]*aria-label="次の月"[^>]*>/.exec(html)[0];

  it('shows the weekday row, Sunday in danger and Saturday in accentText', () => {
    const html = cal();
    expect(text(html)).toContain('日月火水木金土');
    expect(html).toMatch(/data-weekday="0"[^>]*color:var\(--danger\)/);
    expect(html).toMatch(/data-weekday="6"[^>]*color:var\(--accentText\)/);
    expect(html).toMatch(/data-weekday="3"[^>]*color:var\(--muted\)/);
  });

  it('this month: › is disabled, ‹ goes back to the first study month', () => {
    const html = cal({ days: [...DATA.days, day('2026-08-03', 2)] });
    expect(next(html)).toContain('disabled');
    expect(prev(html)).not.toContain('disabled');
  });

  it('a past month: › is enabled, no future days, and ‹ stops at the first study month', () => {
    const html = cal({ days: [...DATA.days, day('2026-09-03', 2)], month: { year: 2026, month: 9 } });
    expect(text(html)).toContain('2026年9月');
    expect(next(html)).not.toContain('disabled');
    expect(prev(html)).toContain('disabled');
    expect(html).not.toContain('data-shade="future"');
    expect(html).not.toContain('outline:2px solid');
  });

  it('with only this month, both arrows are disabled', () => {
    const html = cal();
    expect(prev(html)).toContain('disabled');
    expect(next(html)).toContain('disabled');
  });

  it('outlines today, shades days, and uses accentInk for the number on bright days', () => {
    const html = cal();
    expect(html).toMatch(/data-day="2026-10-21" data-shade="0"[^>]*outline:2px solid var\(--text\)/);
    expect(html).toMatch(/<button data-day="2026-10-01" data-shade="4"[^>]*color:var\(--accentInk\)[^>]*>1</);
    expect(html).toMatch(/<button data-day="2026-10-19" data-shade="2"[^>]*color:var\(--text\)[^>]*>19</);
    // Only days with reviews are buttons; a day with none is a plain square.
    expect(html).toMatch(/<span data-day="2026-10-05"/);
    expect(html.match(/<button data-day=/g)).toHaveLength(4);
  });

  it("shows the tapped day's reviews under the grid", () => {
    expect(text(cal())).not.toContain('レビュー');
    const html = cal({ selectedDay: '2026-10-19' });
    expect(html).toMatch(/role="status"[^>]*>10月19日：30レビュー</);
    expect(html).toMatch(/data-day="2026-10-19"[^>]*aria-pressed="true"/);
  });

  it('works in English', () => {
    setLang('en');
    const html = cal({ days: [day('2026-10-19', 1)], selectedDay: '2026-10-19' });
    expect(text(html)).toContain('October 2026');
    expect(text(html)).toContain('SunMonTueWedThuFriSat');
    expect(html).toMatch(/role="status"[^>]*>Oct 19: 1 review</);
    expect(text(html)).toContain('Studied on 1 day this month');
    expect(html).toContain('aria-label="Previous month"');
  });
});

describe('MonthChart', () => {
  const chart = (props = {}) => renderToStaticMarkup(<MonthChart days={DATA.days} today={TODAY} month={{ year: 2026, month: 10 }} {...props} />);
  const labels = (html) => [...html.matchAll(/<span style="flex:1[^>]*>(\d*)<\/span>/g)].map((m) => m[1]).filter(Boolean);

  it('has one bar per day of the month, labeled only on some days', () => {
    expect(chart().match(/data-bar="/g)).toHaveLength(31);
    expect(labels(chart())).toEqual(['1', '5', '10', '15', '20', '25', '31']);
    const feb = chart({ month: { year: 2028, month: 2 }, today: '2028-03-01' });
    expect(feb.match(/data-bar="/g)).toHaveLength(29);
    expect(labels(feb)).toEqual(['1', '5', '10', '15', '20', '25', '29']);
  });

  it("shows no numbers until a day is selected, then that bar's number and outline", () => {
    const plain = chart();
    expect(plain).not.toMatch(/>30</);
    const html = chart({ selectedDay: '2026-10-19' });
    expect(html).toMatch(/<button data-bar="2026-10-19"[^>]*aria-pressed="true"[^>]*><span[^>]*>30<\/span><span[^>]*outline:2px solid var\(--text\)/);
  });

  it("colors today's bar with the accent, has no bars on future days, and totals the month", () => {
    const html = chart({ days: [...DATA.days, day(TODAY, 7)] });
    expect(html).toMatch(/data-bar="2026-10-21"[^>]*>(<span[^>]*>\d+<\/span>)?<span[^>]*background:var\(--accent\)/);
    expect(html).toMatch(/data-bar="2026-10-25"[^>]*><span[^>]*height:0/);
    expect(text(html)).toContain('この月のレビュー：174');
  });

  it('uses English plurals', () => {
    setLang('en');
    expect(text(chart({ days: [day('2026-10-19', 1)] }))).toContain('1 review this month');
    expect(text(chart())).toContain('Reviews October 2026');
  });
});
