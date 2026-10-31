import { useState } from 'react';
import { useAction } from '../lib/useAction';
import { colors, fontDisplay, panel as panelStyle } from '../styles/theme';
import {
  sortRoster, splitJoinCode, cleanRealName, realNameValid, parseStudentNumber, studentNumberValid,
  classNameValid, parseSchoolYear, dateTimeText, cleanNickname, nicknameValid, duplicateNumbers, numberConflict,
} from '../lib/classes';
import BackButton from './BackButton';
import SegmentedSwitch from './SegmentedSwitch';
import ClassOverview from './ClassOverview';
import ClassTroubleWords from './ClassTroubleWords';
import ClassLeaderboard from './ClassLeaderboard';
import ClassAssignments from './ClassAssignments';
import ToggleSwitch from './ToggleSwitch';
import { OVERVIEW_PERIODS, DEFAULT_PERIOD, DEFAULT_SORT } from '../lib/classOverview';
import { toggleId } from '../lib/library';

import { Field, ErrorText, StudentFields, Panel, SelectBox, NicknameField, DuplicateNumberTag } from './ClassFields';
import { inputStyle, ghostSmall, primarySmall, dangerSmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';


// An inline "are you sure?" line with キャンセル (or cancelLabel) and a confirm button (like 復習に戻す in Mastered).
export function ConfirmLine({ text, yesLabel, cancelLabel = null, danger = false, busy, onYes, onCancel }) {
  return (
    <div role="group" aria-label={text} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 10, borderTop: `1px solid ${colors.line}` }}>
      <span style={{ flex: "1 1 160px", fontSize: 15, fontWeight: 700, color: colors.text }}>{text}</span>
      <button type="button" onClick={onCancel} disabled={busy} style={ghostSmall}>{cancelLabel ?? t("common.cancel")}</button>
      <button type="button" onClick={onYes} disabled={busy} style={{ ...(danger ? dangerSmall : primarySmall), opacity: busy ? 0.6 : 1 }}>{busy ? "…" : yesLabel}</button>
    </div>
  );
}

// The nickname line under a real name (teachers only): ニックネーム：x, or ニックネーム未設定.
export function NicknameLine({ nickname }) {
  return (
    <span style={{ display: "block", fontSize: 13, color: colors.muted, overflowWrap: "anywhere" }}>
      {nickname ? t("teacher.nicknameValue", { name: nickname }) : t("teacher.noNickname")}
    </span>
  );
}

