// Tests for the 先生 tab: class list, class page, search pop-up parts, the big join code and the
// student's join steps (static render; taps can't run here). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TeacherTab, { CreateClassForm } from './TeacherTab';
import ClassPage, { RosterRow, JoinCodePanel, LeaderboardView, TeachersPanel, TeacherRow, LeaversPanel, PendingRosterRow } from './ClassPage';
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
    { student_id: 's1', real_name: '佐藤 一郎', student_number: 12, display_name: 'aiden', email: 'aiden@polycards.test', nickname: 'Ichi' },
    { student_id: 's2', real_name: '加藤 次郎', student_number: 3, display_name: 'amaya', email: 'amaya@polycards.test' },
  ],
  teachers: [{ teacher_id: 't1', display_name: 'test1', is_me: true }, { teacher_id: 't2', display_name: 'Ms. Ito', is_me: false }],
};

const page = (props = {}) => renderToStaticMarkup(
  <ClassPage
    detail={DETAIL} onBack={noop} onUpdateClass={noop} onSetArchived={noop} onRegenerate={noop}
    onUpdateMember={noop} onRemoveMember={noop} onOpenSearch={noop} onShowLarge={noop} view="roster"
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

  it('has a 先生用ガイド pill when it can open the guide', () => {
    const without = renderToStaticMarkup(<TeacherTab classes={CLASSES} onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />);
    expect(without).not.toContain('先生用ガイド');
    const h = renderToStaticMarkup(<TeacherTab classes={CLASSES} onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} onOpenGuide={noop} />);
    expect(h).toMatch(/<button[^>]*aria-label="先生用ガイド"[^>]*aria-haspopup="dialog"/);
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

describe('class tab: nicknames and the ランキング view (teacher)', () => {
  it('the roster shows each nickname (or 未設定) under the real name', () => {
    const h = page();
    expect(h).toContain('ニックネーム：Ichi');
    expect(h).toContain('ニックネーム未設定');
  });

  it('the edit form has the nickname, which may be left empty', () => {
    const student = DETAIL.students[1];
    const h = renderToStaticMarkup(<ul><RosterRow student={student} onUpdate={noop} onRemove={noop} initialMode="edit" /></ul>);
    expect(h).toContain('value="Ichi"');
    expect(h).toContain('空にすると、生徒にもう一度決めてもらいます');
    const empty = renderToStaticMarkup(<ul><RosterRow student={DETAIL.students[0]} onUpdate={noop} onRemove={noop} initialMode="edit" /></ul>);
    expect(empty).not.toMatch(/<button type="submit" disabled=""/);
  });

  it('the overview shows nicknames from the class detail', () => {
    const rows = DETAIL.students.map((s) => ({ ...s, reviews: 1, study_days: 1, streak: 0, player_level: 1, cards: 0, tickets: 0, honesty: {} }));
    const h = page({ view: 'overview', overview: rows });
    expect(h).toContain('>Ichi<');
  });

  it('the view switch has ランキング; the view has the switch and the board', () => {
    const board = { enabled: true, top: [{ rank: 1, nickname: 'Ichi', reviews: 9, is_me: false, avatar: null }], me: null, last_week: [] };
    const h = page({ view: 'leaderboard', leaderboard: board });
    expect(h).toContain('ランキング');
    expect(h).toMatch(/role="switch" aria-checked="true"[^]*生徒にランキングを表示/);
    expect(h).toContain('今週のランキング');
    expect(h).not.toContain('あなたは');
    const off = renderToStaticMarkup(<LeaderboardView cls={{ ...DETAIL.class, leaderboard_enabled: false }} board={board} onSetEnabled={noop} />);
    expect(off).toContain('aria-checked="false"');
    expect(off).toContain('生徒には表示されていません');
    expect(off).toContain('今週のランキング'); // still shown to the teacher
    expect(renderToStaticMarkup(<LeaderboardView cls={DETAIL.class} board={null} onSetEnabled={noop} />)).toContain('読み込み中');
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

  it('step 3: the nickname, with the note that classmates will see it', () => {
    const h = steps({ step: 'nickname', nickname: 'Taro' });
    expect(h).toContain('クラスのランキングで、クラスメイトに表示されます');
    expect(h).toContain('4/12');
    expect(h).not.toMatch(/<button type="submit" disabled=""/);
    expect(steps({ step: 'nickname', nickname: '　' })).toMatch(/<button type="submit" disabled=""/);
    expect(steps({ step: 'nickname', nickname: 'abcdefghijklm' })).toMatch(/<button type="submit" disabled=""/);
    expect(steps({ step: 'nickname', nickname: 'ＡＢＣＤＥＦＧＨＩＪＫＬ' })).not.toMatch(/<button type="submit" disabled=""/); // 12 after NFKC
    expect(steps({ step: 'nickname', nickname: 'Taro', error: 'そのニックネームはもう使われています' })).toContain('role="alert"');
  });

  it('step 4: confirm (with the nickname), then done', () => {
    const h = steps({ step: 'confirm', name: ' 山田　太郎 ', number: '７', nickname: ' Ｔａｒｏ ' });
    expect(h).toContain('ニックネーム：Taro');
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

describe('students who left', () => {
  const LEFT = [{ student_id: 's9', real_name: '山田 太郎', student_number: 5, nickname: 'Taro', left_at: '2026-10-30T09:05:00Z' }];

  it('the 名簿 shows ぬけた生徒 with the date (Japan time); nothing when none', () => {
    const h = page({ leavers: LEFT });
    expect(h).toContain('ぬけた生徒');
    expect(h).toMatch(/data-leavers=""[^]*5[^]*山田 太郎 — 10月30日にぬけました/);
    expect(page({ leavers: [] })).not.toContain('ぬけた生徒');
    expect(page()).not.toContain('ぬけた生徒');
    expect(page({ leavers: LEFT, view: 'overview' })).not.toContain('ぬけた生徒');
  });

  it('works in English', () => {
    setLang('en');
    expect(renderToStaticMarkup(<LeaversPanel leavers={LEFT} />)).toContain('山田 太郎 — left on Oct 30');
  });
});

describe('removing a teacher', () => {
  const panel = (teachers) => renderToStaticMarkup(<TeachersPanel teachers={teachers} onAddTeacher={noop} onRemoveTeacher={noop} />);

  it('shows 外す on every teacher only when there are two or more', () => {
    const two = panel(DETAIL.teachers);
    expect(two.match(/>外す</g)).toHaveLength(2);
    expect(two).toContain('aria-label="Ms. Itoを先生から外す"');
    const one = panel([DETAIL.teachers[0]]);
    expect(one).not.toContain('外す');
    expect(one).toContain('test1');
  });

  it('asks differently when removing yourself', () => {
    const me = renderToStaticMarkup(<ul><TeacherRow teacher={DETAIL.teachers[0]} canRemove onRemove={noop} initialConfirming /></ul>);
    expect(me).toContain('このクラスの担当から外れますか？外れると、このクラスは見られなくなります。');
    expect(me).toContain('>外れる<');
    expect(me).toContain('>キャンセル<');
    const other = renderToStaticMarkup(<ul><TeacherRow teacher={DETAIL.teachers[1]} canRemove onRemove={noop} initialConfirming /></ul>);
    expect(other).toContain('Ms. Ito をこのクラスの担当から外しますか？生徒のデータは消えません。');
    expect(other).toContain('>外す<');
    expect(other).not.toContain('外れる');
  });
});

describe('same 出席番号 warning', () => {
  const twins = {
    ...DETAIL,
    students: [...DETAIL.students, { student_id: 's4', real_name: '木村 三郎', student_number: 3, display_name: 'kimu', email: 'k@x' }],
  };

  it('tags only the rows that share a number on the roster with 番号重複, in gold', () => {
    const roster = page({ detail: twins }).match(/data-roster=""[^]*?<\/ul>/)[0];
    expect(roster.match(/data-duplicate-number=""/g)).toHaveLength(2);
    expect(roster.match(/>番号重複</g)).toHaveLength(2);
    expect(roster).toContain('title="出席番号が同じ生徒がいます"');
    expect(roster).toMatch(/data-duplicate-number=""[^>]*color:var\(--gold\)/);
    expect(roster).not.toContain('data-same-number'); // the small ! stays only on the 一覧 table
    expect(page()).not.toContain('data-duplicate-number');
  });

  it('English: Duplicate no.', () => {
    setLang('en');
    expect(page({ detail: twins })).toContain('>Duplicate no.<');
  });

  it('editing a number another student has asks 保存する / 戻る first', () => {
    const h = renderToStaticMarkup(<ul><RosterRow student={DETAIL.students[1]} students={twins.students} onUpdate={noop} onRemove={noop} initialMode="edit" initialTaken={twins.students[2]} /></ul>);
    expect(h).toContain('出席番号 12 は すでに 加藤 次郎 さんが使っています。このまま保存しますか？');
    expect(h).toContain('>保存する<');
    expect(h).toContain('>戻る<');
    expect(h).not.toMatch(/<button type="submit"/); // the normal 保存 waits behind the question
    expect(renderToStaticMarkup(<ul><RosterRow student={DETAIL.students[1]} onUpdate={noop} onRemove={noop} initialMode="edit" /></ul>)).not.toContain('保存しますか');
  });

  it('adding a student with a number another student has asks too (English as well)', () => {
    const user = { id: 'u1', display_name: 'aiden' };
    const h = renderToStaticMarkup(<AddStudentForm user={user} students={twins.students} onAdd={noop} onBack={noop} initialTaken={twins.students[2]} />);
    expect(h).toContain('出席番号 3 は すでに 加藤 次郎 さんが使っています。このまま保存しますか？');
    expect(h).toContain('>保存する<');
    setLang('en');
    const en = renderToStaticMarkup(<AddStudentForm user={user} students={twins.students} onAdd={noop} onBack={noop} initialTaken={twins.students[2]} />);
    expect(en).toContain('Number 3 is already used by 加藤 次郎. Save anyway?');
    expect(en).toContain('>Save anyway<');
    expect(en).toContain('>Go back<');
  });
});

describe('pre-filled roster (名簿を貼り付け)', () => {
  const PENDING = [
    { id: 'e1', email: 'yamada@ryukokurg.ed.jp', real_name: '山田 未来', student_number: 5 },
    { id: 'e2', email: 'kato@ryukokurg.ed.jp', real_name: '加藤 三郎', student_number: 3 },
  ];

  it('the 名簿 has ＋ 名簿を貼り付け next to ＋ 生徒を追加', () => {
    const h = page();
    expect(h).toMatch(/＋ 名簿を貼り付け[^]*＋ 生徒を追加/);
    expect(page({ detail: { ...DETAIL, class: { ...DETAIL.class, archived: true } } })).not.toContain('＋ 名簿を貼り付け');
  });

  it('未ログイン rows sit in 出席番号 order with everyone else, counted apart in the title', () => {
    const h = page({ pending: PENDING });
    expect(h).toContain('生徒 (3 + 未ログイン 2)');
    const roster = h.slice(h.indexOf('data-roster'));
    const order = ['加藤 三郎', '加藤 次郎', '山田 未来', '佐藤 一郎', '上田 花'].map((n) => roster.indexOf(n));
    expect(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1]))).toBe(true);
    expect(roster.match(/data-pending-tag/g)).toHaveLength(2);
    expect(roster).toContain('yamada@ryukokurg.ed.jp');
    // 加藤 次郎 (member) and 加藤 三郎 (未ログイン) share 3
    expect(roster.match(/data-duplicate-number/g)).toHaveLength(2);
    // only members can be chosen for tickets
    expect(roster.match(/role="checkbox"/g)).toHaveLength(3);
    expect(page()).toContain('生徒 (3)');
  });

  it('a 未ログイン row edits name, number and email, and asks before removing', () => {
    const edit = renderToStaticMarkup(<PendingRosterRow entry={PENDING[0]} onUpdate={noop} onRemove={noop} initialMode="edit" />);
    expect(edit).toContain('value="山田 未来"');
    expect(edit).toContain('value="5"');
    expect(edit).toContain('value="yamada@ryukokurg.ed.jp"');
    expect(edit).toContain('メールアドレス');
    const remove = renderToStaticMarkup(<PendingRosterRow entry={PENDING[0]} onUpdate={noop} onRemove={noop} initialMode="remove" />);
    expect(remove).toContain('山田 未来 を名簿から外しますか？');
  });

  it('the class list counts members, plus 未ログイン when there are some', () => {
    const h = renderToStaticMarkup(<TeacherTab classes={CLASSES} pendingCounts={{ c1: 4 }} onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />);
    expect(h).toContain('31人 + 未ログイン 4');
    expect(h).toContain('>1人<');
    setLang('en');
    const en = renderToStaticMarkup(<TeacherTab classes={CLASSES} pendingCounts={{ c2: 1 }} onToggleArchived={noop} onOpen={noop} onCreate={noop} defaultYear={2026} />);
    expect(en).toContain('1 student + 1 not signed in');
    expect(en).toContain('31 students');
  });
});
