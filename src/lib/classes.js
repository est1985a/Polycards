// Classes (teacher area): join codes, real names, 出席番号 and the roster order. Pure functions.
// The database (supabase/polycards-teachers.sql) checks everything again; these only keep the
// forms friendly (e.g. the 参加 button stays off until a code has the right shape).
import { jstDateKey, jstDateTime } from './schedule';
import { t } from '../i18n';

// The letters a join code is made of: no 0/O and no 1/I/L, so a code read off the board can't be
// mistyped. Must match new_join_code() in the SQL.
export const JOIN_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;
export const REAL_NAME_MAX = 40;
export const STUDENT_NUMBER_MAX = 99;

// Full-width letters and digits (ＡＢＣ１２３, typed with a Japanese keyboard) → half-width.
function halfWidth(text) {
  return String(text ?? '').replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

// What the student typed → the code as stored: half-width, uppercase, no spaces or hyphens
// (the same clean-up as join_class() in the SQL, plus full-width letters).
export function normalizeJoinCode(text) {
  return halfWidth(text).toUpperCase().replace(/[\s\u3000\-\u30FC\u2010-\u2015]/g, '');
}

// True when the cleaned code is 6 characters, all from JOIN_CODE_CHARS.
export function isJoinCodeShaped(text) {
  const code = normalizeJoinCode(text);
  return code.length === JOIN_CODE_LENGTH && Array.from(code).every((c) => JOIN_CODE_CHARS.includes(c));
}

// The code shown in two halves (ABC DEF), easier to read off a projector.
export function splitJoinCode(code) {
  const c = String(code ?? '');
  return c.length === JOIN_CODE_LENGTH ? [c.slice(0, 3), c.slice(3)] : [c];
}

// A real name: trimmed, inner spaces (including full-width ones) collapsed to one. '' when blank.
export function cleanRealName(text) {
  return String(text ?? '').replace(/[\s\u3000]+/g, ' ').trim();
}

export function realNameValid(text) {
  const name = cleanRealName(text);
  return name.length >= 1 && Array.from(name).length <= REAL_NAME_MAX;
}

// The 出席番号 field: blank → null (it's optional), 1–99 (full-width digits too) → the number,
// anything else → NaN (invalid).
export function parseStudentNumber(text) {
  const s = halfWidth(text).trim();
  if (s === '') return null;
  if (!/^\d{1,2}$/.test(s)) return NaN;
  const n = Number(s);
  return n >= 1 && n <= STUDENT_NUMBER_MAX ? n : NaN;
}

export const studentNumberValid = (text) => !Number.isNaN(parseStudentNumber(text));

// Roster order: 出席番号 first (students without one at the end), then real name.
export function sortRoster(students) {
  return [...(students || [])].sort((a, b) => {
    const an = a.student_number ?? Infinity;
    const bn = b.student_number ?? Infinity;
    if (an !== bn) return an - bn;
    return String(a.real_name ?? '').localeCompare(String(b.real_name ?? ''), 'ja');
  });
}

// The Japanese school year (年度) a moment falls in, in Japan time: it starts on April 1,
// so January–March still belong to the year before.
export function defaultSchoolYear(time) {
  const [year, month] = jstDateKey(time).split('-').map(Number);
  return month >= 4 ? year : year - 1;
}

// The 年度 field: a 4-digit year from 2000 to 2100, else NaN.
export function parseSchoolYear(text) {
  const s = halfWidth(text).trim();
  if (!/^\d{4}$/.test(s)) return NaN;
  const n = Number(s);
  return n >= 2000 && n <= 2100 ? n : NaN;
}

export const CLASS_NAME_MAX = 40;
export function classNameValid(text) {
  const name = String(text ?? '').trim();
  return name.length >= 1 && Array.from(name).length <= CLASS_NAME_MAX;
}

// The 先生 tab's first screen (TeacherArea.jsx): the class list, not the archived ones.
export const TEACHER_START = { screen: 'classes', classId: null, archived: false };

// A saved time as "10月30日 18:05" (Japan time); '' if missing.
export function dateTimeText(at) {
  const p = jstDateTime(at);
  return p ? t('studentPage.dateTime', { date: t('stats.date', { month: p.month, day: p.day }), time: p.time }) : '';
}

// A saved time as "10月30日" (Japan time); '' if missing.
export function dateText(at) {
  const p = jstDateTime(at);
  return p ? t('stats.date', { month: p.month, day: p.day }) : '';
}

// A student page's "last active" line: last studied (last answer), else last sign-in, else not yet.
export function lastActiveText(detail) {
  if (detail?.last_studied_at) return t('studentPage.lastStudied', { when: dateTimeText(detail.last_studied_at) });
  if (detail?.student?.last_sign_in_at) return t('studentPage.lastSignIn', { when: dateTimeText(detail.student.last_sign_in_at) });
  return t('studentPage.neverActive');
}
