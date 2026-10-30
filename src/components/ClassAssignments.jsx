import { useState } from 'react';
import { colors } from '../styles/theme';
import { assignmentSummary } from '../lib/assignments';
import { ErrorText, Panel } from './ClassFields';
import { DuePill, ProgressBar, PartsLine } from './AssignmentParts';
import { primarySmall } from '../styles/forms';
import { t } from '../i18n';

// One assignment: pack name and source, due pill, 完了 12／30人・追加済み 25人 with two bars
// (added in accent, done in gold), › to open the per-student table.
function AssignmentRow({ assignment, now, onOpen }) {
  const s = assignmentSummary(assignment.students);
  const pct = (n) => (s.total > 0 ? Math.round((n * 100) / s.total) : 0);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("assign.open", { name: assignment.deck_name })}
        data-assignment-row=""
        style={{
          width: "100%", minHeight: 44, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
          background: colors.surface2, border: "none", borderRadius: 14, cursor: "pointer", textAlign: "left", color: colors.text,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 6 }}>
          {assignment.source && <span style={{ fontSize: 12, color: colors.muted, overflowWrap: "anywhere" }}>{assignment.source}</span>}
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 17, fontWeight: 700, overflowWrap: "anywhere" }}>{assignment.deck_name}</span>
            <DuePill dueDate={assignment.due_date} now={now} />
          </span>
          {assignment.note && <span style={{ fontSize: 14, color: colors.muted, overflowWrap: "anywhere" }}>{assignment.note}</span>}
          <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {t("assign.summary", { done: s.done, total: s.total, started: s.started })}
          </span>
          {/* Done (gold) drawn over added (accent): one bar, two layers. */}
          <span aria-hidden="true" style={{ position: "relative", display: "block" }}>
            <ProgressBar percent={pct(s.started)} />
            <span style={{ position: "absolute", inset: 0 }}><ProgressBar percent={pct(s.done)} done bare /></span>
          </span>
        </span>
        <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 22, lineHeight: 1, color: colors.muted }}>›</span>
      </button>
    </li>
  );
}

// The class page's 課題 view. assignments: assignments_for_class() rows (null while loading).
// onNew(): ＋ 課題を出す (not in archived classes). onOpen(id): an assignment was tapped.
export default function ClassAssignments({ assignments, error = null, archived = false, onNew, onOpen, now = null }) {
  const [openedAt] = useState(() => Date.now());
  return (
    <Panel
      title={t("assign.title")}
      action={!archived && <button onClick={onNew} style={primarySmall}>{t("assign.new")}</button>}
    >
      {archived && <div style={{ fontSize: 14, color: colors.muted }}>{t("assign.archivedNote")}</div>}
      {assignments?.length > 0 && <PartsLine data-assign-legend="" text={t("assign.legend")} sep={/\u3000| · /} style={{ fontSize: 13, color: colors.muted }} />}
      <ErrorText>{error}</ErrorText>
      {assignments === null ? (
        !error && <div style={{ fontSize: 14, color: colors.muted }}>{t("common.loading")}</div>
      ) : assignments.length === 0 ? (
        !archived && <div style={{ fontSize: 15, color: colors.muted }}>{t("assign.empty")}</div>
      ) : (
        <ul data-assignments="" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {assignments.map((a) => (
            <AssignmentRow key={a.id} assignment={a} now={now ?? openedAt} onOpen={() => onOpen(a.id)} />
          ))}
        </ul>
      )}
      <div style={{ fontSize: 12, color: colors.muted }}>{t("assign.progressNote")}</div>
    </Panel>
  );
}
