import { useState } from 'react';
import { colors, fontDisplay, panel, btnLink } from '../styles/theme';
import {
  currentStreak, bestStreak, daysStudied, shade, monthOf, addMonths, compareMonths, monthRange, monthDays, monthGrid, monthTotals,
} from '../lib/studyStats';
import { t, tx } from '../i18n';

const fmt = (n) => n.toLocaleString('en-US');

// Calendar square colors: shade 0 is an empty square, 1–4 the accent color at increasing strength.
const SHADES = [
  colors.surface2,
  `color-mix(in srgb, ${colors.accent} 30%, ${colors.surface})`,
  `color-mix(in srgb, ${colors.accent} 55%, ${colors.surface})`,
  `color-mix(in srgb, ${colors.accent} 80%, ${colors.surface})`,
  colors.accent,
];

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]; // Sunday first
// Sunday in the danger color and Saturday in accentText (accent itself is never used for text).
const weekdayColor = (i) => (i === 0 ? colors.danger : i === 6 ? colors.accentText : colors.muted);
// Days labeled under the review chart (plus the last day of the month).
const CHART_LABELS = [1, 5, 10, 15, 20, 25];

const monthName = ({ year, month }) => t("stats.monthTitle", { year, month });
// "10月22日：12レビュー" for a day ({ day, date, reviews } from monthDays).
const dayDetail = (cell) => t("stats.dayDetail", {
  date: t("stats.date", { month: Number(cell.day.slice(5, 7)), day: cell.date }), n: fmt(cell.reviews), count: cell.reviews,
});
// Tapping the selected day again clears it; days with no reviews can't be selected.
const toggleDay = (selectedDay, cell) => (selectedDay === cell.day ? null : cell.day);

function Card({ title, children }) {
  return (
    <section style={{ ...panel, display: "grid", gap: 14 }}>
      {title && <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</h3>}
      {children}
    </section>
  );
}

function StreakCard({ days, today }) {
  const { count, todayDone } = currentStreak(days, today);
  const best = bestStreak(days);
  const hint = count === 0 ? t("stats.streakStart") : !todayDone ? t("stats.streakKeep") : null;
  return (
    <Card>
      <div data-streak="" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 22, color: colors.text, lineHeight: 1.1 }}>
        {tx("stats.streakDays", { n: <span style={{ fontSize: 56, color: colors.gold }}>{fmt(count)}</span>, count })}
      </div>
      <div style={{ fontSize: 14, color: colors.muted }}>{t("stats.streakBest", { n: fmt(best), count: best })}</div>
      {hint && <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{hint}</div>}
    </Card>
  );
}

function Legend() {
  return (
    <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, color: colors.muted }}>
      <span style={{ marginRight: 2 }}>{t("stats.less")}</span>
      {SHADES.map((fill, i) => <span key={i} data-shade={i} style={{ width: 14, height: 14, borderRadius: 3, background: fill }} />)}
      <span style={{ marginLeft: 2 }}>{t("stats.more")}</span>
    </div>
  );
}

