// The teacher's CSV files (Phase 4), built from data the class page already loaded (no new data
// access). Headers and words like はい / 学習中 are always Japanese (tJa), whatever the app's
// language, so the files match the school's spreadsheets. Times are Japan time. Pure functions.
import { toCsv, csvFileName } from './csv';
import { jstDateKey, jstDateTimeKey } from './schedule';
import { sortRoster } from './classes';
import { overviewRows } from './classOverview';
import { tJa } from '../i18n';

const yesNo = (on) => tJa(on ? 'csv.yes' : 'csv.no');

// 一覧: one row per student, roster order. rows: class_overview() rows with `nickname` added.
// days: the period the レビュー / 学習日数 columns cover (7 or 30).
export function overviewCsv(rows, days) {
  const header = ['number', 'name', 'nickname', 'lastStudied', 'reviews', 'studyDays', 'streak', 'rank', 'cards', 'tickets', 'flag']
    .map((k) => tJa(`csv.overview.${k}`, { n: days }));
  const body = sortRoster(overviewRows(rows)).map((r) => [
    r.student_number ?? '', r.real_name ?? '', r.nickname ?? '', jstDateTimeKey(r.last_studied_at),
    r.reviews ?? 0, r.study_days ?? 0, r.streak ?? 0, r.player_level ?? '', r.cards ?? 0, r.tickets ?? 0, yesNo(r.flagged),
  ]);
  return toCsv(header, body);
}

// One assignment: one row per student (assignmentStudents() rows), roster order.
export function assignmentCsv(rows) {
  const header = ['number', 'name', 'nickname', 'status', 'percent', 'learned', 'total', 'added']
    .map((k) => tJa(`csv.assignment.${k}`));
  const status = { not_added: 'assignment.status.notAdded', learning: 'assignment.status.learning', done: 'assignment.status.done' };
  const body = sortRoster(rows).map((r) => [
    r.student_number ?? '', r.real_name ?? '', r.nickname ?? '', tJa(status[r.status.key]),
    r.status.percent, r.learned, r.total, yesNo(r.added),
  ]);
  return toCsv(header, body);
}

// Ticket awards: one row per give (class_awards() rows), newest first.
export function awardsCsv(awards) {
  const header = ['date', 'teacher', 'amount', 'students', 'names', 'message'].map((k) => tJa(`csv.awards.${k}`));
  const body = (awards || []).map((a) => [
    jstDateTimeKey(a.created_at), a.teacher_name ?? '', a.amount, a.student_count ?? 0,
    (a.student_names || []).join(tJa('csv.nameSeparator')), a.message ?? '',
  ]);
  return toCsv(header, body);
}

// File names: 1年A組_一覧_2026-10-30.csv, 1年A組_課題_Lesson 1_2026-10-30.csv, 1年A組_チケット_2026-10-30.csv.
// kind: 'overview' | 'assignment' | 'awards'. now: a time in ms (the date is the Japan date).
export function classCsvName(className, kind, now, extra = null) {
  return csvFileName(className, tJa(`csv.kind.${kind}`), jstDateKey(now), extra);
}
