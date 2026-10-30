import { useState } from 'react';
import { colors, fontDisplay, panel } from '../styles/theme';
import {
  sortRoster, splitJoinCode, cleanRealName, realNameValid, parseStudentNumber, studentNumberValid,
  classNameValid, parseSchoolYear, dateTimeText,
} from '../lib/classes';
import BackButton from './BackButton';

import { Field, ErrorText, StudentFields } from './ClassFields';
import { inputStyle, ghostSmall, primarySmall, dangerSmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';

// Runs an action that returns a promise, with a busy flag and an error message.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function run(fn) {
    setBusy(true); setError(null);
    try {
      await fn();
      setBusy(false);
      return true;
    } catch (e) {
      setError(e.message);
      setBusy(false);
      return false;
    }
  }
  return { busy, error, run, clearError: () => setError(null) };
}

function Panel({ title, action, children }) {
  return (
    <section style={{ ...panel, display: "grid", gap: 12, alignContent: "start" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// An inline "are you sure?" line with キャンセル and a confirm button (like 復習に戻す in Mastered).
function ConfirmLine({ text, yesLabel, danger = false, busy, onYes, onCancel }) {
  return (
    <div role="group" aria-label={text} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 10, borderTop: `1px solid ${colors.line}` }}>
      <span style={{ flex: "1 1 160px", fontSize: 15, fontWeight: 700, color: colors.text }}>{text}</span>
      <button onClick={onCancel} disabled={busy} style={ghostSmall}>{t("common.cancel")}</button>
      <button onClick={onYes} disabled={busy} style={{ ...(danger ? dangerSmall : primarySmall), opacity: busy ? 0.6 : 1 }}>{busy ? "…" : yesLabel}</button>
    </div>
  );
}

// A 44 px checkbox (role="checkbox") for choosing students to give tickets to.
function SelectBox({ checked, label, onToggle }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onToggle}
      style={{ width: 44, height: 44, flexShrink: 0, display: "grid", placeItems: "center", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24, height: 24, borderRadius: 6, boxSizing: "border-box", display: "grid", placeItems: "center",
          border: `2px solid ${checked ? colors.accent : colors.line}`, background: checked ? colors.accent : colors.surface,
          color: colors.accentInk, fontSize: 16, fontWeight: 700, lineHeight: 1,
        }}
      >
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

// One student on the roster: (checkbox), 出席番号, real name, account name; tapping the name opens the
// student's page; 編集 (inline form) and 外す (inline confirm).
// selectable / selected / onToggle: the checkbox for チケットを贈る. onOpen(): open the student page.
export function RosterRow({ student, wide = false, onUpdate, onRemove, onOpen, selectable = false, selected = false, onToggle, initialMode = null }) {
  const [mode, setMode] = useState(initialMode); // null | 'edit' | 'remove'
  const [name, setName] = useState(student.real_name);
  const [number, setNumber] = useState(student.student_number == null ? "" : String(student.student_number));
  const action = useAction();
  const ok = realNameValid(name) && studentNumberValid(number);
  // Wide: account name and email; phone: just the account name (the email made rows three lines tall).
  const account = wide
    ? [student.display_name, student.email].filter((x, i, all) => x && all.indexOf(x) === i).join(" · ")
    : student.display_name || student.email;

  function startEdit() {
    setName(student.real_name);
    setNumber(student.student_number == null ? "" : String(student.student_number));
    action.clearError();
    setMode("edit");
  }

  async function save(e) {
    e.preventDefault();
    if (!ok) return;
    if (await action.run(() => onUpdate(student.student_id, cleanRealName(name), parseStudentNumber(number)))) setMode(null);
  }

  return (
    <li style={{ display: "grid", gap: 10, padding: "10px 12px", background: colors.surface2, borderRadius: 14 }}>
      {mode === "edit" ? (
        <form onSubmit={save} style={{ display: "grid", gap: 10 }} aria-label={t("teacher.editStudent", { name: student.real_name })}>
          <StudentFields
            name={name} number={number} onName={setName} onNumber={setNumber} autoFocus
            nameLabel={t("teacher.realName")} numberLabel={t("teacher.studentNumber")} numberHint={t("teacher.studentNumberHint")}
          />
          {!studentNumberValid(number) && <ErrorText>{t("errors.badStudentNumber")}</ErrorText>}
          <ErrorText>{action.error}</ErrorText>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setMode(null)} disabled={action.busy} style={ghostSmall}>{t("common.cancel")}</button>
            <button type="submit" disabled={!ok || action.busy} style={{ ...primarySmall, opacity: !ok || action.busy ? 0.6 : 1 }}>{action.busy ? t("teacher.saving") : t("teacher.save")}</button>
          </div>
        </form>
      ) : (
        // The 編集 / 外す buttons drop to a second line when the row is narrow (phones).
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          {selectable && (
            <SelectBox checked={selected} label={t("award.select", { name: student.real_name })} onToggle={() => onToggle(student.student_id)} />
          )}
          <button
            type="button"
            onClick={onOpen}
            aria-label={t("studentPage.open", { name: student.real_name })}
            style={{
              flex: "1 1 180px", minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", gap: 12, padding: 0,
              background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: colors.text,
            }}
          >
            <span style={{ width: 36, flexShrink: 0, textAlign: "center", fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: colors.gold }}>
              {student.student_number ?? "–"}
            </span>
            <span style={{ flex: 1, minWidth: 0, display: wide ? "grid" : "block", gridTemplateColumns: wide ? "minmax(0, 1fr) minmax(0, 1fr)" : undefined, alignItems: "center", gap: 12, overflowWrap: "anywhere" }}>
              <span style={{ display: "block", fontSize: 17, fontWeight: 700 }}>{student.real_name}</span>
              <span style={{ display: "block", fontSize: 13, color: colors.muted }}>{account}</span>
            </span>
            <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 22, lineHeight: 1, color: colors.muted }}>›</span>
          </button>
          {mode !== "remove" && (
            <span style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: "auto" }}>
              <button onClick={startEdit} aria-label={t("teacher.editStudent", { name: student.real_name })} style={ghostSmall}>{t("teacher.edit")}</button>
              <button onClick={() => { action.clearError(); setMode("remove"); }} style={{ ...ghostSmall, color: colors.danger }}>{t("teacher.remove")}</button>
            </span>
          )}
        </div>
      )}
      {mode === "remove" && (
        <>
          <ConfirmLine
            text={t("teacher.removeConfirm", { name: student.real_name })}
            yesLabel={t("teacher.remove")}
            danger
            busy={action.busy}
            onCancel={() => setMode(null)}
            onYes={() => action.run(() => onRemove(student.student_id))}
          />
          <ErrorText>{action.error}</ErrorText>
        </>
      )}
    </li>
  );
}

