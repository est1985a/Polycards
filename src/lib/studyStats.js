// Stats page (学習の記録): streaks, the month calendar and the month's review chart. Pure functions.
//
// days: user_study_daily rows [{ day: 'YYYY-MM-DD', reviews, … }] (Japan dates). today: today's
// Japan date in the same form (jstDateKey() in schedule.js). A "study day" is a day with reviews > 0.
// Dates are turned into whole day numbers in UTC, so the device's timezone never matters.
// Only effort is shown here: never got_it / not_yet or accuracy.

const DAY = 24 * 60 * 60 * 1000;

// 'YYYY-MM-DD' → a whole day number, and back.
const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / DAY;
const dayKey = (n) => new Date(n * DAY).toISOString().slice(0, 10);

// Day number → reviews, for study days only.
function studyMap(days) {
  const map = new Map();
  for (const row of days || []) {
    if (row.reviews > 0) map.set(dayNumber(row.day), row.reviews);
  }
  return map;
}

// Consecutive study days ending today. If today has no reviews yet, the streak is still alive and is
// counted back from yesterday (todayDone: false).
export function currentStreak(days, today) {
  const map = studyMap(days);
  const t = dayNumber(today);
  const todayDone = map.has(t);
  let count = 0;
  for (let d = todayDone ? t : t - 1; map.has(d); d--) count++;
  return { count, todayDone };
}

// The longest run of consecutive study days ever.
export function bestStreak(days) {
  const sorted = [...studyMap(days).keys()].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  sorted.forEach((d, i) => {
    run = i > 0 && d === sorted[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export function daysStudied(days) {
  return studyMap(days).size;
}

// A month as { year, month } (month 1–12). The month a 'YYYY-MM-DD' date is in:
export function monthOf(key) {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) };
}

// n months later (or earlier when n < 0), across years.
export function addMonths({ year, month }, n) {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// -1, 0 or 1, so months can be compared.
export function compareMonths(a, b) {
  return Math.sign(a.year * 12 + a.month - (b.year * 12 + b.month));
}

// The month of the first study day, or null when there is none.
export function firstStudyMonth(days) {
  const first = Math.min(...studyMap(days).keys());
  return Number.isFinite(first) ? monthOf(dayKey(first)) : null;
}

// The months the calendar can show: from the first study month (or this month) to this month.
export function monthRange(days, today) {
  const last = monthOf(today);
  const first = firstStudyMonth(days);
  return { first: first && compareMonths(first, last) < 0 ? first : last, last };
}

// Every day of a month: [{ day: 'YYYY-MM-DD', date (1–31), reviews, future, isToday }].
// Days after today are future, with 0 reviews.
export function monthDays(days, year, month, today) {
  const map = studyMap(days);
  const t = dayNumber(today);
  const first = Date.UTC(year, month - 1, 1) / DAY;
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length }, (_, i) => {
    const d = first + i;
    const future = d > t;
    return { day: dayKey(d), date: i + 1, reviews: future ? 0 : map.get(d) ?? 0, future, isToday: d === t };
  });
}

// Month calendar: weeks of 7 cells, Sunday first. Cells are monthDays() entries, or null for the
// blanks before the 1st and after the last day (4, 5 or 6 weeks).
export function monthGrid(days, year, month, today) {
  const list = monthDays(days, year, month, today);
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells = [...Array(lead).fill(null), ...list];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

// Study days and total reviews in a month.
export function monthTotals(days, year, month, today) {
  const list = monthDays(days, year, month, today);
  return {
    studied: list.filter((d) => d.reviews > 0).length,
    reviews: list.reduce((sum, d) => sum + d.reviews, 0),
  };
}

// Calendar shade for a day's reviews: 0 (none) to 4 (100 or more).
export function shade(reviews) {
  if (!(reviews > 0)) return 0;
  if (reviews < 20) return 1;
  if (reviews < 50) return 2;
  if (reviews < 100) return 3;
  return 4;
}
