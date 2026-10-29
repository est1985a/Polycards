// Tests for the 先生 tab: class list, class page, search pop-up parts, the big join code and the
// student's join steps (static render; taps can't run here). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TeacherTab, { CreateClassForm } from './TeacherTab';
import ClassPage, { RosterRow, JoinCodePanel } from './ClassPage';
import { ResultRow, AddStudentForm } from './UserSearchSheet';
import { JoinCodeScreen } from './JoinCodeDisplay';
import { JoinClassSteps } from './JoinClassSheet';
import { SheetBox } from './SheetFrame';
import Tabs from './Tabs';
import { AccountMenu } from './Header';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));
const noop = () => {};

const CLASSES = [
  { id: 'c1', name: '1年A組', school_year: 2026, join_code: 'ABC234', archived: false, student_count: 31 },
  { id: 'c2', name: '2年B組', school_year: 2026, join_code: 'XYZ789', archived: false, student_count: 1 },
];

const DETAIL = {
  class: { id: 'c1', name: '1年A組', school_year: 2026, join_code: 'ABC234', archived: false },
  students: [
    { student_id: 's3', real_name: '上田 花', student_number: null, display_name: 'ueda', email: 'ueda@polycards.test' },
    { student_id: 's1', real_name: '佐藤 一郎', student_number: 12, display_name: 'aiden', email: 'aiden@polycards.test' },
    { student_id: 's2', real_name: '加藤 次郎', student_number: 3, display_name: 'amaya', email: 'amaya@polycards.test' },
  ],
  teachers: [{ teacher_id: 't1', display_name: 'test1', is_me: true }, { teacher_id: 't2', display_name: 'Ms. Ito', is_me: false }],
};

const page = (props = {}) => renderToStaticMarkup(
  <ClassPage
    detail={DETAIL} onBack={noop} onUpdateClass={noop} onSetArchived={noop} onRegenerate={noop}
    onUpdateMember={noop} onRemoveMember={noop} onOpenSearch={noop} onShowLarge={noop}
    {...props}
  />,
);

describe('Tabs', () => {
  it('shows 先生 as a 4th tab when given', () => {
    const h = renderToStaticMarkup(
      <Tabs tabs={[{ id: 'myCards', label: 'tabs.myCards' }, { id: 'cardSets', label: 'tabs.cardSets' }, { id: 'teacher', label: 'tabs.teacher' }]} active="teacher" onChange={noop} />,
    );
    expect(h).toMatch(/aria-current="page"[^]*先生/);
    setLang('en');
    expect(renderToStaticMarkup(<Tabs tabs={[{ id: 'teacher', label: 'tabs.teacher' }]} active={null} onChange={noop} />)).toContain('Teacher');
  });
});

describe('TeacherTab (class list)', () => {
  it('lists each class with 年度, number of students and its join code', () => {
    const h = renderToStaticMarkup(<TeacherTab classes={CLASSES} onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />);
    expect(h).toContain('1年A組');
    expect(h).toContain('2026年度');
    expect(h).toContain('31人');
    expect(h).toContain('ABC234');
    expect(h).toContain('＋ クラスを作る');
    expect(h).toContain('aria-checked="false"'); // アーカイブ switch off
  });

  it('shows loading, the empty states and errors', () => {
    expect(renderToStaticMarkup(<TeacherTab classes={null} onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />)).toContain('読み込み中');
    expect(renderToStaticMarkup(<TeacherTab classes={[]} onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />)).toContain('まだクラスがありません');
    const archived = renderToStaticMarkup(<TeacherTab classes={[]} archived onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />);
    expect(archived).toContain('アーカイブしたクラスはありません');
    expect(archived).not.toContain('＋ クラスを作る'); // no new classes in the archived view
    expect(renderToStaticMarkup(<TeacherTab classes={null} error="だめ" onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />)).toContain('role="alert"');
  });

  it('uses English plurals', () => {
    setLang('en');
    const h = renderToStaticMarkup(<TeacherTab classes={CLASSES} onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />);
    expect(h).toContain('31 students');
    expect(h).toContain('1 student<');
  });

  it('the create form starts with this school year and is off until a name is typed', () => {
    const h = renderToStaticMarkup(<CreateClassForm defaultYear={2026} onCreate={noop} onCancel={noop} />);
    expect(h).toContain('value="2026"');
    expect(h).toMatch(/<button type="submit" disabled=""/);
  });
});

