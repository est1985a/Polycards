// 名簿を貼り付け (teacher, class page → 名簿): reading rows pasted from Excel / Google Sheets
// (tab-separated) or CSV, and the preview before saving. Pure functions. Columns, in this order:
// 出席番号, 名前, メールアドレス. The database (add_roster_entries() in
// supabase/polycards-roster-prefill.sql) checks every row again and decides the real status.
import { cleanRealName, realNameValid, parseStudentNumber } from './classes';

// The school's Google domain. Other addresses are allowed, only flagged in the preview.
export const SCHOOL_EMAIL_DOMAIN = 'ryukokurg.ed.jp';
export const ROSTER_MAX_ROWS = 200; // same limit as add_roster_entries()

// An email as stored: NFKC (full-width → half-width), trimmed, lower case.
// Same as clean_roster_email() in the SQL.
export function cleanEmail(text) {
  return String(text ?? '').normalize('NFKC').trim().toLowerCase();
}

export function emailValid(text) {
  const email = cleanEmail(text);
  return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function isSchoolEmail(text) {
  return cleanEmail(text).endsWith(`@${SCHOOL_EMAIL_DOMAIN}`);
}

// One pasted line → its cells. A line with a tab is split on tabs (Excel / Sheets); otherwise it is
// read as CSV: commas, with "quoted cells" that may hold commas and "" for a quote.
export function splitRosterLine(line) {
  if (line.includes('\t')) return line.split('\t');
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (c === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += c;
    }
  }
  cells.push(cell);
  return cells;
}

// The pasted text → { rows, headerSkipped, tooMany }.
//   rows: [{ line (1-based line in the paste), raw (the line as pasted, trimmed), numberText,
//            studentNumber (number | null | NaN), realName, email,
//            problems: ['columns' | 'number' | 'noName' | 'name' | 'email' | 'duplicateEmail'] }]
// Each line is NFKC-normalized first (full-width digits, commas and spaces). Blank lines are
// skipped; so is the first line when it has no @ (a header row). Extra columns are ignored.
// A line with no tab and no comma (typed by hand) is split on spaces instead: see spaceCells().
// A hand-typed line such as "1 山田 太郎 taro@ryukokurg.ed.jp" → [number, name, email]: the email is
// the last word (it must have an @), the number the first word when it is 1–2 digits (optional),
// and everything in between the name (its spaces kept). null when the last word has no @.
export function spaceCells(line) {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || !words[words.length - 1].includes('@')) return null;
  const email = words.pop();
  const number = words.length > 0 && /^\d{1,2}$/.test(words[0]) ? words.shift() : '';
  return [number, words.join(' '), email];
}

export function parseRosterPaste(text) {
  const lines = String(text ?? '').split(/\r\n|\r|\n/);
  const rows = [];
  let headerSkipped = false;
  let first = true;
  lines.forEach((raw, i) => {
    const line = raw.normalize('NFKC');
    let cells = splitRosterLine(line).map((c) => c.trim());
    if (cells.every((c) => c === '')) return;
    if (cells.length < 3 && !line.includes('\t') && !line.includes(',')) cells = spaceCells(line) ?? cells;
    if (first) {
      first = false;
      if (!line.includes('@')) { headerSkipped = true; return; }
    }
    const numberText = cells[0] ?? '';
    const row = {
      line: i + 1,
      raw: line.trim(),
      numberText,
      studentNumber: parseStudentNumber(numberText),
      realName: cleanRealName(cells[1] ?? ''),
      email: cleanEmail(cells[2] ?? ''),
      problems: [],
    };
    if (cells.length < 3) row.problems.push('columns');
    else {
      if (Number.isNaN(row.studentNumber)) row.problems.push('number');
      if (row.realName === '') row.problems.push('noName');
      else if (!realNameValid(row.realName)) row.problems.push('name');
      if (!emailValid(row.email)) row.problems.push('email');
    }
    rows.push(row);
  });
  // The same address twice in one paste: every copy is an error (which name is right?).
  const counts = new Map();
  for (const r of rows) if (r.email) counts.set(r.email, (counts.get(r.email) ?? 0) + 1);
  for (const r of rows) {
    if (r.email && counts.get(r.email) > 1 && !r.problems.includes('duplicateEmail')) r.problems.push('duplicateEmail');
  }
  return { rows, headerSkipped, tooMany: rows.length > ROSTER_MAX_ROWS };
}

// The rows to send to add_roster_entries(): only rows with no problems, in order.
export function rosterPayload(parsed) {
  return parsed.rows
    .filter((r) => r.problems.length === 0)
    .map((r) => ({ student_number: r.studentNumber == null ? '' : String(r.studentNumber), real_name: r.realName, email: r.email }));
}

// A database reason → the same keys as the problems above.
const REASONS = {
  bad_email: 'email', bad_name: 'name', bad_number: 'number', duplicate_email: 'duplicateEmail',
  already_claimed: 'alreadyClaimed',
};

// The preview: every pasted row with
//   status: 'unchecked' (not sent yet) | 'added_pending' | 'added_member' | 'already_member' | 'updated' | 'error'
//   reason: the problem key when status is 'error'
//   sameNumber: another student (in this paste, on the roster, or 未ログイン) has the same 出席番号
//   outsideSchool: a valid address that isn't @ryukokurg.ed.jp (allowed, only flagged)
// results: add_roster_entries()'s answer for rosterPayload(parsed) (same order), or null.
// members / pending: the class's students (class_detail) and 未ログイン rows (class_roster_pending).
export function previewRows(parsed, results = null, members = [], pending = []) {
  let k = 0;
  const rows = parsed.rows.map((r) => {
    if (r.problems.length > 0) return { ...r, status: 'error', reason: r.problems[0] };
    const res = results ? results[k++] : null;
    if (!res) return { ...r, status: 'unchecked', reason: null };
    return {
      ...r,
      status: res.status,
      reason: res.status === 'error' ? (REASONS[res.reason] ?? 'other') : null,
    };
  });

  // 出席番号 count: the paste (rows that will be saved), plus everyone already in the class except
  // the people this paste is about (matched by email, so a re-paste doesn't warn about itself).
  const pastedEmails = new Set(rows.filter((r) => r.status !== 'error').map((r) => r.email));
  const counts = new Map();
  const add = (n) => { if (n != null && !Number.isNaN(n)) counts.set(n, (counts.get(n) ?? 0) + 1); };
  for (const m of members || []) if (!pastedEmails.has(cleanEmail(m.email))) add(m.student_number);
  for (const p of pending || []) if (!pastedEmails.has(cleanEmail(p.email))) add(p.student_number);
  for (const r of rows) if (r.status !== 'error' && r.status !== 'already_member') add(r.studentNumber);

  return rows.map((r) => ({
    ...r,
    sameNumber: r.status !== 'error' && r.studentNumber != null && (counts.get(r.studentNumber) ?? 0) > 1,
    outsideSchool: emailValid(r.email) && !isSchoolEmail(r.email),
  }));
}

// How many rows of each kind: { add (will be saved: new, signed in, updated), errors, already }.
export function previewSummary(rows) {
  const count = (fn) => rows.filter(fn).length;
  return {
    add: count((r) => ['added_pending', 'added_member', 'updated', 'unchecked'].includes(r.status)),
    errors: count((r) => r.status === 'error'),
    already: count((r) => r.status === 'already_member'),
  };
}
