// Tests for the teacher's student page, the roster's award parts, the award pop-ups and the shared
// stats cards (static render; taps can't run here). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StudentPage from './StudentPage';
import ClassPage, { ClassAwardsPanel } from './ClassPage';
import { AwardSteps } from './AwardSheet';
import { AwardCard } from './AwardPopup';
import { StatsBody } from './StatsScreen';
import { dateTimeText, lastActiveText } from '../lib/classes';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));
const noop = () => {};
const TODAY = '2026-10-30';

const DETAIL = {
  student: { student_id: 's1', real_name: '佐藤 一郎', student_number: 12, display_name: 'aiden', email: 'aiden@polycards.test', last_sign_in_at: '2026-10-29T00:00:00Z' },
  last_studied_at: '2026-10-30T09:05:00Z',
  avatar: null,
  peak_points: 150, bonus_points: 30, player_level: 4, tickets: 7,
  level_counts: [5, 4, 3, 2, 1, 0, 0, 0, 2],
  days: [{ day: '2026-10-29', reviews: 20, spelled_correctly: 3, bonus_points: 3 }, { day: '2026-10-30', reviews: 12, spelled_correctly: 0, bonus_points: 0 }],
  totals: { reviews: 32, spelled_correctly: 3, bonus_points: 30 },
  trouble: [{ word_id: 'w1', english: 'harvest', japanese: '収穫', misses: 3, last_missed: '2026-10-30T00:00:00Z', lowest_level: 1 }],
  packs: [{ deck_id: 1, name: '5-1', source: 'Power On I · Lesson 5', added_at: '2026-10-20T03:00:00Z' }],
  awards: [{ id: 9, teacher_name: 'アンドレ先生', amount: 3, message: 'よくがんばったね', created_at: '2026-10-30T01:00:00Z', class_name: '1年A組' }],
};

const page = (props = {}) => renderToStaticMarkup(
  <StudentPage detail={DETAIL} classTitle="1年A組" today={TODAY} onBack={noop} onGive={noop} {...props} />,
);

describe('StudentPage', () => {
  it('shows who it is, when they last studied, rank, EXP and tickets', () => {
    const h = page();
    expect(h).toContain('佐藤 一郎');
    expect(h).toContain('出席番号 12');
    expect(h).toContain('aiden@polycards.test');
    expect(h).toContain('最後の学習：10月30日 18:05');
    expect(h).toContain('Rank 4');
    expect(h).toContain('180 EXP'); // peak + spelling bonus
    expect(h).toContain('7枚');
    expect(h).toContain('チケットを贈る');
  });

  it('reuses the stats cards, cards per level, packs and award history', () => {
    const h = page();
    expect(h).toContain('data-streak');
    expect(h).toContain('harvest');
    expect(h).toContain('Power On I · Lesson 5');
    expect(h).toContain('よくがんばったね');
    expect(h).toContain('×3');
  });

  it('the avatar is a picture, not a button (the teacher can\'t open the student\'s collection)', () => {
    expect(page()).not.toContain('ポリアバター図鑑を開く');
  });

  it('no give button for an archived class, and the honesty check is not shown yet', () => {
    const h = page({ onGive: null });
    expect(h).not.toContain('チケットを贈る');
    expect(h).not.toContain('わかった率');
  });

  it('loading and errors keep the back button (the class name)', () => {
    expect(page({ detail: null })).toContain('読み込み中');
    const h = page({ detail: null, error: 'この生徒はクラスにいません' });
    expect(h).toContain('この生徒はクラスにいません');
    expect(h).toContain('1年A組');
  });

  it('a student with no study yet', () => {
    const h = page({ detail: { ...DETAIL, days: [], last_studied_at: null } });
    expect(h).toContain('まだ学習の記録がありません');
    expect(h).toContain('最後のログイン：10月29日 09:00');
  });
});

describe('StatsBody', () => {
  const data = { days: [{ day: '2026-10-29', reviews: 5 }], totals: { reviews: 5, spelled_correctly: 0, bonus_points: 0 }, trouble: [] };
  it('speaks to the student on their own page, not on the teacher view', () => {
    const self = renderToStaticMarkup(<StatsBody data={data} today={TODAY} />);
    const teacher = renderToStaticMarkup(<StatsBody data={data} today={TODAY} viewer="teacher" />);
    expect(self.length).toBeGreaterThan(teacher.length); // the streak hint is only on the student's own page
    expect(teacher).toContain('data-streak');
  });
});

describe('lastActiveText / dateTimeText', () => {
  it('falls back from last studied to last sign-in to none', () => {
    expect(lastActiveText({ last_studied_at: null, student: {} })).toBe('まだ学習していません');
    expect(dateTimeText(null)).toBe('');
    setLang('en');
    expect(dateTimeText('2026-10-30T09:05:00Z')).toBe('Oct 30 18:05');
  });
});