function MonthButton({ label, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 44, height: 44, borderRadius: "50%", border: `2px solid ${colors.line}`, background: colors.surface2, padding: 0,
        color: colors.text, fontFamily: fontDisplay, fontWeight: 700, fontSize: 22, lineHeight: 1,
        opacity: disabled ? 0.35 : 1, cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

// One day of the calendar: its date number on the day's shade. Days with reviews are buttons
// (tap = show that day's reviews under the grid); future days have no fill and a dimmed number.
function DayCell({ cell, selected, onSelect }) {
  const level = shade(cell.reviews);
  const style = {
    display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1", minWidth: 0, borderRadius: 8,
    background: cell.future ? "transparent" : SHADES[level],
    color: cell.future ? colors.muted : level >= 3 ? colors.accentInk : colors.text,
    opacity: cell.future ? 0.5 : 1,
    outline: cell.isToday ? `2px solid ${colors.text}` : "none", outlineOffset: 1,
    boxShadow: selected ? `inset 0 0 0 3px ${colors.gold}` : "none",
    fontFamily: fontDisplay, fontWeight: 700, fontSize: 14,
  };
  if (cell.reviews > 0) {
    return (
      <button
        data-day={cell.day} data-shade={level} aria-label={dayDetail(cell)} aria-pressed={selected}
        onClick={() => onSelect(cell)}
        style={{ ...style, border: "none", padding: 0, cursor: "pointer" }}
      >
        {cell.date}
      </button>
    );
  }
  return <span data-day={cell.day} data-shade={cell.future ? "future" : level} style={style}>{cell.date}</span>;
}

// Month calendar. month: { year, month } shown; ‹ › move between the first study month and this
// month (onMonth). selectedDay / onSelect: the tapped day, shared with the review chart.
export function MonthCalendar({ days, today, month, selectedDay = null, onMonth = () => {}, onSelect = () => {} }) {
  const range = monthRange(days, today);
  const canPrev = compareMonths(month, range.first) > 0;
  const canNext = compareMonths(month, range.last) < 0;
  const weeks = monthGrid(days, month.year, month.month, today);
  const selected = weeks.flat().find((c) => c && c.day === selectedDay && c.reviews > 0);
  const grid = { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, width: "100%", maxWidth: 420, margin: "0 auto" };
  return (
    <Card title={t("stats.calendarTitle")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", maxWidth: 420, margin: "0 auto" }}>
        <MonthButton label={t("stats.prevMonth")} disabled={!canPrev} onClick={() => onMonth(addMonths(month, -1))}>‹</MonthButton>
        <span data-month="" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.text }}>{monthName(month)}</span>
        <MonthButton label={t("stats.nextMonth")} disabled={!canNext} onClick={() => onMonth(addMonths(month, 1))}>›</MonthButton>
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={grid}>
          {WEEKDAYS.map((i) => (
            <span key={i} data-weekday={i} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: weekdayColor(i) }}>{t(`stats.weekday${i}`)}</span>
          ))}
        </div>
        <div data-grid="" style={grid}>
          {weeks.flat().map((cell, i) => (cell
            ? <DayCell key={cell.day} cell={cell} selected={cell === selected} onSelect={(c) => onSelect(toggleDay(selectedDay, c))} />
            : <span key={`blank-${i}`} data-blank="" />))}
        </div>
      </div>
      <div role="status" style={{ minHeight: 22, textAlign: "center", fontSize: 15, fontWeight: 700, color: colors.text }}>
        {selected ? dayDetail(selected) : ""}
      </div>
      <div style={{ textAlign: "center", fontSize: 13, color: colors.muted, marginTop: -8 }}>
        {t("stats.monthStudied", { n: monthTotals(days, month.year, month.month, today).studied })}
      </div>
      <Legend />
    </Card>
  );
}

// Reviews per day of the month the calendar shows. Only the selected day's number is shown (above
// its bar); bars with reviews can be tapped to select that day, the same as on the calendar.
export function MonthChart({ days, today, month, selectedDay = null, onSelect = () => {} }) {
  const list = monthDays(days, month.year, month.month, today);
  const max = Math.max(1, ...list.map((d) => d.reviews));
  const total = monthTotals(days, month.year, month.month, today).reviews;
  return (
    <Card title={`${t("stats.chartMonthTitle")} ${monthName(month)}`}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 130, borderBottom: `2px solid ${colors.line}` }}>
          {list.map((d) => {
            const selected = d.day === selectedDay && d.reviews > 0;
            const bar = (
              <>
                {selected && (
                  <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 12, color: colors.text, whiteSpace: "nowrap" }}>{fmt(d.reviews)}</span>
                )}
                <span
                  style={{
                    display: "block", width: "100%", maxWidth: 14, borderRadius: "3px 3px 0 0",
                    height: d.future || d.reviews === 0 ? 0 : `max(3px, ${(d.reviews / max) * 96}px)`,
                    background: d.isToday ? colors.accent : colors.muted,
                    outline: selected ? `2px solid ${colors.text}` : "none", outlineOffset: 1,
                  }}
                />
              </>
            );
            const column = {
              flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 3,
            };
            return d.reviews > 0 ? (
              <button
                key={d.day} data-bar={d.day} aria-label={dayDetail(d)} aria-pressed={selected}
                onClick={() => onSelect(toggleDay(selectedDay, d))}
                style={{ ...column, background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
              >
                {bar}
              </button>
            ) : (
              <div key={d.day} data-bar={d.day} style={column}>{bar}</div>
            );
          })}
        </div>
        <div aria-hidden="true" style={{ display: "flex", gap: 2 }}>
          {list.map((d) => (
            <span
              key={d.day}
              style={{
                flex: 1, minWidth: 0, textAlign: "center", whiteSpace: "nowrap", overflow: "visible",
                fontFamily: fontDisplay, fontSize: 11, color: d.isToday ? colors.text : colors.muted, fontWeight: d.isToday ? 700 : 400,
              }}
            >
              {CHART_LABELS.includes(d.date) || d.date === list.length ? d.date : ""}
            </span>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 13, color: colors.muted }}>{t("stats.monthReviews", { n: fmt(total), count: total })}</div>
    </Card>
  );
}

