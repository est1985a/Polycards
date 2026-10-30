import { useState } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { overviewRows, sortOverview, nextSort, lastStudiedText } from '../lib/classOverview';
import { ErrorText, Panel, SelectBox } from './ClassFields';
import { t } from '../i18n';

// The honesty flag: a small flag in gold (a gentle hint, never the danger color).
export function FlagIcon({ size = 20, label = null }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" role={label ? "img" : undefined}
      aria-label={label ?? undefined} aria-hidden={label ? undefined : "true"} style={{ color: colors.gold, flexShrink: 0 }}
    >
      <path d="M5 21V4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 4.5h11.5l-2.6 4 2.6 4H5" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

// Columns, left to right. wideOnly: hidden on phones (the table then fits 390 px).
const COLUMNS = [
  { key: "number", align: "center" },
  { key: "name", align: "left" },
  { key: "lastStudied", align: "left", wideOnly: true },
  { key: "reviews", align: "right" },
  { key: "studyDays", align: "right" },
  { key: "streak", align: "right", wideOnly: true },
  { key: "rank", align: "right", wideOnly: true },
  { key: "cards", align: "right", wideOnly: true },
  { key: "tickets", align: "right", wideOnly: true },
  { key: "flag", align: "center" },
];

const num = { fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, fontVariantNumeric: "tabular-nums" };
// Phones get less padding so all six columns fit in 390 px.
const cellStyle = (wide) => ({ padding: wide ? "6px 8px" : "6px 3px", background: colors.surface2, verticalAlign: "middle" });

function HeaderCell({ column, sort, onSort, wide }) {
  const active = sort.key === column.key;
  const label = t(`overview.col.${column.key}`);
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      style={{ padding: 0, textAlign: column.align, whiteSpace: "nowrap" }}
    >
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, column.key))}
        aria-label={column.key === "flag" ? label : undefined}
        style={{
          minHeight: 44, minWidth: 44, width: "100%", padding: wide ? "0 8px" : "0 2px", border: "none", background: "transparent",
          display: "inline-flex", alignItems: "center", gap: 2, cursor: "pointer",
          justifyContent: column.align === "right" ? "flex-end" : column.align === "center" ? "center" : "flex-start",
          fontSize: 13, fontWeight: 700, color: active ? colors.text : colors.muted,
        }}
      >
        {column.key === "flag" ? <FlagIcon size={16} /> : label}
        <span aria-hidden="true" style={{ fontSize: 10, width: 10, color: colors.accentText }}>
          {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

// One student's row. Tapping it (or the name, the keyboard way) opens the student page; the
// checkbox only selects.
function OverviewRow({ row, columns, now, wide, selectable, selected, onToggle, onOpen }) {
  const muted = row.unstudied;
  const cell = cellStyle(wide);
  const values = {
    number: <span style={{ ...num, color: colors.gold }}>{row.student_number ?? "–"}</span>,
    name: (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        aria-label={t("studentPage.open", { name: row.real_name })}
        style={{
          minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", textAlign: "left",
          fontSize: wide ? 16 : 15, fontWeight: 700, color: muted ? colors.muted : colors.text,
          overflowWrap: wide ? "anywhere" : "normal", // phones: names break at the space only
        }}
      >
        {row.real_name}
        {row.nickname !== undefined && (
          <span style={{ display: "block", fontSize: 12, fontWeight: 400, color: colors.muted, overflowWrap: "anywhere" }}>
            {row.nickname ?? t("teacher.noNickname")}
          </span>
        )}
      </button>
    ),
    lastStudied: <span style={{ fontSize: 14, color: muted ? colors.muted : colors.text, whiteSpace: "nowrap" }}>{lastStudiedText(row.last_studied_at, now)}</span>,
    reviews: muted ? (
      <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", padding: "2px 8px", borderRadius: 999, color: colors.muted, border: `1px solid ${colors.line}`, background: colors.surface }}>
        {t("overview.unstudied")}
      </span>
    ) : <span style={num}>{row.reviews}</span>,
    studyDays: <span style={{ ...num, color: muted ? colors.muted : colors.text }}>{row.study_days}</span>,
    streak: <span style={{ ...num, color: muted ? colors.muted : colors.text }}>{row.streak}</span>,
    rank: <span style={{ ...num, color: colors.accentText }}>{row.player_level}</span>,
    cards: <span style={num}>{row.cards}</span>,
    tickets: <span style={{ ...num, color: colors.gold }}>{row.tickets}</span>,
    flag: row.flagged ? <FlagIcon label={t("overview.flag")} /> : null,
  };
  const edge = (i, last) => ({
    ...(i === 0 ? { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 } : {}),
    ...(last ? { borderTopRightRadius: 12, borderBottomRightRadius: 12 } : {}),
  });
  return (
    <tr data-overview-row="" data-unstudied={muted ? "" : undefined} onClick={onOpen} style={{ cursor: "pointer", color: colors.text }}>
      {selectable && (
        <td style={{ ...cell, ...edge(0, false), padding: 0, width: 44 }} onClick={(e) => e.stopPropagation()}>
          <SelectBox checked={selected} label={t("award.select", { name: row.real_name })} onToggle={() => onToggle(row.student_id)} />
        </td>
      )}
      {columns.map((c, i) => (
        <td key={c.key} style={{ ...cell, ...edge(selectable ? i + 1 : i, i === columns.length - 1), textAlign: c.align }}>
          {values[c.key]}
        </td>
      ))}
    </tr>
  );
}

// 一覧: the whole class in one table (class_overview()). rows: null while loading. sort / onSort: the
// chosen column (kept in App's teacherPath). toolbar: 全員を選ぶ / チケットを贈る above the table.
// selectable / selected / onToggle: the Phase 2 checkboxes. onOpenStudent(id). now: a fixed time for tests.
// action: a button in the panel's title row (CSVで保存).
export default function ClassOverview({
  rows, error = null, days, sort, onSort, wide = false, toolbar = null, action = null,
  selectable = false, selected = new Set(), onToggle = () => {}, onOpenStudent = () => {}, now = null,
}) {
  const [openedAt] = useState(() => Date.now()); // for 今日 / 昨日 (now: tests)
  const columns = COLUMNS.filter((c) => wide || !c.wideOnly);
  const shown = rows ? sortOverview(overviewRows(rows), sort) : null;
  return (
    <Panel title={t("overview.title")} action={action}>
      {toolbar}
      <ErrorText>{error}</ErrorText>
      {shown === null ? (
        !error && <div style={{ fontSize: 14, color: colors.muted }}>{t("common.loading")}</div>
      ) : shown.length === 0 ? (
        <div style={{ fontSize: 15, color: colors.muted }}>{t("teacher.noStudents")}</div>
      ) : (
        // On a narrow screen the table scrolls sideways inside this box, never the page.
        <div style={{ overflowX: "auto", margin: "0 -4px" }}>
          <table data-overview="" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", padding: "0 4px" }}>
            <thead>
              <tr>
                {selectable && <th style={{ width: 44 }} aria-hidden="true" />}
                {columns.map((c) => <HeaderCell key={c.key} column={c} sort={sort} onSort={onSort} wide={wide} />)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <OverviewRow
                  key={r.student_id} row={r} columns={columns} now={now ?? openedAt} wide={wide}
                  selectable={selectable} selected={selected.has(r.student_id)} onToggle={onToggle}
                  onOpen={() => onOpenStudent(r.student_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 12, color: colors.muted }}>{t("overview.note", { n: days })}</div>
    </Panel>
  );
}
