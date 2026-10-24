import { colors, fontDisplay, panel, btnLink } from '../styles/theme';
import { currentStreak, bestStreak, daysStudied, lastNDays, calendarWeeks, shade } from '../lib/studyStats';
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

// Row labels of the calendar (Sunday → Saturday); only Mon, Wed and Fri are labeled.
const DAY_LABELS = [null, "stats.dayMon", null, "stats.dayWed", null, "stats.dayFri", null];

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

function Square({ level, today = false }) {
  return (
    <span
      data-shade={level}
      style={{
        display: "block", width: "100%", aspectRatio: "1", borderRadius: 3, background: SHADES[level],
        outline: today ? `2px solid ${colors.text}` : "none", outlineOffset: 1,
      }}
    />
  );
}

function CalendarCard({ days, today }) {
  const weeks = calendarWeeks(days, today, 12);
  return (
    <Card title={t("stats.calendarTitle")}>
      <div
        role="img"
        aria-label={t("stats.calendarTitle")}
        style={{ display: "grid", gridTemplateColumns: "auto repeat(12, minmax(0, 1fr))", gap: 3, maxWidth: 380 }}
      >
        {DAY_LABELS.map((label, row) => (
          <FragmentRow key={row} label={label} cells={weeks.map((week) => week[row])} />
        ))}
      </div>
      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: colors.muted }}>
        <span style={{ marginRight: 2 }}>{t("stats.less")}</span>
        {SHADES.map((_, i) => <span key={i} style={{ width: 14 }}><Square level={i} /></span>)}
        <span style={{ marginLeft: 2 }}>{t("stats.more")}</span>
      </div>
    </Card>
  );
}

// One calendar row: its label (or nothing), then the 12 weeks' squares for that weekday.
function FragmentRow({ label, cells }) {
  return (
    <>
      <span style={{ fontSize: 10, lineHeight: 1, color: colors.muted, alignSelf: "center", paddingRight: 3, whiteSpace: "nowrap" }}>
        {label ? t(label) : ""}
      </span>
      {cells.map((cell) =>
        cell.future
          ? <span key={cell.day} data-cell="future" />
          : <span key={cell.day} data-cell={cell.day}><Square level={shade(cell.reviews)} today={cell.isToday} /></span>)}
    </>
  );
}

function DailyChartCard({ days, today }) {
  const list = lastNDays(days, today, 14);
  const max = Math.max(1, ...list.map((d) => d.reviews));
  return (
    <Card title={t("stats.chartDaysTitle")}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 130 }}>
        {list.map((d) => {
          const isToday = d.day === today;
          return (
            <div key={d.day} data-bar={d.day} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 3 }}>
              {d.reviews > 0 && (
                <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 11, color: isToday ? colors.text : colors.muted }}>{fmt(d.reviews)}</span>
              )}
              <div
                style={{
                  width: "100%", maxWidth: 28, borderRadius: 4,
                  height: d.reviews > 0 ? `max(2px, ${(d.reviews / max) * 90}px)` : 0,
                  background: isToday ? colors.accent : colors.muted,
                }}
              />
              <span style={{ fontFamily: fontDisplay, fontSize: 11, color: isToday ? colors.text : colors.muted, fontWeight: isToday ? 700 : 400 }}>
                {Number(d.day.slice(8))}
              </span>
            </div>
          );
        })}
      </div>
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
          <CalendarCard days={data.days} today={today} />
          <DailyChartCard days={data.days} today={today} />
          <TotalsCard days={data.days} totals={data.totals} wide={wide} />
          <TroubleCard trouble={data.trouble} />
        </>
      )}
    </div>
  );
}