// The join code: big gold letters, コピー, 大きく表示 and 新しいコードにする (asks first).
export function JoinCodePanel({ code, archived, onShowLarge, onRegenerate }) {
  const [copyNote, setCopyNote] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const action = useAction();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyNote(t("teacher.copied"));
    } catch {
      setCopyNote(t("teacher.copyFailed"));
    }
  }

  return (
    <Panel title={t("teacher.joinCode")}>
      <div
        data-join-code=""
        lang="en"
        style={{
          display: "flex", justifyContent: "center", gap: "0.4em", padding: "8px 0",
          fontFamily: fontDisplay, fontWeight: 700, fontSize: 44, lineHeight: 1, letterSpacing: "0.12em",
          color: archived ? colors.muted : colors.gold, textDecoration: archived ? "line-through" : "none",
        }}
      >
        {splitJoinCode(code).map((p, i) => <span key={i}>{p}</span>)}
      </div>
      <div style={{ fontSize: 13, color: colors.muted }}>{archived ? t("teacher.archivedNote") : t("teacher.joinCodeHelp")}</div>
      {!archived && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={copy} style={ghostSmall}>{t("teacher.copy")}</button>
          <button onClick={onShowLarge} style={primarySmall}>{t("teacher.showLarge")}</button>
          {!confirming && <button onClick={() => { setCopyNote(null); setConfirming(true); }} style={ghostSmall}>{t("teacher.newCode")}</button>}
        </div>
      )}
      <div role="status" style={{ fontSize: 13, color: colors.muted, minHeight: copyNote ? 18 : 0 }}>{copyNote}</div>
      {confirming && (
        <ConfirmLine
          text={t("teacher.newCodeConfirm")}
          yesLabel={t("teacher.newCodeYes")}
          busy={action.busy}
          onCancel={() => setConfirming(false)}
          onYes={async () => { if (await action.run(onRegenerate)) setConfirming(false); }}
        />
      )}
      <ErrorText>{action.error}</ErrorText>
    </Panel>
  );
}

