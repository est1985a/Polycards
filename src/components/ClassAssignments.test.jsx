// Tests for the teacher's 課題: the list, one assignment's per-student table, the class page switch
// and the CSV buttons. Static render. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassAssignments from './ClassAssignments';
import AssignmentPage from './AssignmentPage';
import ClassPage, { ClassAwardsPanel } from './ClassPage';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));
const noop = () => {};
const NOW = Date.parse('2026-10-30T01:00:00Z');

const ROSTER = [
  { student_id: 's1', real_name: '佐藤 一郎', student_number: 1, nickname: 'Ichi' },
  { student_id: 's2', real_name: '加藤 次郎', student_number: 2, nickname: null },
  { student_id: 's3', real_name: '上田 花', student_number: 3 },
];
const ASSIGNMENT = {
  id: 'a1', deck_id: 'd1', deck_name: 'Unit 1 Part 1', source: 'New Horizon 1 · Unit 1', word_count: 2,
  due_date: '2026-10-29', note: '金曜日の小テスト', created_at: '2026-10-20T00:00:00Z', teacher_name: 'アンドレ先生',
  students: [
    { student_id: 's1', added: true, owned: 4, learned: 4, total: 4 },
    { student_id: 's2', added: true, owned: 4, learned: 1, total: 4 },
    { student_id: 's3', added: false, owned: 0, learned: 0, total: 4 },
  ],
};

describe('ClassAssignments (the 課題 view)', () => {
  it('one row per assignment: pack, source, due date, 完了 N／M人・追加済み N人', () => {
    const h = renderToStaticMarkup(<ClassAssignments assignments={[ASSIGNMENT]} onNew={noop} onOpen={noop} now={NOW} />);
    expect(h).toContain('Unit 1 Part 1');
    expect(h).toContain('New Horizon 1 · Unit 1');
    expect(h).toContain('10月29日まで · 期限すぎ');
    expect(h).toContain('完了 1／3人・追加済み 2人');
    expect(h).toContain('＋ 課題を出す');
    expect(h).toContain('aria-label="「Unit 1 Part 1」の進み具合を見る"');
  });

  it('past due is gentle (muted), never the danger color', () => {
    const h = renderToStaticMarkup(<ClassAssignments assignments={[ASSIGNMENT]} onNew={noop} onOpen={noop} now={NOW} />);
    expect(h).toContain('data-due="overdue"');
    expect(h).not.toContain('var(--danger)');
  });

  it('loading, empty, archived', () => {
    expect(renderToStaticMarkup(<ClassAssignments assignments={null} onNew={noop} onOpen={noop} />)).toContain('読み込み中');
    expect(renderToStaticMarkup(<ClassAssignments assignments={[]} onNew={noop} onOpen={noop} />)).toContain('課題はまだありません');
    const archived = renderToStaticMarkup(<ClassAssignments assignments={[]} archived onNew={noop} onOpen={noop} />);
    expect(archived).not.toContain('＋ 課題を出す');
    expect(archived).toContain('アーカイブしたクラスには課題を出せません');
  });
});

describe('AssignmentPage', () => {
  const page = (props = {}) => renderToStaticMarkup(
    <AssignmentPage assignment={ASSIGNMENT} roster={ROSTER} className="1年A組" onBack={noop} onUpdate={noop} onDelete={noop} now={NOW} {...props} />,
  );

  it('the header: pack, note, who assigned it, the summary, 編集 / 削除 / CSVで保存', () => {
    const h = page();
    expect(h).toContain('Unit 1 Part 1');
    expect(h).toContain('金曜日の小テスト');
    expect(h).toContain('アンドレ先生が出題');
    expect(h).toContain('完了 1／3人・追加済み 2人');
    expect(h).toContain('編集');
    expect(h).toContain('削除');
    expect(h).toContain('CSVで保存');
  });

  it('the table: 番号 · 名前 · 状態 on phones (cards on wide), not-added rows marked', () => {
    const h = page();
    expect(h).toContain('aria-sort="ascending"');
    expect(h).not.toContain('>カード<');
    expect((h.match(/data-assignment-student=""/g) || []).length).toBe(3);
    expect(h).toMatch(/data-not-added=""[^]*上田 花[^]*data-status="not_added"/);
    expect(h).toContain('data-status="done"');
    expect(h).toContain('学習中');
    expect(h).toContain('25%');
    expect(h).toContain('ニックネーム：Ichi');
    expect(page({ wide: true })).toContain('1 / 4');
  });

  it('delete asks first and says My Decks are kept; archived classes can\'t edit', () => {
    expect(page({ initialMode: 'delete' })).toContain('生徒のマイデッキからは消えません');
    const archived = page({ archived: true });
    expect(archived).not.toContain('>削除<');
    expect(archived).toContain('CSVで保存');
  });

  it('loading and a deleted assignment', () => {
    expect(page({ assignment: null })).toContain('読み込み中');
    expect(page({ assignment: null, error: 'この課題は見つかりませんでした' })).toContain('role="alert"');
  });
});

describe('class page: the 課題 view and the CSV buttons', () => {
  const DETAIL = { class: { id: 'c1', name: '1年A組', school_year: 2026, join_code: 'ABC234', archived: false }, students: ROSTER, teachers: [] };
  const page = (props) => renderToStaticMarkup(
    <ClassPage detail={DETAIL} onBack={noop} onUpdateClass={noop} onSetArchived={noop} onRegenerate={noop}
      onUpdateMember={noop} onRemoveMember={noop} onOpenSearch={noop} onShowLarge={noop} {...props} />,
  );

  it('a 4th switch option 課題 shows the assignments', () => {
    const h = page({ view: 'assignments', assignments: [ASSIGNMENT] });
    expect(h).toMatch(/aria-pressed="true"[^>]*>課題</);
    expect(h).toContain('data-assignments=""');
  });

  it('CSVで保存 on the overview once it has rows, and on the award history', () => {
    const rows = [{ student_id: 's1', real_name: '佐藤 一郎', student_number: 1, reviews: 1, honesty: {} }];
    expect(page({ view: 'overview', overview: rows, onOverviewCsv: noop })).toContain('CSVで保存');
    expect(page({ view: 'overview', overview: [], onOverviewCsv: noop })).not.toContain('CSVで保存');
    const awards = [{ batch_id: 'b', created_at: '2026-10-30T00:00:00Z', teacher_name: 'T', amount: 1, student_count: 1, student_names: ['A'] }];
    expect(renderToStaticMarkup(<ClassAwardsPanel awards={awards} onCsv={noop} />)).toContain('CSVで保存');
    expect(renderToStaticMarkup(<ClassAwardsPanel awards={[]} onCsv={noop} />)).not.toContain('CSVで保存');
  });

  it('English', () => {
    setLang('en');
    const h = renderToStaticMarkup(<ClassAssignments assignments={[ASSIGNMENT]} onNew={noop} onOpen={noop} now={NOW} />);
    expect(h).toContain('Done 1/3 · Added 2');
    expect(h).toContain('Due Oct 29 · Past due');
  });
});
