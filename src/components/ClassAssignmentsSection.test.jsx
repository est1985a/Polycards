// Tests for 課題 in the クラス tab (students): add / review / done, due chips, order, collapsed done ones,
// own progress only, and the dot on the クラス tab. Static render. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassAssignmentsSection from './ClassAssignmentsSection';
import { ClassTabView } from './ClassTab';
import Tabs from './Tabs';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));
const NOW = Date.parse('2026-10-30T01:00:00Z'); // Oct 30, 10:00 in Japan

const a = (id, extra) => ({
  id, deck_id: `d-${id}`, deck_name: `Pack ${id}`, source: 'New Horizon 1 · Unit 1', word_count: 10, due_date: null,
  note: null, created_at: '2026-10-01T00:00:00Z', added: true, owned: 20, learned: 10, total: 20, ...extra,
});
const render = (list, props = {}) => renderToStaticMarkup(<ClassAssignmentsSection assignments={list} now={NOW} {...props} />);

describe('ClassAssignmentsSection', () => {
  it('nothing while loading or with no assignments', () => {
    expect(render(null)).toBe('');
    expect(render([])).toBe('');
  });

  it('not added: a big ＋ マイデッキに追加, the due chip and the teacher\'s note', () => {
    const h = render([a('x', { added: false, owned: 0, learned: 0, due_date: '2026-11-02', note: '金曜日の小テスト' })]);
    expect(h).toContain('data-my-assignment="not_added"');
    expect(h).toContain('＋ マイデッキに追加');
    expect(h).toContain('あと3日');
    expect(h).toContain('「金曜日の小テスト」');
    expect(h).not.toContain('復習する');
  });

  it('added: my progress bar, N% and 復習する with the due cards; disabled when none are due', () => {
    const due = render([a('x')], { dueFor: () => 4 });
    expect(due).toContain('aria-valuenow="50"');
    expect(due).toContain('50%');
    expect(due).toContain('復習する（4枚）');
    const none = render([a('x')], { dueFor: () => 0 });
    expect(none).toMatch(/<button disabled=""[^>]*>今は復習なし/);
  });

  it('done: a 完了 badge and no button', () => {
    const h = render([a('x', { learned: 20 })]);
    expect(h).toContain('data-status="done"');
    expect(h).toContain('完了');
    expect(h).not.toContain('＋ マイデッキに追加');
    expect(h).not.toContain('復習する');
  });

  it('gentle due colors: past due and today never use the danger color', () => {
    const h = render([a('late', { due_date: '2026-10-29' }), a('today', { due_date: '2026-10-30' })]);
    expect(h).toContain('期限すぎ');
    expect(h).toContain('今日まで');
    expect(h).not.toContain('var(--danger)');
  });

  it('not done first by nearest due date; done after them, collapsed after 3', () => {
    const list = [
      a('d1', { learned: 20 }), a('later', { due_date: '2026-11-20' }), a('d2', { learned: 20 }),
      a('soon', { due_date: '2026-10-31' }), a('d3', { learned: 20 }), a('d4', { learned: 20 }),
    ];
    const h = render(list);
    const order = [...h.matchAll(/Pack (\w+)/g)].map((m) => m[1]);
    expect(order).toEqual(['soon', 'later', 'd1', 'd2', 'd3']);
    expect(h).toContain('完了した課題をすべて表示（4）');
  });

  it('shows only my own progress (no classmates)', () => {
    const h = render([a('x')]);
    expect(h).not.toContain('人');
    expect(h).not.toContain('student_id');
  });

  it('sits in the クラス tab under the header, even before a nickname is chosen', () => {
    const info = { id: 'c1', name: '1年A組', leaderboard_enabled: true, nickname: null, teachers: [] };
    const h = renderToStaticMarkup(<ClassTabView classes={[{ id: 'c1', name: '1年A組' }]} selectedId="c1" info={info} assignments={[a('x')]} now={NOW} />);
    expect(h.indexOf('data-class-assignments')).toBeGreaterThan(h.indexOf('1年A組'));
    expect(h.indexOf('data-class-assignments')).toBeLessThan(h.indexOf('ニックネームを決めよう'));
  });

  it('English', () => {
    setLang('en');
    const h = render([a('x', { added: false, owned: 0, learned: 0, due_date: '2026-10-31' })]);
    expect(h).toContain('+ Add to My Deck');
    expect(h).toContain('1 day left');
  });
});

describe('how to finish an assignment', () => {
  it('one guide line for the whole section, and 単語を見る on every card (done too)', () => {
    const h = render([a('x', { added: false, owned: 0, learned: 0 }), a('y'), a('z', { learned: 20 })]);
    expect((h.match(/data-assign-guide/g) || []).length).toBe(1);
    expect(h).toContain('>① マイデッキに追加 →</span>');
    expect(h).toContain('>② マイデッキで復習 →</span>');
    expect(h).toContain('>③ 完了！</span>');
    expect((h.match(/単語を見る/g) || []).length).toBe(3);
    expect(h).not.toContain('<li data-my-assignment="not_added" role="button"');
  });

  it('English', () => {
    setLang('en');
    const h = render([a('x')]);
    expect(h).toContain('>① Add to My Deck →</span>');
    expect(h).toContain('>③ Done!</span>');
    expect(h).toContain('See words');
  });
});

describe('the dot on the クラス tab', () => {
  const tabs = [{ id: 'myCards', label: 'tabs.myCards' }, { id: 'class', label: 'tabs.class' }];
  it('shows a dot and a hidden label only when asked', () => {
    const on = renderToStaticMarkup(<Tabs tabs={tabs} active="myCards" onChange={() => {}} dots={{ class: true }} />);
    expect(on).toContain('data-tab-dot="class"');
    expect(on).toContain('新しい課題があります');
    const off = renderToStaticMarkup(<Tabs tabs={tabs} active="myCards" onChange={() => {}} dots={{ class: false }} />);
    expect(off).not.toContain('data-tab-dot');
    expect(renderToStaticMarkup(<Tabs tabs={tabs} active="myCards" onChange={() => {}} />)).not.toContain('data-tab-dot');
  });
});
