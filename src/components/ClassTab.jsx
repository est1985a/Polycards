import { useCallback, useEffect, useState } from 'react';
import { colors, fontDisplay, panel, btnPrimary } from '../styles/theme';
import * as api from '../lib/api';
import { pickClass } from '../lib/classTab';
import SegmentedSwitch from './SegmentedSwitch';
import ClassLeaderboard from './ClassLeaderboard';
import NicknameSheet, { NicknameForm } from './NicknameSheet';
import ClassAssignmentsSection from './ClassAssignmentsSection';
import { ErrorText } from './ClassFields';
import { ghostSmall, inputStyle } from '../styles/forms';
import { t } from '../i18n';

// Up to this many classes the picker is a segmented switch; more get a drop-down.
const SWITCH_MAX = 3;

function ClassPicker({ classes, value, onChange }) {
  if (classes.length <= 1) return null;
  if (classes.length <= SWITCH_MAX) {
    return (
      <SegmentedSwitch
        label={t("classTab.pickerLabel")} value={value} onChange={onChange}
        options={classes.map((c) => ({ value: c.id, label: c.name }))}
      />
    );
  }
  return (
    <select
      aria-label={t("classTab.pickerLabel")} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, fontWeight: 700 }}
    >
      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

// The class's name, its teachers and my nickname (with 変更).
function ClassHeader({ info, onChangeNickname }) {
  return (
    <section style={{ ...panel, display: "grid", gap: 6 }}>
      <h2 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{info.name}</h2>
      {info.teachers.length > 0 && (
        <div style={{ fontSize: 15, color: colors.muted, overflowWrap: "anywhere" }}>
          {t("classTab.teachers", { names: info.teachers.join(t("classTab.teacherSeparator")) })}
        </div>
      )}
      {info.nickname && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{t("classTab.nickname", { name: info.nickname })}</span>
          <button onClick={onChangeNickname} aria-label={t("classTab.changeNicknameAria")} style={ghostSmall}>{t("classTab.changeNickname")}</button>
        </div>
      )}
    </section>
  );
}

// The クラス tab as plain markup (tests render it). classes: my_classes() (null while loading,
// "failed"). info / board: my_class_info() / class_leaderboard() for selectedId (null while loading).
// assignments: my_class_assignments() (Phase 4, null while loading); dueFor / busyDeckId /
// onAddAssignment / onReviewAssignment: see ClassAssignmentsSection. now: a fixed time for tests.
export function ClassTabView({
  classes, selectedId, onSelect = () => {}, info = null, board = null, error = null, wide = false,
  onJoin = () => {}, onChangeNickname = () => {}, onSaveNickname = async () => {},
  assignments = null, dueFor = () => 0, busyDeckId = null, onAddAssignment = () => {}, onReviewAssignment = () => {}, now = null,
}) {
  const frame = (children) => (
    <div style={{ display: "grid", gap: 16, paddingTop: 8, textAlign: "left", maxWidth: wide ? 900 : undefined, margin: wide ? "0 auto" : undefined, width: "100%" }}>
      {children}
    </div>
  );

  if (classes === "failed") return frame(<ErrorText>{t("classTab.loadFailed")}</ErrorText>);
  if (classes == null) return frame(<div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>);
  if (classes.length === 0) {
    return frame(
      <section style={{ ...panel, display: "grid", gap: 12, justifyItems: "center", textAlign: "center", padding: 24 }}>
        <h2 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: colors.text }}>{t("classTab.noClassTitle")}</h2>
        <p style={{ margin: 0, fontSize: 15, color: colors.muted }}>{t("classTab.noClassText")}</p>
        <button onClick={onJoin} style={{ ...btnPrimary, minHeight: 48, padding: "0 24px" }}>{t("classTab.join")}</button>
      </section>,
    );
  }

  const picker = <ClassPicker classes={classes} value={selectedId} onChange={onSelect} />;
  if (!info) {
    return frame(<>{picker}{error ? <ErrorText>{error}</ErrorText> : <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>}</>);
  }

  let main;
  if (!info.nickname) {
    main = (
      <section style={{ ...panel, display: "grid", gap: 10, borderColor: colors.accent }}>
        <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, color: colors.text }}>{t("classTab.chooseTitle")}</h3>
        <p style={{ margin: 0, fontSize: 15, color: colors.muted }}>{t("classTab.chooseText")}</p>
        <NicknameForm key={info.id} onSave={onSaveNickname} saveLabel={t("classTab.chooseSave")} />
      </section>
    );
  } else if (!info.leaderboard_enabled || board?.enabled === false) {
    main = <div style={{ ...panel, fontSize: 15, color: colors.muted, textAlign: "center" }}>{t("classTab.leaderboardOff")}</div>;
  } else if (board) {
    main = <ClassLeaderboard board={board} wide={wide} />;
  } else {
    main = error ? <ErrorText>{error}</ErrorText> : <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>;
  }

  return frame(
    <>
      {picker}
      <ClassHeader info={info} onChangeNickname={onChangeNickname} />
      {/* Phase 4: the class's assigned packs (課題), my own progress only. */}
      <ClassAssignmentsSection
        key={info.id} assignments={assignments} dueFor={dueFor} busyDeckId={busyDeckId}
        onAdd={onAddAssignment} onReview={onReviewAssignment} now={now}
      />
      {main}
    </>,
  );
}