describe('ClassPage: giving tickets', () => {
  const CLASS = {
    class: { id: 'c1', name: '1年A組', school_year: 2026, join_code: 'ABC234', archived: false },
    students: [
      { student_id: 's1', real_name: '佐藤 一郎', student_number: 12, display_name: 'aiden' },
      { student_id: 's2', real_name: '加藤 次郎', student_number: 3, display_name: 'amaya' },
    ],
    teachers: [{ teacher_id: 't1', display_name: 'test1', is_me: true }],
  };
  const classPage = (props = {}) => renderToStaticMarkup(
    <ClassPage
      detail={CLASS} awards={[]} onBack={noop} onUpdateClass={noop} onSetArchived={noop} onRegenerate={noop}
      onUpdateMember={noop} onRemoveMember={noop} onOpenSearch={noop} onShowLarge={noop} {...props}
    />,
  );

  it('each student has a checkbox and opens their page', () => {
    const h = classPage();
    expect(h.match(/role="checkbox"/g)).toHaveLength(2);
    expect(h).toContain('佐藤 一郎さんのページを開く');
    expect(h).toContain('全員を選ぶ');
    expect(h).toMatch(/disabled=""[^>]*>チケットを贈る（0人）/);
  });

  it('chosen students count on the button', () => {
    const h = classPage({ initialSelected: ['s1', 's2'] });
    expect(h).toContain('チケットを贈る（2人）');
    expect(h).toContain('選択を解除');
    expect(h.match(/aria-checked="true"/g)).toHaveLength(2);
  });

  it('no checkboxes in an archived class', () => {
    expect(classPage({ detail: { ...CLASS, class: { ...CLASS.class, archived: true } } })).not.toContain('role="checkbox"');
  });

  it('recent awards: date, teacher, amount, students and message', () => {
    const h = renderToStaticMarkup(<ClassAwardsPanel awards={[{
      batch_id: 'b1', created_at: '2026-10-30T01:00:00Z', teacher_name: 'アンドレ先生', amount: 2, message: 'Nice!',
      student_count: 5, student_names: ['A', 'B', 'C', 'D', 'E'],
    }]} />);
    for (const text of ['最近のチケット', '10月30日 10:00', 'アンドレ先生', '×2', '5人', 'A、B、C、ほか2人', 'Nice!']) expect(h).toContain(text);
    expect(renderToStaticMarkup(<ClassAwardsPanel awards={[]} />)).toContain('まだチケットを贈っていません');
  });
});

describe('AwardSteps (teacher)', () => {
  const students = [{ student_id: 's1', real_name: '佐藤 一郎' }, { student_id: 's2', real_name: '加藤 次郎' }, { student_id: 's3', real_name: '上田 花子' }];
  const steps = (props) => renderToStaticMarkup(
    <AwardSteps students={students} amount={3} message="" onAmount={noop} onMessage={noop} onNext={noop} onBack={noop} onSend={noop} onDone={noop} {...props} />,
  );

  it('the form: who, the amount stepper and the message counter', () => {
    const h = steps({ step: 'form', message: 'よくがんばったね' });
    expect(h).toContain('贈る相手：3人');
    expect(h).toMatch(/data-amount=""[^]*3/);
    expect(h).toContain('8/60');
    expect(steps({ step: 'form', students: students.slice(0, 1) })).toContain('贈る相手：佐藤 一郎');
  });

  it('the stepper stops at 1 and 10', () => {
    expect(steps({ step: 'form', amount: 1 })).toMatch(/disabled=""[^>]*aria-label="1枚へらす"/);
    expect(steps({ step: 'form', amount: 10 })).toMatch(/disabled=""[^>]*aria-label="1枚ふやす"/);
  });

  it('a message over 60 characters stops the form', () => {
    const h = steps({ step: 'form', message: 'あ'.repeat(61) });
    expect(h).toContain('メッセージは60文字までです');
    expect(h).toMatch(/<button type="submit" disabled=""/);
  });

  it('confirm shows students × tickets and the total', () => {
    const h = steps({ step: 'confirm', message: ' よく  がんばったね ' });
    expect(h).toContain('3人 × 3枚（合計 9枚）を贈りますか？');
    expect(h).toContain('よく がんばったね');
    expect(steps({ step: 'done' })).toContain('チケットを贈りました！');
  });
});

describe('AwardCard (student pop-up)', () => {
  it('one teacher: their name, the total and each message', () => {
    const h = renderToStaticMarkup(<AwardCard awards={[
      { id: 1, teacher_name: 'アンドレ先生', amount: 3, message: 'よくがんばったね' },
      { id: 2, teacher_name: 'アンドレ先生', amount: 1, message: null },
    ]} onGacha={noop} onClose={noop} />);
    expect(h).toContain('アンドレ先生からチケット×4！');
    expect(h).toContain('アンドレ先生：よくがんばったね');
    expect(h).toContain('ガチャへ');
    expect(h).toContain('とじる');
  });

  it('several teachers are combined', () => {
    const h = renderToStaticMarkup(<AwardCard awards={[
      { id: 1, teacher_name: 'アンドレ先生', amount: 3, message: null },
      { id: 2, teacher_name: '山田先生', amount: 2, message: 'Nice!' },
    ]} onGacha={noop} onClose={noop} />);
    expect(h).toContain('先生からチケット×5！');
    expect(h).toContain('山田先生：Nice!');
  });

  it('English uses the name as it is', () => {
    setLang('en');
    const h = renderToStaticMarkup(<AwardCard awards={[{ id: 1, teacher_name: 'Mr. Horthouse', amount: 1, message: null }]} onGacha={noop} onClose={noop} />);
    expect(h).toContain('Mr. Horthouse gave you 1 ticket!');
  });
});
