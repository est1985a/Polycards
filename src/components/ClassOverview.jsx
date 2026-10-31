import { useState } from 'react';
import { colors, fontDisplay, mix } from '../styles/theme';
import { overviewRows, sortOverview, nextSort, lastStudiedText } from '../lib/classOverview';
import { ErrorText, Panel, SelectBox, SameNumberMark } from './ClassFields';
import { duplicateNumbers } from '../lib/classes';
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

// Columns, left to right: the one definition the header and every row share (a <colgroup> with
// table-layout: fixed), so a value always sits under its header in either language.
// width: px (wide / phone); name has none and takes the rest. stat: a numeric column (equal widths,
// every other one tinted as a guide line). wideOnly: hidden on phones.
const STAT = { wide: 76, phone: 52 };
const COLUMNS = [
  { key: "number", width: { wide: 64, phone: 40 } },
  { key: "name" },
  { key: "lastStudied", width: { wide: 100 }, wideOnly: true },
  { key: "reviews", width: STAT, stat: true },
  { key: "studyDays", width: STAT, stat: true },
  { key: "streak", width: STAT, stat: true, wideOnly: true },
  { key: "rank", width: STAT, stat: true, wideOnly: true },
  { key: "cards", width: STAT, stat: true, wideOnly: true },
  { key: "tickets", width: STAT, stat: true, wideOnly: true },
  { key: "flag", width: { wide: 56, phone: 36 } },
];
const CHECK_WIDTH = 44;
const NAME_MIN = { wide: 180, phone: 100 }; // below this the table scrolls sideways instead
// More students than this: the table scrolls inside its card with the header row stuck on top.
const SCROLL_AFTER = 15;

const colWidth = (c, wide) => c.width?.[wide ? "wide" : "phone"];
const align = (c) => (c.key === "name" ? "left" : "center");
// Every other stat column gets a faint tint, so the eye can follow a column down the list.
const tinted = (columns, c) => c.stat && columns.filter((x) => x.stat).indexOf(c) % 2 === 1;

const num = { fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, fontVariantNumeric: "tabular-nums" };
// Phones get less padding so the columns fit in 390 px.
const cellStyle = (wide) => ({ padding: wide ? "6px 8px" : "6px 3px", background: colors.surface2, verticalAlign: "middle" });

// sticky: the header row stays on top while the list scrolls (long classes only).
function HeaderCell({ column, sort, onSort, wide, sticky }) {
  const active = sort.key === column.key;
  const label = t(`overview.col.${column.key}`);
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      style={{
        padding: 0, textAlign: align(column), verticalAlign: "bottom",
        ...(sticky ? { position: "sticky", top: 0, zIndex: 1, background: colors.surface } : {}),
      }}
    >
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, column.key))}
        aria-label={column.key === "flag" ? label : undefined}
        style={{
          minHeight: 44, width: "100%", padding: wide ? "0 8px" : "0 1px", border: "none", background: "transparent",
          display: "flex", alignItems: "flex-end", paddingBottom: 6, cursor: "pointer",
          justifyContent: column.key === "name" ? "flex-start" : "center",
          fontSize: wide ? 13 : 12, // phones: 12 px so 学習日数 fits one 52 px column
          fontWeight: 700, lineHeight: 1.25, color: active ? colors.text : colors.muted,
        }}
      >
        {/* The arrow hangs just right of the text, so the text itself stays centered over the values. */}
        <span style={{ position: "relative", textAlign: align(column), overflowWrap: "anywhere" }}>
          {column.key === "flag" ? <FlagIcon size={16} /> : label}
          {active && (
            <span aria-hidden="true" style={{ position: "absolute", left: "100%", bottom: 1, marginLeft: 2, fontSize: 10, color: colors.accentText }}>
              {sort.dir === "asc" ? "▲" : "▼"}
            </span>
          )}
        </span>
      </button>
    </th>
  );
}

// One student's row. Tapping it (or the name, the keyboard way) opens the student page; the
// checkbox only selects.
// sameNumber: another student has the same 出席番号 (a small gold mark next to it).
function OverviewRow({ row, columns, now, wide, selectable, selected, onToggle, onOpen, sameNumber = false }) {
  const muted = row.unstudied;
  const cell = cellStyle(wide);
  const values = {
    number: (
      <span style={{ ...num, color: colors.gold, display: "inline-flex", alignItems: "center", gap: 2 }}>
        {row.student_number ?? "–"}
        {sameNumber && <SameNumberMark size={13} />}
      </span>
    ),
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
    lastStudied: <span style={{ fontSize: 14, color: muted ? colors.muted : colors.text, fontVariantNumeric: "tabular-nums" }}>{lastStudiedText(row.last_studied_at, now)}</span>,
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
        <td
          key={c.key}
          style={{
            ...cell, ...edge(selectable ? i + 1 : i, i === columns.length - 1), textAlign: align(c),
            ...(tinted(columns, c) ? { background: mix(colors.text, colors.surface2, 5) } : {}),
          }}
        >
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
  const sameNumbers = duplicateNumbers(rows);
  const scroll = shown !== null && shown.length > SCROLL_AFTER;
  const size = wide ? "wide" : "phone";
  const minWidth = (selectable ? CHECK_WIDTH : 0) + NAME_MIN[size] + columns.reduce((sum, c) => sum + (colWidth(c, wide) ?? 0), 0);
  return (
    <Panel title={t("overview.title")} action={action}>
      {toolbar}
      <ErrorText>{error}</ErrorText>
      {shown === null ? (
        !error && <div style={{ fontSize: 14, color: colors.muted }}>{t("common.loading")}</div>
      ) : shown.length === 0 ? (
        <div style={{ fontSize: 15, color: colors.muted }}>{t("teacher.noStudents")}</div>
      ) : (
        // On a narrow screen the table scrolls sideways inside this box, never the page. A long class
        // also scrolls up and down in it (max 70vh) so the sticky header row stays in view; at either
        // end the swipe carries on to the page (default overscroll), so the page still scrolls past it.
        <div data-overview-scroll={scroll ? "" : undefined} style={{ overflowX: "auto", margin: "0 -4px", ...(scroll ? { overflowY: "auto", maxHeight: "70vh" } : {}) }}>
          <table data-overview="" style={{ width: "100%", minWidth, tableLayout: "fixed", borderCollapse: "separate", borderSpacing: "0 6px", padding: "0 4px" }}>
            <colgroup>
              {selectable && <col style={{ width: CHECK_WIDTH }} />}
              {columns.map((c) => <col key={c.key} style={colWidth(c, wide) ? { width: colWidth(c, wide) } : undefined} />)}
            </colgroup>
            <thead>
              <tr>
                {selectable && <th aria-hidden="true" style={scroll ? { position: "sticky", top: 0, zIndex: 1, background: colors.surface } : undefined} />}
                {columns.map((c) => <HeaderCell key={c.key} column={c} sort={sort} onSort={onSort} wide={wide} sticky={scroll} />)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <OverviewRow
                  key={r.student_id} row={r} columns={columns} now={now ?? openedAt} wide={wide}
                  selectable={selectable} selected={selected.has(r.student_id)} onToggle={onToggle}
                  onOpen={() => onOpenStudent(r.student_id)} sameNumber={sameNumbers.has(r.student_number)}
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