describe('ClassPage', () => {
  it('lists the roster by 出席番号, then name, with real name and account', () => {
    const h = page();
    const roster = h.match(/data-roster=""[^]*?<\/ul>/)[0];
    const order = ['加藤 次郎', '佐藤 一郎', '上田 花'].map((n) => roster.indexOf(n));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(roster).toContain('aiden');
    expect(h).toContain('生徒 (3)');
  });

  it('shows the join code, its buttons, the teachers and the class actions', () => {
    const h = page();
    expect(h).toMatch(/data-join-code=""[^]*ABC[^]*234/);
    for (const text of ['コピー', '大きく表示', '新しいコードにする', '＋ 生徒を追加', '＋ 先生を追加', 'このクラスをアーカイブ', '（あなた）', 'Ms. Ito']) {
      expect(h).toContain(text);
    }
  });

  it('an archived class: no adding, struck-out code, unarchive button', () => {
    const h = page({ detail: { ...DETAIL, class: { ...DETAIL.class, archived: true } } });
    expect(h).not.toContain('＋ 生徒を追加');
    expect(h).not.toContain('大きく表示');
    expect(h).toContain('アーカイブを解除');
    expect(h).toContain('生徒は参加できません');
  });

  it('loading and load errors keep the back button', () => {
    expect(page({ detail: null })).toContain('読み込み中');
    const h = page({ detail: null, error: 'このクラスの先生ではありません' });
    expect(h).toContain('このクラスの先生ではありません');
    expect(h).toContain('クラス一覧');
  });

  it('a roster row asks before removing, and edits in place', () => {
    const student = DETAIL.students[1];
    const remove = renderToStaticMarkup(<ul><RosterRow student={student} onUpdate={noop} onRemove={noop} initialMode="remove" /></ul>);
    expect(remove).toContain('佐藤 一郎さんをこのクラスから外しますか？');
    expect(remove).toContain('キャンセル');
    const edit = renderToStaticMarkup(<ul><RosterRow student={student} onUpdate={noop} onRemove={noop} initialMode="edit" /></ul>);
    expect(edit).toContain('value="佐藤 一郎"');
    expect(edit).toContain('value="12"');
    expect(edit).toContain('保存');
  });

  it('the join code panel without a code shows nothing broken', () => {
    expect(renderToStaticMarkup(<JoinCodePanel code="" archived={false} onShowLarge={noop} onRegenerate={noop} />)).toContain('参加コード');
  });
});

describe('search pop-up parts', () => {
  const user = { id: 'u1', display_name: 'aiden', username: 'aiden', email: 'aiden@polycards.test', is_teacher: false };

  it('a result shows the name and email, and 追加済み when already in the class', () => {
    const h = renderToStaticMarkup(<ul><ResultRow user={user} added={false} actionLabel="選ぶ" onPick={noop} /></ul>);
    expect(h).toContain('aiden@polycards.test');
    expect(h).toContain('選ぶ');
    expect(renderToStaticMarkup(<ul><ResultRow user={user} added actionLabel="選ぶ" onPick={noop} /></ul>)).toContain('追加済み');
    expect(renderToStaticMarkup(<ul><ResultRow user={{ ...user, is_teacher: true }} added={false} actionLabel="追加" onPick={noop} /></ul>)).toContain('先生');
  });

  it('adding a student asks for 本名 and 出席番号', () => {
    const h = renderToStaticMarkup(<AddStudentForm user={user} onAdd={noop} onBack={noop} />);
    expect(h).toContain('aiden を追加');
    expect(h).toContain('本名');
    expect(h).toContain('出席番号');
    expect(h).toMatch(/<button type="submit" disabled=""/); // no name yet
  });

  it('the pop-up box has a title and a close button', () => {
    const h = renderToStaticMarkup(<SheetBox titleId="x" title="生徒を追加" onClose={noop}><p>body</p></SheetBox>);
    expect(h).toContain('aria-labelledby="x"');
    expect(h).toContain('生徒を追加');
    expect(h).toContain('閉じる');
  });
});

describe('big join code', () => {
  it('shows the class name and the code in two halves', () => {
    const h = renderToStaticMarkup(<JoinCodeScreen classTitle="1年A組" code="ABC234" onClose={noop} />);
    expect(h).toContain('1年A組 の参加コード');
    expect(h).toMatch(/<span>ABC<\/span><span>234<\/span>/);
    expect(h).toContain('メニュー → クラスに参加');
  });
});

describe('joining a class (student)', () => {
  const steps = (props) => renderToStaticMarkup(
    <JoinClassSteps
      code="" found={{ id: 'c1', name: '1年A組' }} name="" number=""
      onCode={noop} onName={noop} onNumber={noop} onCheck={noop} onDetails={noop} onBack={noop} onJoin={noop} onDone={noop}
      {...props}
    />,
  );

  it('step 1: the code; 次へ stays off until it has 6 letters', () => {
    expect(steps({ step: 'code', code: 'ABC' })).toMatch(/<button type="submit" disabled=""/);
    expect(steps({ step: 'code', code: 'abc 234' })).not.toMatch(/<button type="submit" disabled=""/);
    expect(steps({ step: 'code', code: 'ABC234', error: 'コードが見つかりません。もう一度確認してください' })).toContain('role="alert"');
  });

  it('step 2: real name and number, with the privacy note', () => {
    const h = steps({ step: 'details', name: '山田 太郎', number: '7' });
    expect(h).toContain('クラス：1年A組');
    expect(h).toContain('先生だけが見られます');
    expect(steps({ step: 'details', name: '山田', number: '120' })).toContain('出席番号は1〜99');
  });

  it('step 3: confirm, then done', () => {
    const h = steps({ step: 'confirm', name: ' 山田　太郎 ', number: '７' });
    expect(h).toContain('「1年A組」に参加しますか？');
    expect(h).toContain('名前：山田 太郎');
    expect(h).toContain('出席番号：7');
    expect(steps({ step: 'confirm', name: '山田', number: '' })).toContain('出席番号：なし');
    expect(steps({ step: 'done' })).toContain('「1年A組」に参加しました！');
  });

  it('the account menu has クラスに参加', () => {
    const h = renderToStaticMarkup(<AccountMenu user={{ email: 'a@b.c' }} />);
    expect(h).toContain('クラスに参加');
    setLang('en');
    expect(renderToStaticMarkup(<AccountMenu user={{ email: 'a@b.c' }} />)).toContain('Join a class');
  });
});
