import { useState } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import {
  assignmentStudents, assignmentSummary, sortAssignmentStudents, nextAssignmentSort, DEFAULT_ASSIGNMENT_SORT,
  cleanNote, noteValid,
} from '../lib/assignments';
import BackButton from './BackButton';
import { ConfirmLine, NicknameLine } from './ClassPage';
import { useAction } from '../lib/useAction';
import { ErrorText, Field, Panel } from './ClassFields';
import { DuePill, ProgressBar, StatusBadge, PartsLine } from './AssignmentParts';
import { inputStyle, ghostSmall, primarySmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';

// Columns of the per-student table. wideOnly: hidden on phones (番号 · 名前 · 状態 fit 390 px).
const COLUMNS = [
  { key: "number", align: "center", sortable: true },
  { key: "name", align: "left", sortable: true },
  { key: "status", align: "left", sortable: true },
  { key: "cards", align: "right", wideOnly: true },
];

function HeaderCell({ column, sort, onSort }) {
  const label = t(`assign.col.${column.key}`);
  if (!column.sortable) {
    return <th scope="col" style={{ padding: "0 8px", textAlign: column.align, fontSize: 13, fontWeight: 700, color: colors.muted, whiteSpace: "nowrap" }}>{label}</th>;
  }
  const active = sort.key === column.key;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} style={{ padding: 0, textAlign: column.align, whiteSpace: "nowrap" }}>
      <button
        type="button"
        onClick={() => onSort(nextAssignmentSort(sort, column.key))}
        style={{
          minHeight: 44, minWidth: 44, width: "100%", padding: "0 8px", border: "none", background: "transparent",
          display: "inline-flex", alignItems: "center", gap: 2, cursor: "pointer",
          justifyContent: column.align === "center" ? "center" : "flex-start",
          fontSize: 13, fontWeight: 700, color: active ? colors.text : colors.muted,
        }}
      >
        {label}
        <span aria-hidden="true" style={{ fontSize: 10, width: 10, color: colors.accentText }}>
          {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

// One student. 未追加 rows are muted with a dashed gold 未追加 pill, so they're easy to spot.
function StudentRow({ row, columns, onOpen }) {
  const notAdded = row.status.key === "not_added";
  const cell = { padding: "6px 8px", background: colors.surface2, verticalAlign: "middle" };
  const values = {
    number: <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: colors.gold }}>{row.student_number ?? "–"}</span>,
    name: (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        aria-label={t("studentPage.open", { name: row.real_name })}
        style={{
          minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", textAlign: "left",
          fontSize: 16, fontWeight: 700, color: notAdded ? colors.muted : colors.text,
        }}
      >
        {row.real_name}
        <NicknameLine nickname={row.nickname} />
      </button>
    ),
    status: (
      <span style={{ display: "grid", gap: 4, minWidth: 96 }}>
        <span><StatusBadge status={row.status} /></span>
        {row.status.key === "learning" && (
          <ProgressBar percent={row.status.percent} height={6} label={t("assign.statusAria", { status: t("assignment.status.learning"), n: row.status.percent })} />
        )}
      </span>
    ),
    cards: (
      <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, color: colors.muted, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
        {row.learned} / {row.total}
      </span>
    ),
  };
  const edge = (i, last) => ({
    ...(i === 0 ? { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 } : {}),
    ...(last ? { borderTopRightRadius: 12, borderBottomRightRadius: 12 } : {}),
  });
  return (
    <tr data-assignment-student="" data-not-added={notAdded ? "" : undefined} onClick={onOpen} style={{ cursor: "pointer" }}>
      {columns.map((c, i) => (
        <td key={c.key} style={{ ...cell, ...edge(i, i === columns.length - 1), textAlign: c.align }}>{values[c.key]}</td>
      ))}
    </tr>
  );
}

// 編集: the due date and note, inline.
function EditForm({ assignment, onSave, onCancel }) {
  const [due, setDue] = useState(assignment.due_date ?? "");
  const [note, setNote] = useState(assignment.note ?? "");
  const action = useAction();
  const ok = noteValid(note);
  async function save(e) {
    e.preventDefault();
    if (ok && await action.run(() => onSave(due || null, cleanNote(note) || null))) onCancel();
  }
  return (
    <form onSubmit={save} style={{ display: "grid", gap: 10 }}>
      <Field label={t("assign.dueLabel")}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
          {due && <button type="button" onClick={() => setDue("")} style={ghostSmall}>{t("assign.clearDue")}</button>}
        </div>
      </Field>
      <Field label={t("assign.noteLabel")}>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("assign.notePlaceholder")} {...noAutoFix} style={inputStyle} />
        <span style={{ display: "block", textAlign: "right", fontSize: 12, color: ok ? colors.muted : colors.danger }}>
          {t("assign.noteCount", { n: Array.from(cleanNote(note)).length })}
        </span>
      </Field>
      <ErrorText>{action.error}</ErrorText>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onCancel} disabled={action.busy} style={ghostSmall}>{t("common.cancel")}</button>
        <button type="submit" disabled={!ok || action.busy} style={{ ...primarySmall, opacity: !ok || action.busy ? 0.6 : 1 }}>
          {action.busy ? t("teacher.saving") : t("teacher.save")}
        </button>
      </div>
    </form>
  );
}

