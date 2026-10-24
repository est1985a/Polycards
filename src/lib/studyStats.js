// Stats page (学習の記録): streaks, the study calendar and the daily chart. Pure functions.
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

// The last n days, oldest → newest, ending today: [{ day, reviews }] (0 for days with no reviews).
export function lastNDays(days, today, n) {
  const map = studyMap(days);
  const t = dayNumber(today);
  return Array.from({ length: n }, (_, i) => {
    const d = t - (n - 1 - i);
    return { day: dayKey(d), reviews: map.get(d) ?? 0 };
  });
}

// Study calendar: `weeks` columns, oldest first, the last one being this week. Each column is
// 7 cells, Sunday → Saturday: { day, reviews, isToday, future } (days after today are future, with 0 reviews).
export function calendarWeeks(days, today, weeks = 12) {
  const map = studyMap(days);
  const t = dayNumber(today);
  const weekday = new Date(t * DAY).getUTCDay(); // 0 = Sunday
  const firstSunday = t - weekday - (weeks - 1) * 7;
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, r) => {
      const d = firstSunday + w * 7 + r;
      const future = d > t;
      return { day: dayKey(d), reviews: future ? 0 : map.get(d) ?? 0, isToday: d === t, future };
    }));
}

// Calendar shade for a day's reviews: 0 (none) to 4 (100 or more).
export function shade(reviews) {
  if (!(reviews > 0)) return 0;
  if (reviews < 20) return 1;
  if (reviews < 50) return 2;
  if (reviews < 100) return 3;
  return 4;
}