// The クラス tab (every signed-in user). Loads my_class_info(), class_leaderboard() and
// my_class_assignments() for the chosen class each time it changes or the tab opens. classes /
// selectedId / onSelect come from App, which remembers the last class per account (src/lib/classTab.js).
// onJoin(): opens the join pop-up. assignmentsVersion: App bumps it after adding an assigned pack, so
// the progress reloads. dueFor / busyDeckId / onAddAssignment / onReviewAssignment: from App.
export default function ClassTab({
  classes, selectedId, onSelect, onJoin, wide = false,
  assignmentsVersion = 0, dueFor, busyDeckId = null, onAddAssignment, onReviewAssignment,
}) {
  const list = Array.isArray(classes) ? classes : null;
  const classId = pickClass(list, selectedId);
  const [info, setInfo] = useState(null); // { classId, data, error }
  const [board, setBoard] = useState(null); // { classId, data, error }
  const [assigned, setAssigned] = useState(null); // { classId, rows }: my_class_assignments()
  const [editing, setEditing] = useState(false);

  const load = useCallback(async (id) => {
    try {
      const data = await api.fetchMyClassInfo(id);
      setInfo({ classId: id, data, error: null });
      if (!data.nickname || !data.leaderboard_enabled) {
        setBoard({ classId: id, data: null, error: null });
        return;
      }
      setBoard({ classId: id, data: await api.fetchClassLeaderboard(id), error: null });
    } catch (e) {
      console.error(e);
      setInfo((old) => (old?.classId === id && old.data ? { ...old, error: e.message } : { classId: id, data: null, error: e.message }));
      setBoard((old) => ({ classId: id, data: old?.classId === id ? old.data : null, error: e.message }));
    }
  }, []);

  useEffect(() => {
    if (classId) load(classId);
  }, [classId, load]);

  // Assignments load on their own: a problem there never hides the leaderboard (only console.error).
  useEffect(() => {
    if (!classId) return;
    let current = true;
    api.fetchMyClassAssignments(classId)
      .then((rows) => { if (current) setAssigned({ classId, rows }); })
      .catch((e) => console.error(e));
    return () => { current = false; };
  }, [classId, assignmentsVersion]);

  const shownInfo = info?.classId === classId ? info : null;
  const shownBoard = board?.classId === classId ? board : null;
  const saveNickname = async (nickname) => {
    await api.setMyNickname(classId, nickname);
    await load(classId);
  };

  return (
    <>
      <ClassTabView
        classes={list ?? classes}
        selectedId={classId}
        onSelect={onSelect}
        info={shownInfo?.data ?? null}
        board={shownBoard?.data ?? null}
        error={shownInfo?.error ?? shownBoard?.error ?? null}
        wide={wide}
        onJoin={onJoin}
        onChangeNickname={() => setEditing(true)}
        onSaveNickname={saveNickname}
        assignments={assigned?.classId === classId ? assigned.rows : null}
        dueFor={dueFor}
        busyDeckId={busyDeckId}
        onAddAssignment={onAddAssignment}
        onReviewAssignment={onReviewAssignment}
      />
      {editing && shownInfo?.data && (
        <NicknameSheet initial={shownInfo.data.nickname ?? ""} onSave={saveNickname} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
