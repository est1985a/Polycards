// Schools and teacher sign-up (supabase/polyvo-schools-phase1.sql). Pure functions.
import { t } from '../i18n';
// The database checks everything again; these only shape the screens and give quick hints.

// The 47 prefectures + overseas / other, in the usual north → south order. The SQL
// (school_prefecture_keys()) has the same list: a test checks they match. Labels: schools.pref.<key>.
export const PREFECTURES = [
  'hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima',
  'ibaraki', 'tochigi', 'gunma', 'saitama', 'chiba', 'tokyo', 'kanagawa',
  'niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano',
  'gifu', 'shizuoka', 'aichi', 'mie',
  'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama',
  'tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi',
  'tokushima', 'kagawa', 'ehime', 'kochi',
  'fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa',
  'overseas_other',
];

// Same as school_type_keys() in the SQL. Labels: schools.type.<key>.
export const SCHOOL_TYPES = ['jhs', 'hs', 'jhs_hs', 'elementary', 'other'];

// Labels ('' for none) and the line under a school's name: 佐賀県・中高一貫校.
export const prefLabel = (key) => (key ? t(`schools.pref.${key}`) : '');
export const typeLabel = (key) => (key ? t(`schools.type.${key}`) : '');
export function schoolLine(school) {
  return t('signup.schoolLine', { prefecture: prefLabel(school.prefecture), type: typeLabel(school.school_type) });
}

export const SCHOOL_NAME_MAX = 60;
export const TEACHER_NAME_MAX = 20;

// Like the SQL: NFKC, spaces collapsed, trimmed.
function tidy(text) {
  return String(text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

// The part after the LAST @, lower case (= email_domain() in the SQL), or null.
export function emailDomain(email) {
  const text = String(email ?? '').normalize('NFKC').trim().toLowerCase();
  const at = text.lastIndexOf('@');
  if (at < 0) return null;
  return text.slice(at + 1) || null;
}

// Is the address on one of the school's verified domains? Exact match only:
// taro@sub.school.ed.jp is NOT on school.ed.jp.
export function inDomains(email, domains) {
  const d = emailDomain(email);
  return d != null && (domains || []).includes(d);
}

// "@a.ed.jp / @b.ed.jp" for messages ('' when none).
export function domainsLabel(domains) {
  return (domains || []).map((d) => `@${d}`).join(' / ');
}

// A domain as typed by the platform admin ("@RyukokuRG.ed.jp", "ryukokurg.ed.jp.") →
// "ryukokurg.ed.jp" (= clean_domain() in the SQL, minus the free-mail check, which only the
// database does).
export function cleanDomainInput(text) {
  let v = String(text ?? '').normalize('NFKC').trim().toLowerCase();
  v = v.slice(v.lastIndexOf('@') + 1);
  return v.replace(/\.+$/, '');
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;

export function domainValid(text) {
  const v = cleanDomainInput(text);
  return v.length <= 253 && DOMAIN_RE.test(v);
}

// The admin's domain field (commas, spaces or line breaks between domains) → cleaned, no repeats.
export function parseDomainList(text) {
  const out = [];
  // Separators: whitespace, commas, and the Japanese commas U+3001 / U+FF0C (written by code,
  // because i18n/guard.test.js allows no Japanese characters here).
  let all = String(text ?? '');
  for (const comma of [0x3001, 0xff0c]) all = all.split(String.fromCharCode(comma)).join(',');
  for (const part of all.split(/[\s,]+/)) {
    const d = cleanDomainInput(part);
    if (d && !out.includes(d)) out.push(d);
  }
  return out;
}

// School name: 2–60 characters (= register_school()).
export function cleanSchoolName(text) {
  return tidy(text);
}

export function schoolNameValid(text) {
  const n = cleanSchoolName(text).length;
  return n >= 2 && n <= SCHOOL_NAME_MAX;
}

// Hiragana U+3041–3096, katakana U+30A1–30FA, ・ U+30FB, ー U+30FC, or a space.
function isKanaOrSpace(c) {
  const n = c.codePointAt(0);
  return c === ' ' || (n >= 0x3041 && n <= 0x3096) || (n >= 0x30a1 && n <= 0x30fc);
}

// ふりがな (optional): hiragana, katakana, ー, ・ and spaces, up to 60 (= register_school()).
export function schoolKanaValid(text) {
  const v = tidy(text);
  if (v === '') return true;
  return v.length <= SCHOOL_NAME_MAX && [...v].every(isKanaOrSpace);
}

// The name students see for a teacher (e.g. アンドレ先生): 1–20 (= clean_teacher_display_name()).
export function cleanTeacherName(text) {
  return tidy(text);
}

export function teacherNameValid(text) {
  const n = cleanTeacherName(text).length;
  return n >= 1 && n <= TEACHER_NAME_MAX;
}

// What the account menu offers, from my_school_status() (null = not loaded / failed):
//   'teacher'  already a teacher (the 先生 tab shows; nothing to offer)
//   'pending'  a request or a new school is waiting (承認待ち：〇〇 + キャンセル)
//   'register' a Google account that isn't a teacher (先生として登録)
//   'hidden'   anything else (not loaded, or a username / password account)
export function schoolMenuState(status) {
  if (!status) return 'hidden';
  if (status.is_teacher) return 'teacher';
  if (status.membership?.status === 'pending') return 'pending';
  if (status.google) return 'register';
  return 'hidden';
}

// The school a pending request is for (for 承認待ち：〇〇), or null.
export function pendingSchoolName(status) {
  return schoolMenuState(status) === 'pending' ? status.membership?.school?.name ?? null : null;
}

// Admin screen: schools waiting for approval first (admin_schools() already sorts; this keeps the
// screen right with any order), then the rest by name.
export function splitAdminSchools(schools) {
  const list = schools || [];
  return {
    pending: list.filter((s) => s.status === 'pending'),
    others: list.filter((s) => s.status !== 'pending'),
  };
}
