// Teacher area, Phase 3: the class overview table (一覧) and the class trouble words. Pure functions.
// Rows come from class_overview() and class_trouble_words() (supabase/polycards-teacher-phase3.sql).
import { jstDateKey } from './schedule';
import { dateText, sortRoster, TEACHER_START } from './classes';
import { honestyView } from './honesty';
import { t } from '../i18n';

// The period switch (Japan days, ending today).
export const OVERVIEW_PERIODS = [7, 30];
export const DEFAULT_PERIOD = TEACHER_START.days;
export const DEFAULT_SORT = TEACHER_START.sort;

// Sortable columns: how to read each value. Missing values (never studied) always go last.
const VALUES = {
  number: (r) => r.student_number ?? null,
  name: (r) => r.real_name ?? '',
  lastStudied: (r) => (r.last_studied_at ? Date.parse(r.last_studied_at) : null),
  reviews: (r) => r.reviews ?? 0,
  studyDays: (r) => r.study_days ?? 0,
  streak: (r) => r.streak ?? 0,
  rank: (r) => r.player_level ?? 0,
  cards: (r) => r.cards ?? 0,
  tickets: (r) => r.tickets ?? 0,
  flag: (r) => (r.flagged ? 1 : 0),
};
export const SORT_KEYS = Object.keys(VALUES);

// Adds `flagged` (honesty hint) and `unstudied` (no reviews in the period) to each row.
export function overviewRows(rows) {
  return (rows || []).map((r) => ({ ...r, flagged: honestyView(r.honesty).flagged, unstudied: !(r.reviews > 0) }));
}

// Rows in the chosen order. Ties fall back to the roster order (出席番号, then real name).
export function sortOverview(rows, sort = DEFAULT_SORT) {
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

// Tapping a column header: the same column flips the order; a new column starts A→Z / 1→9 for
// 番号 and 名前, and biggest / most recent first for everything else.
export function nextSort(current, key) {
  if (current?.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: key === 'number' || key === 'name' ? 'asc' : 'desc' };
}

// The 最終学習 cell: 今日 / 昨日 / N日前 (up to 6), then the date (10月3日); — when never.
// Japan dates, whatever the device timezone. now: a time in ms.
export function lastStudiedText(at, now) {
  if (!at) return t('overview.never');
  const days = Math.round((Date.parse(jstDateKey(now)) - Date.parse(jstDateKey(Date.parse(at)))) / 86400000);
  if (days <= 0) return t('overview.today');
  if (days === 1) return t('overview.yesterday');
  if (days < 7) return t('overview.daysAgo', { n: days });
  return dateText(at);
}

// コピー: one "english – japanese" line per word, for a worksheet or quiz.
export function troubleListText(words) {
  return (words || []).map((w) => `${w.english} – ${w.japanese}`).join('\n');
}
