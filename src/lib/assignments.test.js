// Tests for the assigned-pack helpers (status, due dates in Japan time, sorting). Pure. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import {
  assignmentStatus, assignmentSummary, dueInfo, dueText, dueDateText, sortMyAssignments,
  assignmentStudents, sortAssignmentStudents, nextAssignmentSort, cleanNote, noteValid, DEFAULT_ASSIGNMENT_SORT,
} from './assignments';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

// 2026-10-30 10:00 in Japan (01:00 UTC)
const NOW = Date.parse('2026-10-30T01:00:00Z');

describe('assignmentStatus', () => {
  it('not added: the pack is not in My Deck and none of its words are owned', () => {
    expect(assignmentStatus({ added: false, owned: 0, learned: 0, total: 20 })).toEqual({ key: 'not_added', percent: 0 });
  });

  it('a word owned through another pack makes it "learning", not "not added" (shared words)', () => {
    // pack B {w3, w4}: w3 was learned in pack A, both directions → 2 of 4
    expect(assignmentStatus({ added: false, owned: 2, learned: 2, total: 4 })).toEqual({ key: 'learning', percent: 50 });
    // owned but still Lv0 (just added through another pack)
    expect(assignmentStatus({ added: false, owned: 2, learned: 0, total: 4 })).toEqual({ key: 'learning', percent: 0 });
  });

  it('added but nothing learned yet = learning 0%', () => {
    expect(assignmentStatus({ added: true, owned: 20, learned: 0, total: 20 })).toEqual({ key: 'learning', percent: 0 });
  });

  it('rounds down, so 100% only when every card is at Lv1 or higher', () => {
    expect(assignmentStatus({ added: true, owned: 40, learned: 39, total: 40 })).toEqual({ key: 'learning', percent: 97 });
    expect(assignmentStatus({ added: true, owned: 200, learned: 199, total: 200 }).percent).toBe(99);
    expect(assignmentStatus({ added: true, owned: 6, learned: 6, total: 6 })).toEqual({ key: 'done', percent: 100 });
  });

  it('done even when the pack itself was never added (all words learned elsewhere)', () => {
    expect(assignmentStatus({ added: false, owned: 4, learned: 4, total: 4 }).key).toBe('done');
  });

  it('an empty pack is never done', () => {
    expect(assignmentStatus({ added: false, owned: 0, learned: 0, total: 0 }).key).toBe('not_added');
    expect(assignmentStatus({ added: true, owned: 0, learned: 0, total: 0 })).toEqual({ key: 'learning', percent: 0 });
    expect(assignmentStatus(null).key).toBe('not_added');
  });
});

describe('assignmentSummary', () => {
  it('counts done and started (= not 未追加) students', () => {
    const students = [
      { added: true, owned: 4, learned: 4, total: 4 },
      { added: true, owned: 4, learned: 1, total: 4 },
      { added: false, owned: 2, learned: 2, total: 4 },
      { added: false, owned: 0, learned: 0, total: 4 },
    ];
    expect(assignmentSummary(students)).toEqual({ done: 1, started: 3, total: 4 });
    expect(assignmentSummary([])).toEqual({ done: 0, started: 0, total: 0 });
  });
});

describe('due dates (Japan time)', () => {
  it('counts Japan days from today', () => {
    expect(dueInfo(null, NOW)).toEqual({ key: 'none', days: null });
    expect(dueInfo('2026-10-29', NOW)).toEqual({ key: 'overdue', days: -1 });
    expect(dueInfo('2026-10-30', NOW)).toEqual({ key: 'today', days: 0 });
    expect(dueInfo('2026-10-31', NOW)).toEqual({ key: 'soon', days: 1 });
    expect(dueInfo('2026-11-01', NOW)).toEqual({ key: 'soon', days: 2 });
    expect(dueInfo('2026-11-02', NOW)).toEqual({ key: 'later', days: 3 });
  });

  it('uses the Japan date, not the device date, around midnight', () => {
    // 23:30 UTC on Oct 29 = 08:30 on Oct 30 in Japan: due Oct 30 is today, not tomorrow
    expect(dueInfo('2026-10-30', Date.parse('2026-10-29T23:30:00Z')).key).toBe('today');
    // 14:59 UTC on Oct 30 = 23:59 in Japan: still today
    expect(dueInfo('2026-10-30', Date.parse('2026-10-30T14:59:00Z')).key).toBe('today');
    // 15:00 UTC on Oct 30 = 00:00 Oct 31 in Japan: past due
    expect(dueInfo('2026-10-30', Date.parse('2026-10-30T15:00:00Z')).key).toBe('overdue');
  });

  it('student text: あと3日 / 今日まで / 期限すぎ', () => {
    expect(dueText('2026-11-02', NOW)).toBe('あと3日');
    expect(dueText('2026-10-30', NOW)).toBe('今日まで');
    expect(dueText('2026-10-01', NOW)).toBe('期限すぎ');
    expect(dueText(null, NOW)).toBe('');
    setLang('en');
    expect(dueText('2026-10-31', NOW)).toBe('1 day left');
    expect(dueText('2026-11-02', NOW)).toBe('3 days left');
  });

  it('the date itself: 11月2日まで', () => {
    expect(dueDateText('2026-11-02')).toBe('11月2日まで');
    expect(dueDateText(null)).toBe('');
    setLang('en');
    expect(dueDateText('2026-11-02')).toBe('Due Nov 2');
  });
});

