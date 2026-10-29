import { useState } from 'react';
import { colors, fontDisplay, panel, btnPrimary } from '../styles/theme';
import { classNameValid, parseSchoolYear } from '../lib/classes';
import NavRow from './NavRow';
import ToggleSwitch from './ToggleSwitch';
import { Field, ErrorText } from './ClassFields';
import { inputStyle, ghostSmall, primarySmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';

// The join code as a small gold pill on a class row.
function CodePill({ code }) {
  return (
    <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 14, letterSpacing: "0.12em", padding: "4px 10px", borderRadius: 999, border: `2px solid ${colors.gold}`, color: colors.gold, whiteSpace: "nowrap" }}>
      {code}
    </span>
  );
}

// ＋ クラスを作る: class name + 年度 (prefilled with this school year). onCreate(name, year) returns a
// promise; a failure stays in the form.
export function CreateClassForm({ defaultYear, onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(defaultYear));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ok = classNameValid(name) && !Number.isNaN(parseSchoolYear(year));

  async function submit(e) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setError(null);
    try {
      await onCreate(name.trim(), parseSchoolYear(year));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ ...panel, display: "grid", gap: 12, borderColor: colors.accent }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px", gap: 10 }}>
        <Field label={t("teacher.className")}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={t("teacher.classNamePlaceholder")} autoFocus {...noAutoFix} style={inputStyle} />
        </Field>
        <Field label={t("teacher.schoolYear")}>
          <input type="text" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} maxLength={4} {...noAutoFix} style={inputStyle} />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={ghostSmall}>{t("common.cancel")}</button>
        <button type="submit" disabled={!ok || busy} style={{ ...primarySmall, opacity: !ok || busy ? 0.6 : 1 }}>
          {busy ? t("teacher.creating") : t("teacher.create")}
        </button>
      </div>
    </form>
  );
}

// 先生 tab, first screen: the teacher's classes (name, 年度, students, join code), ＋ クラスを作る and
// a switch to show the archived ones instead.
// classes: rows from teacher_classes() (null while loading); error: a load error.
// onOpen(id): a class was tapped. onCreate(name, year) → promise. defaultYear: for the form.
export default function TeacherTab({
  classes, error = null, archived = false, onToggleArchived, onOpen, onCreate, defaultYear, wide = false, initialCreating = false,
}) {
  const [creating, setCreating] = useState(initialCreating);

  return (
    <div style={{ display: "grid", gap: 16, paddingTop: 8, textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, margin: 0, color: colors.text }}>{t("teacher.title")}</h2>
        {!archived && !creating && (
          <button onClick={() => setCreating(true)} style={{ ...btnPrimary, minHeight: 44 }}>{t("teacher.createClass")}</button>
        )}
      </div>

      {creating && !archived && (
        <CreateClassForm
          defaultYear={defaultYear}
          onCancel={() => setCreating(false)}
          onCreate={async (name, year) => { await onCreate(name, year); setCreating(false); }}
        />
      )}

      <button
        role="switch"
        aria-checked={archived}
        onClick={() => onToggleArchived(!archived)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44,
          padding: "0 4px", background: "transparent", border: "none", cursor: "pointer",
          fontSize: 15, fontWeight: 700, color: colors.text, textAlign: "left",
        }}
      >
        <span>{t("teacher.showArchived")}</span>
        <ToggleSwitch on={archived} />
      </button>

      <ErrorText>{error}</ErrorText>
      {classes === null && !error ? (
        <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>
      ) : classes && classes.length === 0 ? (
        <div style={{ ...panel, padding: 24, textAlign: "center", fontSize: 15, color: colors.text }}>
          {archived ? t("teacher.noArchived") : t("teacher.noClasses")}
        </div>
      ) : classes ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10, gridTemplateColumns: wide ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
          {classes.map((c) => (
            <li key={c.id}>
              <NavRow
                title={c.name}
                subtitle={t("teacher.schoolYearValue", { n: c.school_year })}
                pill={t("teacher.studentCount", { n: c.student_count })}
                badge={c.archived ? <span style={{ fontSize: 13, color: colors.muted }}>{t("teacher.archivedBadge")}</span> : <CodePill code={c.join_code} />}
                onClick={() => onOpen(c.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