// One assignment (teacherPath.screen = 'assignment'). assignment: an assignments_for_class() row
// (null while loading or once deleted). roster: class_detail().students (names and nicknames).
// onUpdate(dueDate, note) / onDelete() return promises; onOpenStudent(id); onCsv(rows): CSVで保存.
export default function AssignmentPage({
  assignment, roster = [], className, archived = false, error = null, wide = false, now = null,
  onBack, onOpenStudent = () => {}, onUpdate, onDelete, onCsv = () => {}, initialMode = null,
}) {
  const [openedAt] = useState(() => Date.now());
  const [sort, setSort] = useState(DEFAULT_ASSIGNMENT_SORT);
  const [mode, setMode] = useState(initialMode); // null | 'edit' | 'delete'
  const del = useAction();
  const back = <div><BackButton label={className} onClick={onBack} /></div>;

  if (!assignment) {
    return (
      <div style={{ display: "grid", gap: 16, paddingTop: 8, textAlign: "left" }}>
        {back}
        {error ? <ErrorText>{error}</ErrorText> : <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>}
      </div>
    );
  }

  const rows = assignmentStudents(assignment, roster);
  const shown = sortAssignmentStudents(rows, sort);
  const summary = assignmentSummary(rows);
  const columns = COLUMNS.filter((c) => wide || !c.wideOnly);

  return (
    <div style={{ display: "grid", gap: 16, paddingTop: 8, textAlign: "left" }}>
      {back}
      <div style={{ display: "grid", gap: 6 }}>
        {assignment.source && <div style={{ fontSize: 14, color: colors.muted, overflowWrap: "anywhere" }}>{assignment.source}</div>}
        <h2 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{assignment.deck_name}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <DuePill dueDate={assignment.due_date} now={now ?? openedAt} />
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{t("assign.summary", summary)}</span>
        </div>
        {assignment.note && <div style={{ fontSize: 15, color: colors.text, overflowWrap: "anywhere" }}>{assignment.note}</div>}
        {assignment.teacher_name && <div style={{ fontSize: 13, color: colors.muted }}>{t("assign.by", { name: assignment.teacher_name })}</div>}
      </div>
      <ErrorText>{error}</ErrorText>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {!archived && mode === null && (
          <>
            <button onClick={() => setMode("edit")} style={ghostSmall}>{t("teacher.edit")}</button>
            <button onClick={() => { del.clearError(); setMode("delete"); }} style={{ ...ghostSmall, color: colors.danger }}>{t("assign.delete")}</button>
          </>
        )}
        <button onClick={() => onCsv(shown)} style={ghostSmall}>{t("csv.save")}</button>
      </div>
      {mode === "edit" && (
        <Panel title={t("teacher.edit")}>
          <EditForm assignment={assignment} onSave={onUpdate} onCancel={() => setMode(null)} />
        </Panel>
      )}
      {mode === "delete" && (
        <div>
          <ConfirmLine
            text={t("assign.deleteConfirm")} yesLabel={t("assign.delete")} danger busy={del.busy}
            onCancel={() => setMode(null)} onYes={() => del.run(onDelete)}
          />
          <ErrorText>{del.error}</ErrorText>
        </div>
      )}

      <Panel title={t("assign.tableTitle")}>
        <PartsLine data-assign-legend="" text={t("assign.legend")} sep={/\u3000| · /} style={{ fontSize: 13, color: colors.muted }} />
        {shown.length === 0 ? (
          <div style={{ fontSize: 15, color: colors.muted }}>{t("teacher.noStudents")}</div>
        ) : (
          <div style={{ overflowX: "auto", margin: "0 -4px" }}>
            <table data-assignment-table="" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", padding: "0 4px" }}>
              <thead>
                <tr>{columns.map((c) => <HeaderCell key={c.key} column={c} sort={sort} onSort={setSort} />)}</tr>
              </thead>
              <tbody>
                {shown.map((r) => <StudentRow key={r.student_id} row={r} columns={columns} onOpen={() => onOpenStudent(r.student_id)} />)}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 12, color: colors.muted }}>{t("assign.progressNote")}</div>
      </Panel>
    </div>
  );
}
