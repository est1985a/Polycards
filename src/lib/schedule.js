// When the next reviews are: the 次の復習 line on My Cards and the review plan pop-up.
// Pure functions. Times are milliseconds (Date.now() style).
//
// "Today", "tomorrow" and clock hours are always Japan time, whatever the device is set to.
// Japan has no daylight saving time, so Japan time is simply UTC + 9 hours.
import { isMastered, LEVEL_HOURS } from './srs';
import { t } from '../i18n';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const JST = 9 * HOUR;

// A Date whose getUTC…() parts are the Japan-time clock.
const jstClock = (time) => new Date(time + JST);

// The coming midnight (end of today) and the end of tomorrow, Japan time.
export function jstDayBounds(now) {
  const midnight = Math.floor((now + JST) / DAY) * DAY + DAY - JST;
  return { midnight, endOfTomorrow: midnight + DAY };
}

// The Japan date a time falls on, as 'YYYY-MM-DD' (the same as the day column in user_study_daily).
export function jstDateKey(time) {
  return jstClock(time).toISOString().slice(0, 10);
}

// Start of the Japan-time clock hour a time falls in (18:42 → 18:00).
export function jstHourStart(time) {
  return Math.floor((time + JST) / HOUR) * HOUR - JST;
}

// "18:00"
function hourLabel(time) {
  return `${String(jstClock(time).getUTCHours()).padStart(2, '0')}:00`;
}

// How long until a review: 45分後 (under 1 hour), 2時間後 (under 24 hours), else a date like 10月15日.
// Minutes and hours are rounded up, so a student never comes back to find nothing due.
export function nextReviewWhen(time, now) {
  const wait = time - now;
  const minutes = Math.max(1, Math.ceil(wait / MINUTE));
  if (minutes < 60) return t("time.minutesLater", { n: minutes });
  if (wait < DAY) return t("time.hoursLater", { n: Math.ceil(wait / HOUR) });
  const d = jstClock(time);
  return t("time.monthDay", { month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

// The 次の復習 line, from fetchNextReview()'s { at, count }, or null when there is nothing to show.
// tappable: the review is today or tomorrow, so the review plan pop-up has something to show.
export function nextReviewSummary(next, now) {
  if (!next || next.count <= 0 || next.at <= now) return null;
  return {
    text: t("myCards.nextReview", { when: nextReviewWhen(next.at, now), n: next.count }),
    tappable: next.at < jstDayBounds(now).endOfTomorrow,
  };
}

// Review plan: cards due later today and tomorrow, one entry per Japan-time hour that has cards.
// rows: user_cards rows with next_review_at and level. Mastered cards, cards with no review time,
// cards already due and cards after tomorrow are left out.
// Returns { today: { hours: [{ label: '18:00', count, runningTotal }], total }, tomorrow: { … } }.
export function groupReviewPlan(rows, now) {
  const { midnight, endOfTomorrow } = jstDayBounds(now);
  const byHour = { today: new Map(), tomorrow: new Map() };
  for (const row of rows) {
    if (!row.next_review_at || isMastered(row.level)) continue;
    const time = Date.parse(row.next_review_at);
    if (!(time > now && time < endOfTomorrow)) continue;
    const hours = byHour[time < midnight ? 'today' : 'tomorrow'];
    const hour = jstHourStart(time);
    hours.set(hour, (hours.get(hour) || 0) + 1);
  }
  // runningTotal: cards waiting by that hour if the student doesn't review, carried on from 今日 into 明日.
  let runningTotal = 0;
  const section = (hours) => {
    const list = [...hours].sort(([a], [b]) => a - b).map(([hour, count]) => {
      runningTotal += count;
      return { label: hourLabel(hour), count, runningTotal };
    });
    return { hours: list, total: list.reduce((sum, h) => sum + h.count, 0) };
  };
  const today = section(byHour.today);
  return { today, tomorrow: section(byHour.tomorrow) };
}

// How long a level waits, in short Japanese ("4時間", "3日", "1週間", "4か月").
// Under a day → hours; under a week → days; 7–13 days → 1週間; 14–29 days → 2週間; 30+ days → months of 30 days.
export function waitLabel(hours) {
  if (hours < 24) return t("time.waitHours", { n: hours });
  const days = hours / 24;
  if (days < 7) return t("time.waitDays", { n: Math.round(days) });
  if (days < 14) return t("time.waitOneWeek");
  if (days < 30) return t("time.waitTwoWeeks");
  return t("time.waitMonths", { n: Math.round(days / 30) });
}

// The level ladder in the "What is Polycards?" pop-up: Lv1 to Lv7 and their waits, from LEVEL_HOURS
// (Lv0 is a new card, so it isn't a step). Mastered comes after the last step.
export function levelLadder() {
  return LEVEL_HOURS.slice(1).map((hours, i) => ({ level: i + 1, label: waitLabel(hours) }));
}