// 最近のチケット: recent awards in this class (class_awards()), one row per give. null = loading.
export function ClassAwardsPanel({ awards }) {
  return (
    <Panel title={t("award.historyTitle")}>
      {awards === null ? (
        <div style={{ fontSize: 14, color: colors.muted }}>{t("common.loading")}</div>
      ) : awards.length === 0 ? (
        <div style={{ fontSize: 14, color: colors.muted }}>{t("award.historyEmpty")}</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {awards.map((a) => {
            const names = a.student_names || [];
            const shown = names.slice(0, 3).join(t("award.nameSeparator"));
            const more = names.length - 3;
            return (
              <li key={a.batch_id} style={{ display: "grid", gap: 2, padding: "8px 12px", borderRadius: 12, background: colors.surface2, overflowWrap: "anywhere" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", fontSize: 13, color: colors.muted }}>
                  <span>{dateTimeText(a.created_at)}</span>
                  <span>{a.teacher_name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: colors.gold }}>{t("award.amountBadge", { n: a.amount })}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{t("award.studentCount", { n: a.student_count })}</span>
                  <span style={{ fontSize: 13, color: colors.muted }}>
                    {shown}{more > 0 ? `${t("award.nameSeparator")}${t("award.andMore", { n: more })}` : ""}
                  </span>
                </div>
                {a.message && <div style={{ fontSize: 14, color: colors.text }}>{a.message}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// The class's teachers, with ＋ 先生を追加.
function TeachersPanel({ teachers, onAddTeacher }) {
  return (
    <Panel title={t("teacher.teachers")} action={<button onClick={onAddTeacher} style={ghostSmall}>{t("teacher.addTeacher")}</button>}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {teachers.map((tc) => (
          <li key={tc.teacher_id} style={{ fontSize: 15, color: colors.text, overflowWrap: "anywhere" }}>
            {tc.display_name}{tc.is_me && <span style={{ color: colors.muted }}> {t("teacher.you")}</span>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// Class name and 年度 (編集), and アーカイブ / アーカイブを解除 (asks first when archiving).
function ClassSettingsPanel({ cls, onUpdateClass, onSetArchived }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(cls.name);
  const [year, setYear] = useState(String(cls.school_year));
  const action = useAction();
  const ok = classNameValid(name) && !Number.isNaN(parseSchoolYear(year));

  async function save(e) {
    e.preventDefault();
    if (ok && await action.run(() => onUpdateClass(name.trim(), parseSchoolYear(year)))) setEditing(false);
  }

  return (
    <Panel title={t("teacher.editClass")}>
      {editing ? (
        <form onSubmit={save} style={{ display: "grid", gap: 10 }}>
          <Field label={t("teacher.className")}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} {...noAutoFix} style={inputStyle} />
          </Field>
          <Field label={t("teacher.schoolYear")}>
            <input type="text" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} maxLength={4} {...noAutoFix} style={inputStyle} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setEditing(false)} disabled={action.busy} style={ghostSmall}>{t("common.cancel")}</button>
            <button type="submit" disabled={!ok || action.busy} style={{ ...primarySmall, opacity: !ok || action.busy ? 0.6 : 1 }}>{action.busy ? t("teacher.saving") : t("teacher.save")}</button>
          </div>
        </form>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => { setName(cls.name); setYear(String(cls.school_year)); action.clearError(); setEditing(true); }} style={ghostSmall}>{t("teacher.edit")}</button>
          {cls.archived ? (
            <button onClick={() => action.run(() => onSetArchived(false))} disabled={action.busy} style={ghostSmall}>{t("teacher.unarchive")}</button>
          ) : !confirming && (
            <button onClick={() => setConfirming(true)} style={{ ...ghostSmall, color: colors.danger }}>{t("teacher.archive")}</button>
          )}
        </div>
      )}
      {confirming && !cls.archived && (
        <ConfirmLine
          text={t("teacher.archiveConfirm")}
          yesLabel={t("teacher.archiveYes")}
          danger
          busy={action.busy}
          onCancel={() => setConfirming(false)}
          onYes={async () => { if (await action.run(() => onSetArchived(true))) setConfirming(false); }}
        />
      )}
      <ErrorText>{action.error}</ErrorText>
    </Panel>
  );
}

// One class (先生 tab): roster on the left, join code / teachers / class settings on the right
// (one column on phones). detail: { class, students, teachers } from class_detail() (null while loading).
// Each on… action returns a promise; the page shows its error next to the button that ran it.
// awards: recent awards (class_awards(), null while loading). onOpenStudent(id): a roster name was tapped.
// onGive(students): チケットを贈る for the checked students. initialSelected: for tests.
export default function ClassPage({
  detail, error = null, onBack, wide = false, awards = null,
  onUpdateClass, onSetArchived, onRegenerate, onUpdateMember, onRemoveMember, onOpenSearch, onShowLarge,
  onOpenStudent = () => {}, onGive = () => {}, initialSelected = [],
}) {
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const back = <div><BackButton label={t("teacher.backToClasses")} onClick={onBack} /></div>;
  if (!detail) {
    return (
      <div style={{ display: "grid", gap: 16, paddingTop: 8, textAlign: "left" }}>
        {back}
        {error ? <ErrorText>{error}</ErrorText> : <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>}
      </div>
    );
  }
  const cls = detail.class;
  const students = sortRoster(detail.students);
  // Only students still on the roster count as chosen (one may have been removed meanwhile).
  const chosen = students.filter((s) => selected.has(s.student_id));
  const allChosen = students.length > 0 && chosen.length === students.length;
  const toggle = (id) => setSelected((old) => {
    const next = new Set(old);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const canGive = !cls.archived && students.length > 0;

  return (
    <div style={{ display: "grid", gap: 16, paddingTop: 8, textAlign: "left" }}>
      {back}
      <div>
        <div style={{ fontSize: 14, color: colors.muted }}>
          {t("teacher.schoolYearValue", { n: cls.school_year })}
          {cls.archived && <span> · {t("teacher.archivedBadge")}</span>}
        </div>
        <h2 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{cls.name}</h2>
      </div>
      <ErrorText>{error}</ErrorText>

      <div style={{ display: "grid", gap: 16, alignItems: "start", gridTemplateColumns: wide ? "minmax(0, 1fr) 340px" : "1fr" }}>
        <Panel
          title={`${t("teacher.roster")} (${students.length})`}
          action={!cls.archived && <button onClick={() => onOpenSearch("student")} style={primarySmall}>{t("teacher.addStudent")}</button>}
        >
          {canGive && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => setSelected(allChosen ? new Set() : new Set(students.map((s) => s.student_id)))}
                style={ghostSmall}
              >
                {allChosen ? t("award.clearSelection") : t("award.selectAll")}
              </button>
              <button
                onClick={() => onGive(chosen)}
                disabled={chosen.length === 0}
                style={{ ...primarySmall, background: colors.gold, opacity: chosen.length === 0 ? 0.5 : 1 }}
              >
                {t("award.giveCount", { n: chosen.length })}
              </button>
            </div>
          )}
          {students.length === 0 ? (
            <div style={{ fontSize: 15, color: colors.muted }}>{t("teacher.noStudents")}</div>
          ) : (
            <ul data-roster="" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {students.map((s) => (
                <RosterRow
                  key={s.student_id} student={s} wide={wide} onUpdate={onUpdateMember} onRemove={onRemoveMember}
                  onOpen={() => onOpenStudent(s.student_id)}
                  selectable={canGive} selected={selected.has(s.student_id)} onToggle={toggle}
                />
              ))}
            </ul>
          )}
        </Panel>

        <div style={{ display: "grid", gap: 16 }}>
          <JoinCodePanel code={cls.join_code} archived={cls.archived} onShowLarge={onShowLarge} onRegenerate={onRegenerate} />
          <ClassAwardsPanel awards={awards} />
          <TeachersPanel teachers={detail.teachers} onAddTeacher={() => onOpenSearch("teacher")} />
          <ClassSettingsPanel key={`${cls.name}|${cls.school_year}`} cls={cls} onUpdateClass={onUpdateClass} onSetArchived={onSetArchived} />
        </div>
      </div>
    </div>
  );
}
