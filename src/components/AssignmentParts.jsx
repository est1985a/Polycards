import { colors, fontDisplay } from '../styles/theme';
import { dueInfo, dueText, dueDateText } from '../lib/assignments';
import { t } from '../i18n';

// Small pieces shared by the teacher's 課題 screens and the student's 課題 section.
// Gentle colors only: never the danger color, even when an assignment is past due.

const pill = {
  display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, padding: "3px 10px",
  borderRadius: 999, whiteSpace: "nowrap", background: colors.surface,
};

// The due date as a pill. Student (`relative`): あと3日 / 今日まで / 期限すぎ. Teacher: 11月2日まで,
// plus 今日まで / 期限すぎ when it applies. Soon and today in gold; later and past due muted.
// Nothing when there is no due date (the teacher sees 期限なし).
export function DuePill({ dueDate, now, relative = false }) {
  const info = dueInfo(dueDate, now);
  if (info.key === "none") {
    return relative ? null : <span data-due="none" style={{ ...pill, color: colors.muted, border: `1px solid ${colors.line}` }}>{t("assignment.noDue")}</span>;
  }
  const warm = info.key === "today" || info.key === "soon";
  const text = relative ? dueText(dueDate, now)
    : [dueDateText(dueDate), info.key === "today" ? t("assignment.dueToday") : info.key === "overdue" ? t("assignment.overdue") : null]
      .filter(Boolean).join(" · ");
  return (
    <span data-due={info.key} style={{ ...pill, color: warm ? colors.gold : colors.muted, border: `1px solid ${warm ? colors.gold : colors.line}` }}>
      {text}
    </span>
  );
}

// A thin progress bar (no animation). done: gold; otherwise accent. bare: no track of its own (a
// second layer drawn over another bar).
export function ProgressBar({ percent, done = false, label, height = 8, bare = false }) {
  const value = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}
      style={{
        height, borderRadius: 999, overflow: "hidden", boxSizing: "border-box",
        background: bare ? "transparent" : colors.surface2, border: `1px solid ${bare ? "transparent" : colors.line}`,
      }}
    >
      <div style={{ width: `${value}%`, height: "100%", borderRadius: 999, background: done ? colors.gold : colors.accent }} />
    </div>
  );
}

// 未追加 (gold outline, easy to spot) / 学習中 N% / 完了 (gold).
export function StatusBadge({ status }) {
  if (status.key === "done") {
    return <span data-status="done" style={{ ...pill, color: colors.gold, border: `1px solid ${colors.gold}` }}>✓ {t("assignment.status.done")}</span>;
  }
  if (status.key === "not_added") {
    return <span data-status="not_added" style={{ ...pill, color: colors.gold, border: `2px dashed ${colors.gold}` }}>{t("assignment.status.notAdded")}</span>;
  }
  return (
    <span data-status="learning" style={{ ...pill, color: colors.text, border: `1px solid ${colors.line}` }}>
      {t("assignment.status.learning")}
      <span style={{ fontFamily: fontDisplay, color: colors.accentText }}>{t("assignment.percent", { n: status.percent })}</span>
    </span>
  );
}

// A line made of short parts that may wrap only between parts, never inside one (so 学習中：追加して復習中
// stays together on a phone). text is split at sep; joiner is drawn between the parts.
export function PartsLine({ text, sep, joiner = null, style, ...rest }) {
  const parts = String(text).split(sep);
  return (
    <div {...rest} style={{ display: "flex", flexWrap: "wrap", columnGap: joiner ? 4 : 12, rowGap: 2, ...style }}>
      {parts.map((part, i) => (
        <span key={i} style={{ whiteSpace: "nowrap" }}>{part}{joiner && i < parts.length - 1 ? joiner : ""}</span>
      ))}
    </div>
  );
}