describe('sortMyAssignments', () => {
  const a = (id, due, learned, created = '2026-10-01T00:00:00Z') => ({ id, due_date: due, created_at: created, added: true, owned: 4, learned, total: 4 });
  it('not done first by nearest due date (no date last), done at the bottom', () => {
    const { open, done } = sortMyAssignments([
      a('none', null, 0), a('far', '2026-11-20', 1), a('doneA', '2026-10-01', 4), a('near', '2026-11-01', 0),
      a('none-old', null, 0, '2026-09-01T00:00:00Z'), a('doneB', '2026-11-05', 4),
    ]);
    expect(open.map((x) => x.id)).toEqual(['near', 'far', 'none-old', 'none']);
    expect(done.map((x) => x.id)).toEqual(['doneA', 'doneB']);
    expect(open[0].status).toEqual({ key: 'learning', percent: 0 });
  });
});

describe('assignment table', () => {
  const roster = [
    { student_id: 'a', real_name: '佐藤', student_number: 1, nickname: 'Sato' },
    { student_id: 'b', real_name: '鈴木', student_number: 2, nickname: null },
    { student_id: 'c', real_name: '高橋', student_number: 3 },
    { student_id: 'n', real_name: '田中', student_number: null },
  ];
  const assignment = {
    word_count: 2,
    students: [
      { student_id: 'a', added: true, owned: 4, learned: 4, total: 4 },
      { student_id: 'b', added: true, owned: 4, learned: 1, total: 4 },
      { student_id: 'c', added: false, owned: 0, learned: 0, total: 4 },
    ],
  };
  const rows = assignmentStudents(assignment, roster);
  const ids = (list) => list.map((r) => r.student_id);

  it('merges names from the roster; a student missing from the progress counts as not added', () => {
    expect(rows.map((r) => r.status.key)).toEqual(['done', 'learning', 'not_added', 'not_added']);
    expect(rows[3]).toMatchObject({ student_id: 'n', total: 4, learned: 0, added: false });
    expect(rows[0].nickname).toBe('Sato');
  });

  it('sorts by number (no number last), name and status (未追加 < 学習中 < 完了)', () => {
    expect(ids(sortAssignmentStudents(rows, DEFAULT_ASSIGNMENT_SORT))).toEqual(['a', 'b', 'c', 'n']);
    expect(ids(sortAssignmentStudents(rows, { key: 'status', dir: 'asc' }))).toEqual(['c', 'n', 'b', 'a']);
    expect(ids(sortAssignmentStudents(rows, { key: 'status', dir: 'desc' }))).toEqual(['a', 'b', 'c', 'n']);
  });

  it('a new column starts ascending, the same one flips', () => {
    expect(nextAssignmentSort(DEFAULT_ASSIGNMENT_SORT, 'status')).toEqual({ key: 'status', dir: 'asc' });
    expect(nextAssignmentSort({ key: 'status', dir: 'asc' }, 'status')).toEqual({ key: 'status', dir: 'desc' });
  });
});

describe('notes', () => {
  it('collapses spaces and allows up to 60 characters', () => {
    expect(cleanNote('  金曜日の  小テスト ')).toBe('金曜日の 小テスト');
    expect(noteValid('あ'.repeat(60))).toBe(true);
    expect(noteValid('あ'.repeat(61))).toBe(false);
    expect(noteValid('')).toBe(true);
  });
});
