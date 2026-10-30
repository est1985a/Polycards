// Teacher area, Phase 4: assigned packs (課題). Pure functions.
// Progress rows come from assignments_for_class() / my_class_assignments()
// (supabase/polycards-teacher-phase4.sql): { added, owned, learned, total } per student, where
// total = the pack's words × 2 (both directions) and learned = those cards at Lv1 or higher.
// Progress belongs to the word, so a word learned through another pack counts too.
import { jstDateKey } from './schedule';
import { sortRoster } from './classes';
import { t } from '../i18n';

export const NOTE_MAX = 60;
// Due within this many days (and not today) = "soon" (gold); further away = "later" (muted).
export const DUE_SOON_DAYS = 2;
// The student's done assignments shown before 完了した課題をすべて表示.
export const DONE_SHOWN = 3;

const DAY = 24 * 60 * 60 * 1000;

// { key: 'not_added' | 'learning' | 'done', percent }.
//   done: every card at Lv1 or higher (100%).
//   not_added: the pack isn't in My Deck AND the student has none of its words.
//   learning: everything else (also "not added, but some words come from another pack").
// percent is rounded down, so 100 means really complete.
export function assignmentStatus(p) {
  const total = p?.total ?? 0;
  const learned = Math.min(p?.learned ?? 0, total);
  const percent = total > 0 ? Math.floor((learned * 100) / total) : 0;
  if (total > 0 && learned >= total) return { key: 'done', percent: 100 };
  if (!p?.added && !(p?.owned > 0)) return { key: 'not_added', percent: 0 };
  return { key: 'learning', percent };
}

// For the teacher's list: { done, started (= not 未追加), total } students.
export function assignmentSummary(students) {
  const list = students || [];
  let done = 0;
  let started = 0;
  for (const s of list) {
    const { key } = assignmentStatus(s);
    if (key === 'done') done += 1;
    if (key !== 'not_added') started += 1;
  }
  return { done, started, total: list.length };
}

// How far away a due date ('YYYY-MM-DD', a Japan date) is, in Japan days:
// { key: 'none' | 'overdue' | 'today' | 'soon' | 'later', days }. now: a time in ms.
export function dueInfo(dueDate, now) {
  if (!dueDate) return { key: 'none', days: null };
  const days = Math.round((Date.parse(dueDate) - Date.parse(jstDateKey(now))) / DAY);
  if (Number.isNaN(days)) return { key: 'none', days: null };
  if (days < 0) return { key: 'overdue', days };
  if (days === 0) return { key: 'today', days };
  return { key: days <= DUE_SOON_DAYS ? 'soon' : 'later', days };
}

// The student's due chip: あと3日 / 今日まで / 期限すぎ ('' when there is no due date).
export function dueText(dueDate, now) {
  const info = dueInfo(dueDate, now);
  if (info.key === 'none') return '';
  if (info.key === 'overdue') return t('assignment.overdue');
  if (info.key === 'today') return t('assignment.dueToday');
  return t('assignment.dueIn', { n: info.days });
}

// The date itself: 10月30日まで ('' when there is none).
export function dueDateText(dueDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate || '');
  if (!m) return '';
  return t('assignment.dueOn', { date: t('stats.date', { month: Number(m[2]), day: Number(m[3]) }) });
}

// The student's list: { open, done }. Open first by nearest due date (no date last, then oldest
// assignment first); done ones keep the same order.
export function sortMyAssignments(list) {
  const rows = (list || []).map((a) => ({ ...a, status: assignmentStatus(a) }));
  const order = (a, b) => {
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    }
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  };
  return {
    open: rows.filter((a) => a.status.key !== 'done').sort(order),
    done: rows.filter((a) => a.status.key === 'done').sort(order),
  };
}

// One row per student on the roster (class_detail) with their progress on one assignment.
// A student who joined after the progress was loaded counts as not added.
export function assignmentStudents(assignment, roster) {
  const progress = new Map((assignment?.students || []).map((s) => [s.student_id, s]));
  return (roster || []).map((s) => {
    const p = progress.get(s.student_id) ?? { added: false, owned: 0, learned: 0, total: (assignment?.word_count ?? 0) * 2 };
    return {
      student_id: s.student_id, real_name: s.real_name, student_number: s.student_number, nickname: s.nickname ?? null,
      added: !!p.added, owned: p.owned ?? 0, learned: p.learned ?? 0, total: p.total ?? 0,
      status: assignmentStatus(p),
    };
  });
}

// Sortable columns of the assignment table. 状態: 未追加 < 学習中 (by %) < 完了.
const VALUES = {
  number: (r) => r.student_number ?? null,
  name: (r) => r.real_name ?? '',
  status: (r) => (r.status.key === 'not_added' ? -1 : r.status.key === 'done' ? 101 : r.status.percent),
};
export const ASSIGNMENT_SORT_KEYS = Object.keys(VALUES);
export const DEFAULT_ASSIGNMENT_SORT = { key: 'number', dir: 'asc' };

// Rows in the chosen order; ties fall back to the roster order (出席番号, then real name).
// Students without a number always go last when sorting by number.
export function sortAssignmentStudents(rows, sort = DEFAULT_ASSIGNMENT_SORT) {
  const roster = sortRoster(rows);
  const value = VALUES[sort?.key];
  if (!value) return roster;
  const sign = sort.dir === 'desc' ? -1 : 1;
  const place = new Map(roster.map((r, i) => [r, i]));
  return roster.sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === null || bv === null) {
      if (av !== bv) return av === null ? 1 : -1;
    } else if (av !== bv) {
      const diff = typeof av === 'string' ? av.localeCompare(bv, 'ja') : av - bv;
      if (diff) return sign * diff;
    }
    return place.get(a) - place.get(b);
  });
}

// Tapping a column header: the same column flips the order; a new one starts ascending
// (for 状態 that puts 未追加 first, the students to talk to).
export function nextAssignmentSort(current, key) {
  if (current?.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: 'asc' };
}

// The note as saved (spaces collapsed, trimmed); same as clean_assignment_note() in the SQL.
export function cleanNote(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}
export const noteValid = (text) => Array.from(cleanNote(text)).length <= NOTE_MAX;
