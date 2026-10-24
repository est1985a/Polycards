// Tests for the stats page (学習の記録). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { setLang } from '../i18n';
import StatsScreen from './StatsScreen';

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

const render = (props = {}) => renderToStaticMarkup(<StatsScreen data={DATA} today={TODAY} onBack={() => {}} {...props} />);
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const count = (html, re) => (html.match(re) || []).length;

describe('StatsScreen', () => {
  it('shows the streak, calendar, daily chart, totals and trouble words', () => {
    const html = render();
    const plain = text(html);
    expect(plain).toContain('学習の記録');
    expect(plain).toContain('← 戻る');
    // Mon 19 + Tue 20, today not done yet: the streak is still alive.
    expect(plain).toContain('2日連続');
    expect(plain).toContain('ベスト 2日');
    expect(plain).toContain('今日も復習して記録をのばそう！');
    // 12 weeks of 7 days, the 3 days after today (Thu–Sat) are empty.
    expect(count(html, /data-cell="/g)).toBe(84);
    expect(count(html, /data-cell="future"/g)).toBe(3);
    expect(html).toMatch(/data-cell="2026-10-01"><span data-shade="4"/);
    expect(html).toMatch(/data-cell="2026-10-19"><span data-shade="2"/);
    expect(html).toMatch(/data-cell="2026-10-21"><span data-shade="0"[^>]*outline:2px solid var\(--text\)/);
    expect(plain).toContain('月');
    expect(plain).toContain('少ない');
    expect(plain).toContain('多い');
    // 14 bars, ending today in the accent color.
    expect(count(html, /data-bar="/g)).toBe(14);
    expect(html).toMatch(/data-bar="2026-10-08"/);
    expect(html).toContain('毎日のレビュー数（14日間）');
    // Totals: days studied comes from the days, the rest from the totals row.
    expect(plain).toContain('レビュー1,234');
    expect(plain).toContain('勉強した日4');
    expect(plain).toContain('スペル正解40');
    expect(plain).toContain('スペルボーナス38 pt');
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
    expect(plain).toContain('まだ記録がありません。My Cardsで復習すると、ここに記録が出ます。');
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
    expect(plain).toContain('Study days (12 weeks)');
    expect(plain).toContain('Mon');
    expect(plain).toContain('Wed');
    expect(plain).toContain('Fri');
    expect(plain).toContain('Reviews per day (14 days)');
    expect(plain).toContain('Spelling bonus38 pt');
    expect(plain).toContain('1 time');
    expect(plain).not.toMatch(/[぀-ヿ]/); // no kana left (the word's Japanese, 駅, is data and kanji only)
    const empty = text(render({ data: { ...DATA, trouble: [] } }));
    expect(empty).toContain('Best: 2 days');
    expect(empty).toContain('No trouble words right now. Great job!');
  });
});