// One student on the roster: (checkbox), 出席番号, real name (and class nickname), account name; tapping
// the name opens the student's page; 編集 (inline form) and 外す (inline confirm).
// selectable / selected / onToggle: the checkbox for チケットを贈る. onOpen(): open the student page.
// onUpdateNickname(id, nickname): saved only when the nickname changed ('' clears it).
// sameNumber: another student has the same 出席番号 (a gold 番号重複 tag after the name).
// students: the whole roster, so changing the number to one another student has asks before saving.
export function RosterRow({
  student, students = [], wide = false, sameNumber = false, onUpdate, onUpdateNickname = async () => {}, onRemove, onOpen, selectable = false, selected = false, onToggle, initialMode = null, initialTaken = null,
}) {
  const [mode, setMode] = useState(initialMode); // null | 'edit' | 'remove'
  const [name, setName] = useState(student.real_name);
  const [number, setNumber] = useState(student.student_number == null ? "" : String(student.student_number));
  const [nickname, setNickname] = useState(student.nickname ?? "");
  const [taken, setTaken] = useState(initialTaken); // the student who already has the new number (asking first)
  const action = useAction();
  const nicknameOk = cleanNickname(nickname) === "" || nicknameValid(nickname);
  const ok = realNameValid(name) && studentNumberValid(number) && nicknameOk;
  // Wide: account name and email; phone: just the account name (the email made rows three lines tall).
  const account = wide
    ? [student.display_name, student.email].filter((x, i, all) => x && all.indexOf(x) === i).join(" · ")
    : student.display_name || student.email;

  function startEdit() {
    setName(student.real_name);
    setNumber(student.student_number == null ? "" : String(student.student_number));
    setNickname(student.nickname ?? "");
    setTaken(null);
    action.clearError();
    setMode("edit");
  }

  // 保存: a changed number that another student already has asks first (a warning, never a block).
  function save(e) {
    e.preventDefault();
    if (!ok) return;
    const n = parseStudentNumber(number);
    const other = n !== student.student_number ? numberConflict(students, n, student.student_id) : null;
    if (other) setTaken(other);
    else saveNow();
  }

  async function saveNow() {
    const nick = cleanNickname(nickname);
    if (await action.run(async () => {
      await onUpdate(student.student_id, cleanRealName(name), parseStudentNumber(number));
      if (nick !== (student.nickname ?? "")) await onUpdateNickname(student.student_id, nick);
    })) setMode(null);
    setTaken(null);
  }

  return (
    <li style={{ display: "grid", gap: 10, padding: "10px 12px", background: colors.surface2, borderRadius: 14 }}>
      {mode === "edit" ? (
        <form onSubmit={save} style={{ display: "grid", gap: 10 }} aria-label={t("teacher.editStudent", { name: student.real_name })}>
          <StudentFields
            name={name} number={number} onName={setName} onNumber={(v) => { setNumber(v); setTaken(null); }} autoFocus
            nameLabel={t("teacher.realName")} numberLabel={t("teacher.studentNumber")} numberHint={t("teacher.studentNumberHint")}
          />
          {!studentNumberValid(number) && <ErrorText>{t("errors.badStudentNumber")}</ErrorText>}
          <NicknameField value={nickname} onChange={setNickname} label={t("teacher.nicknameLabel")} hint={t("teacher.nicknameHint")} />
          {!nicknameOk && <ErrorText>{t("errors.badNickname")}</ErrorText>}
          <ErrorText>{action.error}</ErrorText>
          {taken ? (
            <NumberTakenConfirm number={parseStudentNumber(number)} other={taken} busy={action.busy} onSave={saveNow} onBack={() => setTaken(null)} />
          ) : (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setMode(null)} disabled={action.busy} style={ghostSmall}>{t("common.cancel")}</button>
              <button type="submit" disabled={!ok || action.busy} style={{ ...primarySmall, opacity: !ok || action.busy ? 0.6 : 1 }}>{action.busy ? t("teacher.saving") : t("teacher.save")}</button>
            </div>
          )}
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
            <span style={{ width: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: colors.gold }}>
              {student.student_number ?? "–"}
            </span>
            <span style={{ flex: 1, minWidth: 0, display: wide ? "grid" : "block", gridTemplateColumns: wide ? "minmax(0, 1fr) minmax(0, 1fr)" : undefined, alignItems: "center", gap: 12, overflowWrap: "anywhere" }}>
              <span style={{ display: "block" }}>
                <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{student.real_name}</span>
                  {sameNumber && <DuplicateNumberTag />}
                </span>
                <NicknameLine nickname={student.nickname} />
              </span>
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

// "Number 3 is already used by 山田 太郎. Save anyway?" with 保存する / 戻る (teachers adding a student
// or changing a number). Shared with the add-a-student form.
export function NumberTakenConfirm({ number, other, busy, onSave, onBack }) {
  return (
    <ConfirmLine
      text={t("teacher.numberTakenConfirm", { n: number, name: other.real_name })}
      yesLabel={t("teacher.saveAnyway")}
      cancelLabel={t("teacher.goBack")}
      busy={busy}
      onYes={onSave}
      onCancel={onBack}
    />
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
// onCsv(): CSVで保存 (loads up to 100 gives, then saves them); shown once there are awards.
export function ClassAwardsPanel({ awards, onCsv = null }) {
  return (
    <Panel title={t("award.historyTitle")} action={onCsv && awards?.length > 0 && <button onClick={onCsv} style={ghostSmall}>{t("csv.save")}</button>}>
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

// One teacher of the class. canRemove: 外す with an inline confirm (hidden when they're the only
// teacher; the database refuses that too, last_teacher). Removing yourself asks with its own words.
// onError(message | null): the panel shows the error, so it stays when the row is gone after a reload
// (teacher_not_in_class).
export function TeacherRow({ teacher, canRemove, onRemove, onError = () => {}, initialConfirming = false }) {
  const [confirming, setConfirming] = useState(initialConfirming);
  const [busy, setBusy] = useState(false);
  return (
    <li style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: colors.text, overflowWrap: "anywhere" }}>
          {teacher.display_name}{teacher.is_me && <span style={{ color: colors.muted }}> {t("teacher.you")}</span>}
        </span>
        {canRemove && !confirming && (
          <button
            onClick={() => { onError(null); setConfirming(true); }}
            aria-label={t("teacher.removeTeacher", { name: teacher.display_name })}
            style={{ ...ghostSmall, color: colors.danger }}
          >
            {t("teacher.remove")}
          </button>
        )}
      </div>
      {canRemove && confirming && (
        <ConfirmLine
          text={teacher.is_me ? t("teacher.leaveClassConfirm") : t("teacher.removeTeacherConfirm", { name: teacher.display_name })}
          yesLabel={teacher.is_me ? t("teacher.leaveClass") : t("teacher.remove")}
          danger
          busy={busy}
          onCancel={() => setConfirming(false)}
          onYes={async () => {
            setBusy(true); onError(null);
            try {
              await onRemove(teacher.teacher_id, !!teacher.is_me);
              setConfirming(false);
            } catch (e) {
              onError(e.message);
            }
            setBusy(false);
          }}
        />
      )}
    </li>
  );
}

// The class's teachers, with ＋ 先生を追加 and 外す on each (when there is more than one).
// onRemoveTeacher(teacherId, isMe).
export function TeachersPanel({ teachers, onAddTeacher, onRemoveTeacher }) {
  const [error, setError] = useState(null);
  return (
    <Panel title={t("teacher.teachers")} action={<button onClick={onAddTeacher} style={ghostSmall}>{t("teacher.addTeacher")}</button>}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {teachers.map((tc) => (
          <TeacherRow key={tc.teacher_id} teacher={tc} canRemove={teachers.length > 1} onRemove={onRemoveTeacher} onError={setError} />
        ))}
      </ul>
      <ErrorText>{error}</ErrorText>
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

// One class (先生 tab). Views (`view`, kept in App's teacherPath): 一覧 / 名簿 / ランキング / 課題 (Phase 4,
// ClassAssignments: the class's assigned packs). Older notes on the first two:
//   一覧 (default): the class overview table (class_overview()) at full width, then the class trouble
//     words beside the join code / awards / teachers / class settings (one column on phones).
//   名簿: the Phase 2 roster (編集 / 外す / ＋ 生徒を追加) on the left, the same panels on the right.
// The overview rows with each student's nickname from class_detail() (class_overview has none).
function withNicknames(rows, students) {
  if (!rows) return rows;
  const nick = new Map((students ?? []).map((s) => [s.student_id, s.nickname ?? null]));
  return rows.map((r) => ({ ...r, nickname: nick.get(r.student_id) ?? null }));
}

// The ランキング view (teacher): the 生徒にランキングを表示 switch and the same board the students see
// (still shown to the teacher while it's off). board: class_leaderboard() (null while loading).
export function LeaderboardView({ cls, board, error = null, onSetEnabled, wide = false }) {
  const action = useAction();
  const on = cls.leaderboard_enabled !== false;
  return (
    <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
      {!cls.archived && (
        <section style={{ ...panelStyle, display: "grid", gap: 8 }}>
          <button
            type="button" role="switch" aria-checked={on} disabled={action.busy}
            onClick={() => action.run(() => onSetEnabled(!on))}
            style={{
              minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 0,
              background: "transparent", border: "none", cursor: "pointer", color: colors.text, fontSize: 16, fontWeight: 700, textAlign: "left",
            }}
          >
            {t("leaderboard.switch")}
            <ToggleSwitch on={on} />
          </button>
          <ErrorText>{action.error}</ErrorText>
          {!on && <div style={{ fontSize: 14, color: colors.muted }}>{t("leaderboard.teacherOff")}</div>}
          <div style={{ fontSize: 13, color: colors.muted }}>{t("leaderboard.teacherNote")}</div>
        </section>
      )}
      {cls.archived ? <div style={{ fontSize: 15, color: colors.muted }}>{t("teacher.archivedBadge")}</div>
        : board ? <ClassLeaderboard board={board} viewer="teacher" wide={wide} />
        : error ? <ErrorText>{error}</ErrorText>
        : <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>}
    </div>
  );
}

// detail: { class, students, teachers } from class_detail() (null while loading).
// Each on… action returns a promise; the page shows its error next to the button that ran it.
// awards: recent awards (class_awards(), null while loading). onOpenStudent(id): a name was tapped.
// onGive(students): チケットを贈る for the checked students (the same selection in both views).
// overview / overviewError: class_overview() rows (null while loading). troubleWords: class_trouble_words().
// days / onDays: the period (7 or 30). sort / onSort: the overview's column. initialSelected: for tests.
export default function ClassPage({
  detail, error = null, onBack, wide = false, awards = null,
  onUpdateClass, onSetArchived, onRegenerate, onUpdateMember, onRemoveMember, onOpenSearch, onShowLarge,
  onOpenStudent = () => {}, onGive = () => {}, initialSelected = [],
  view = "overview", onView = () => {}, days = DEFAULT_PERIOD, onDays = () => {}, sort = DEFAULT_SORT, onSort = () => {},
  overview = null, overviewError = null, troubleWords = null,
  onUpdateNickname = async () => {}, leaderboard = null, leaderboardError = null, onSetLeaderboard = async () => {},
  assignments = null, assignmentsError = null, onNewAssignment = () => {}, onOpenAssignment = () => {},
  onOverviewCsv = null, onAwardsCsv = null, onRemoveTeacher = async () => {},
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
  const sameNumbers = duplicateNumbers(students);
  // Only students still on the roster count as chosen (one may have been removed meanwhile).
  const chosen = students.filter((s) => selected.has(s.student_id));
  const allChosen = students.length > 0 && chosen.length === students.length;
  const toggle = (id) => setSelected((old) => toggleId(old, id));
  const canGive = !cls.archived && students.length > 0;
  const giveBar = canGive && (
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
  );

  const side = (
    <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
      <JoinCodePanel code={cls.join_code} archived={cls.archived} onShowLarge={onShowLarge} onRegenerate={onRegenerate} />
      <ClassAwardsPanel awards={awards} onCsv={onAwardsCsv} />
      <TeachersPanel teachers={detail.teachers} onAddTeacher={() => onOpenSearch("teacher")} onRemoveTeacher={onRemoveTeacher} />
      <ClassSettingsPanel key={`${cls.name}|${cls.school_year}`} cls={cls} onUpdateClass={onUpdateClass} onSetArchived={onSetArchived} />
    </div>
  );

  const roster = (
    <Panel
      title={`${t("teacher.roster")} (${students.length})`}
      action={!cls.archived && <button onClick={() => onOpenSearch("student")} style={primarySmall}>{t("teacher.addStudent")}</button>}
    >
      {giveBar}
      {students.length === 0 ? (
        <div style={{ fontSize: 15, color: colors.muted }}>{t("teacher.noStudents")}</div>
      ) : (
        <ul data-roster="" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {students.map((s) => (
            <RosterRow
              key={s.student_id} student={s} students={students} wide={wide} sameNumber={sameNumbers.has(s.student_number)} onUpdate={onUpdateMember} onUpdateNickname={onUpdateNickname} onRemove={onRemoveMember}
              onOpen={() => onOpenStudent(s.student_id)}
              selectable={canGive} selected={selected.has(s.student_id)} onToggle={toggle}
            />
          ))}
        </ul>
      )}
    </Panel>
  );

  const columns = { display: "grid", gap: 16, alignItems: "start", gridTemplateColumns: wide ? "minmax(0, 1fr) 340px" : "1fr" };
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ flex: wide ? "0 1 480px" : "1 1 100%" }}>
          <SegmentedSwitch
            label={t("classView.label")} value={view} onChange={onView} fit={!wide}
            options={[
              { value: "overview", label: t("classView.overview") },
              { value: "roster", label: t("classView.roster") },
              { value: "leaderboard", label: t("classView.leaderboard") },
              { value: "assignments", label: t("classView.assignments") },
            ]}
          />
        </div>
        {view === "overview" && (
          <div style={{ flex: wide ? "0 1 220px" : "1 1 160px" }}>
            <SegmentedSwitch
              label={t("overview.periodLabel")} value={days} onChange={onDays}
              options={OVERVIEW_PERIODS.map((n) => ({ value: n, label: t("overview.period", { n }) }))}
            />
          </div>
        )}
      </div>

      {view === "assignments" ? (
        <div style={columns}>
          <ClassAssignments
            assignments={assignments} error={assignmentsError} archived={cls.archived}
            onNew={onNewAssignment} onOpen={onOpenAssignment}
          />
          {side}
        </div>
      ) : view === "leaderboard" ? (
        <div style={columns}>
          <LeaderboardView cls={cls} board={leaderboard} error={leaderboardError} onSetEnabled={onSetLeaderboard} wide={wide} />
          {side}
        </div>
      ) : view === "overview" ? (
        <>
          <ClassOverview
            rows={withNicknames(overview, detail.students)} error={overviewError} days={days} sort={sort} onSort={onSort} wide={wide} toolbar={giveBar}
            action={onOverviewCsv && overview?.length > 0 && (
              <button onClick={() => onOverviewCsv(withNicknames(overview, detail.students))} style={ghostSmall}>{t("csv.save")}</button>
            )}
            selectable={canGive} selected={selected} onToggle={toggle} onOpenStudent={onOpenStudent}
          />
          <div style={columns}>
            <ClassTroubleWords key={days} words={troubleWords} days={days} />
            {side}
          </div>
        </>
      ) : (
        <div style={columns}>
          {roster}
          {side}
        </div>
      )}
    </div>
  );
}