function TotalsCard({ days, totals, wide }) {
  const tiles = [
    ["stats.totalReviews", fmt(totals.reviews)],
    ["stats.totalDays", fmt(daysStudied(days))],
    ["stats.totalSpelled", fmt(totals.spelled_correctly)],
    ["stats.totalBonus", t("stats.points", { n: fmt(totals.bonus_points) })],
  ];
  return (
    <Card title={t("stats.totalsTitle")}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${wide ? 4 : 2}, minmax(0, 1fr))`, gap: 10 }}>
        {tiles.map(([label, value]) => (
          <div key={label} style={{ background: colors.surface2, borderRadius: 14, padding: "12px 12px", display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, color: colors.muted }}>{t(label)}</span>
            <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, color: colors.gold, lineHeight: 1.1 }}>{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TroubleCard({ trouble }) {
  return (
    <Card title={t("stats.troubleTitle")}>
      <div style={{ fontSize: 13, color: colors.muted, marginTop: -6 }}>{t("stats.troubleNote")}</div>
      {trouble.length === 0 ? (
        <div style={{ fontSize: 15, color: colors.text }}>{t("stats.troubleEmpty")}</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {trouble.map((w) => (
            <li
              key={w.word_id}
              data-trouble={w.word_id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: colors.surface2 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div lang="en" style={{ fontWeight: 700, fontSize: 16, color: colors.text, overflowWrap: "anywhere" }}>{w.english}</div>
                <div style={{ fontSize: 13, color: colors.muted, overflowWrap: "anywhere" }}>{w.japanese}</div>
              </div>
              <span
                style={{
                  flexShrink: 0, padding: "2px 8px", borderRadius: 999, border: `2px solid ${colors.level(w.lowest_level)}`,
                  fontFamily: fontDisplay, fontWeight: 700, fontSize: 12, color: colors.text,
                }}
              >
                {t("stats.chartLevel", { n: w.lowest_level })}
              </span>
              <span style={{ flexShrink: 0, minWidth: 44, textAlign: "right", fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, color: colors.text }}>
                {t("stats.troubleCount", { n: w.misses })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// 学習の記録 / My Stats (view "stats" in App.jsx). Effort only: never got_it / not_yet or accuracy.
// data: { days, totals, trouble } from fetchStudyDays / fetchStudyTotals / fetchTroubleWords, null while
// loading. error: the load error message. today: today's Japan date ('YYYY-MM-DD', jstDateKey()).
export default function StatsScreen({ data, error = null, today, onBack, wide = false }) {
  // The month shown by both the calendar and the chart (starts on this month), and the tapped day.
  const [month, setMonth] = useState(() => monthOf(today));
  const [selectedDay, setSelectedDay] = useState(null);
  const changeMonth = (next) => { setMonth(next); setSelectedDay(null); };
  const noStudy = data && daysStudied(data.days) === 0;
  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <div>
        <button onClick={onBack} style={{ ...btnLink, minHeight: 44 }}>{t("settings.back")}</button>
      </div>
      <h2 style={{ margin: 0, fontWeight: 700, fontSize: 30 }}>{t("stats.pageTitle")}</h2>

      {error ? (
        <div role="alert" style={{ ...panel, fontSize: 14, color: colors.danger }}>{error}</div>
      ) : !data ? (
        <div style={{ ...panel, color: colors.muted }}>{t("common.loading")}</div>
      ) : noStudy ? (
        <div style={{ ...panel, fontSize: 15, color: colors.text }}>{t("stats.empty")}</div>
      ) : (
        <>
          <StreakCard days={data.days} today={today} />
          <MonthCalendar days={data.days} today={today} month={month} selectedDay={selectedDay} onMonth={changeMonth} onSelect={setSelectedDay} />
          <MonthChart days={data.days} today={today} month={month} selectedDay={selectedDay} onSelect={setSelectedDay} />
          <TotalsCard days={data.days} totals={data.totals} wide={wide} />
          <TroubleCard trouble={data.trouble} />
        </>
      )}
    </div>
  );
}
