import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { defaultSchoolYear } from '../lib/classes';
import TeacherTab from './TeacherTab';
import ClassPage from './ClassPage';
import UserSearchSheet from './UserSearchSheet';
import JoinCodeDisplay from './JoinCodeDisplay';
import StudentPage from './StudentPage';
import AwardSheet from './AwardSheet';
import AssignPackPage from './AssignPackPage';
import AssignmentPage from './AssignmentPage';
import { downloadCsv } from '../lib/csv';
import { overviewCsv, assignmentCsv, awardsCsv, classCsvName } from '../lib/classCsv';
import { t } from '../i18n';
import { jstDateKey } from '../lib/schedule';
import { HONESTY } from '../lib/honesty';
import { TEACHER_START } from '../lib/classes';

// The 先生 tab (teacher accounts only): loads the class list or one class and runs every teacher
// action through the database functions in api.js (which check that the caller teaches the class).
// path: { screen: 'classes' | 'class' | 'student' | 'assignNew' | 'assignment', classId, studentId,
// assignmentId, archived } (kept in App, so tapping the tab again can go back to the list).
// onNavigate(path): move to another screen. library / collections / libraryLoading: the Word Packs
// data App already loaded (for choosing a pack to assign).
export default function TeacherArea({ path, onNavigate, wide = false, library = [], collections = null, libraryLoading = false, onOpenGuide }) {
  // What was loaded, and for which list / class: a screen only shows data that matches it
  // (so another list or class never flashes up while the new one loads).
  const [list, setList] = useState(null); // { archived, rows, error }
  const [loaded, setLoaded] = useState(null); // { classId, detail, error }
  const [searchMode, setSearchMode] = useState(null); // 'student' | 'teacher' | null
  const [showLarge, setShowLarge] = useState(false);
  const [awards, setAwards] = useState(null); // { classId, rows }: the class's recent awards
  const [student, setStudent] = useState(null); // { key, detail, error }: one student's page
  const [giveTo, setGiveTo] = useState(null); // students the award pop-up is open for
  const [overview, setOverview] = useState(null); // { key, rows, error }: class_overview() for classId|days
  const [trouble, setTrouble] = useState(null); // { key, rows }: class_trouble_words() for classId|days
  const [honesty, setHonesty] = useState(null); // { key, counts, error }: student_honesty() for one student
  const [board, setBoard] = useState(null); // { classId, data, error }: class_leaderboard() (ランキング view)
  const [assign, setAssign] = useState(null); // { classId, rows, error }: assignments_for_class() (課題)
  const [defaultYear] = useState(() => defaultSchoolYear(Date.now()));
  const classId = ["class", "student", "assignNew", "assignment"].includes(path.screen) ? path.classId : null;
  const studentId = path.screen === "student" ? path.studentId : null;
  const studentKey = studentId ? `${classId}|${studentId}` : null;
  const days = path.days ?? TEACHER_START.days;
  const periodKey = classId ? `${classId}|${days}` : null;

  const loadClasses = useCallback(async (archived) => {
    try {
      setList({ archived, rows: await api.fetchTeacherClasses(archived), error: null });
    } catch (e) {
      console.error(e);
      setList({ archived, rows: null, error: e.message });
    }
  }, []);

  // A failed reload keeps the class on screen with the error above it.
  const loadDetail = useCallback(async (id) => {
    try {
      const detail = await api.fetchClassDetail(id);
      setLoaded({ classId: id, detail, error: null });
    } catch (e) {
      console.error(e);
      setLoaded((old) => ({ classId: id, detail: old?.classId === id ? old.detail : null, error: e.message }));
    }
  }, []);

  const loadAwards = useCallback(async (id) => {
    try {
      setAwards({ classId: id, rows: await api.fetchClassAwards(id) });
    } catch (e) {
      console.error(e);
      setAwards({ classId: id, rows: [] });
    }
  }, []);

  const loadStudent = useCallback(async (cls, id) => {
    const key = `${cls}|${id}`;
    try {
      setStudent({ key, detail: await api.fetchStudentDetail(cls, id), error: null });
    } catch (e) {
      console.error(e);
      setStudent((old) => ({ key, detail: old?.key === key ? old.detail : null, error: e.message }));
    }
  }, []);

  // 一覧: the overview table and the class trouble words for this class and period.
  const loadOverview = useCallback(async (cls, n) => {
    const key = `${cls}|${n}`;
    try {
      setOverview({ key, rows: await api.fetchClassOverview(cls, n, HONESTY.fastMs, HONESTY.days), error: null });
    } catch (e) {
      console.error(e);
      setOverview((old) => ({ key, rows: old?.key === key ? old.rows : null, error: e.message }));
    }
  }, []);

  const loadTrouble = useCallback(async (cls, n) => {
    const key = `${cls}|${n}`;
    try {
      setTrouble({ key, rows: await api.fetchClassTroubleWords(cls, n) });
    } catch (e) {
      console.error(e);
      setTrouble({ key, rows: [] });
    }
  }, []);

  const loadHonesty = useCallback(async (cls, id) => {
    const key = `${cls}|${id}`;
    try {
      setHonesty({ key, counts: await api.fetchStudentHonesty(cls, id, HONESTY.days, HONESTY.fastMs), error: null });
    } catch (e) {
      console.error(e);
      setHonesty({ key, counts: null, error: e.message });
    }
  }, []);

  const loadBoard = useCallback(async (cls) => {
    try {
      setBoard({ classId: cls, data: await api.fetchClassLeaderboard(cls), error: null });
    } catch (e) {
      console.error(e);
      setBoard((old) => ({ classId: cls, data: old?.classId === cls ? old.data : null, error: e.message }));
    }
  }, []);

  const loadAssignments = useCallback(async (cls) => {
    try {
      setAssign({ classId: cls, rows: await api.fetchClassAssignments(cls), error: null });
    } catch (e) {
      console.error(e);
      setAssign((old) => ({ classId: cls, rows: old?.classId === cls ? old.rows : null, error: e.message }));
    }
  }, []);

  useEffect(() => {
    if (path.screen === "classes") loadClasses(path.archived);
  }, [path.screen, path.archived, loadClasses]);

  useEffect(() => {
    if (classId && path.screen === "class") loadAwards(classId);
  }, [classId, path.screen, loadAwards]);

  useEffect(() => {
    if (studentKey) loadStudent(classId, studentId);
  }, [studentKey, classId, studentId, loadStudent]);

  useEffect(() => {
    if (studentKey) loadHonesty(classId, studentId);
  }, [studentKey, classId, studentId, loadHonesty]);

  const onOverview = path.screen === "class" && (path.classView ?? "overview") === "overview";
  useEffect(() => {
    if (periodKey && onOverview) {
      loadOverview(classId, days);
      loadTrouble(classId, days);
    }
  }, [periodKey, onOverview, classId, days, loadOverview, loadTrouble]);

  useEffect(() => {
    if (classId) loadDetail(classId);
  }, [classId, loadDetail]);

  const onBoard = path.screen === "class" && path.classView === "leaderboard";
  useEffect(() => {
    if (classId && onBoard) loadBoard(classId);
  }, [classId, onBoard, loadBoard]);

  // 課題: the list, the pack picker (which packs are already assigned) and one assignment's page.
  const onAssign = (path.screen === "class" && path.classView === "assignments") || path.screen === "assignNew" || path.screen === "assignment";
  useEffect(() => {
    if (classId && onAssign) loadAssignments(classId);
  }, [classId, onAssign, loadAssignments]);

  const current = list?.archived === path.archived ? list : null;
  const classes = current ? current.rows : null;
  const listError = current?.error ?? null;
  const mine = loaded?.classId === classId ? loaded : null;
  const detail = mine?.detail ?? null;
  const detailError = mine?.error ?? null;

  const classAwards = awards?.classId === classId ? awards.rows : null;
  const shown = student?.key === studentKey ? student : null;
  const shownHonesty = honesty?.key === studentKey ? honesty : null;
  const shownOverview = overview?.key === periodKey ? overview : null;
  const shownTrouble = trouble?.key === periodKey ? trouble.rows : null;
  const shownBoard = board?.classId === classId ? board : null;
  const shownAssign = assign?.classId === classId ? assign : null;
  const className = detail?.class?.name ?? "";
  const toAssignments = { ...path, screen: "class", classView: "assignments", assignmentId: null, studentId: null };

  // CSV files are built here from data already on screen (the awards: up to 100 gives).
  const saveOverviewCsv = (rows) => downloadCsv(classCsvName(className, "overview", Date.now()), overviewCsv(rows, days));
  const saveAwardsCsv = async () => {
    try {
      const rows = await api.fetchClassAwards(classId, 100);
      downloadCsv(classCsvName(className, "awards", Date.now()), awardsCsv(rows));
    } catch (e) {
      console.error(e);
      window.alert(`${t("csv.failed")}\n${e.message}`);
    }
  };

  // After a change: reload the class (its errors are shown by the button that made the change),
  // and the overview (a new or removed student, a new name or number).
  const reload = async () => {
    await loadDetail(classId);
    if (onOverview) loadOverview(classId, days);
    if (onBoard) loadBoard(classId);
    if (onAssign) loadAssignments(classId); // a new or removed student
  };

  // チケットを贈る: from the roster (checked students) or a student page (one student).
  const award = async (amount, message) => {
    await api.awardTickets(classId, giveTo.map((s) => s.student_id), amount, message);
    loadAwards(classId);
    if (studentId) loadStudent(classId, studentId);
    else loadOverview(classId, days); // the ガチャ券 column
  };
  const awardSheet = giveTo && (
    <AwardSheet students={giveTo} onAward={award} onClose={() => setGiveTo(null)} />
  );

  if (path.screen === "student") {
    const member = detail?.students?.find((s) => s.student_id === studentId);
    return (
      <>
        <StudentPage
          detail={shown?.detail ?? null}
          error={shown?.error ?? null}
          classTitle={detail?.class?.name ?? ""}
          today={jstDateKey(Date.now())}
          wide={wide}
          onBack={() => onNavigate(path.assignmentId ? { ...path, screen: "assignment", studentId: null } : { ...path, screen: "class", studentId: null })}
          onGive={detail?.class && !detail.class.archived ? () => setGiveTo([member ?? { student_id: studentId, real_name: shown?.detail?.student?.real_name ?? "" }]) : null}
          honesty={shownHonesty?.counts ?? null}
          honestyError={shownHonesty?.error ?? null}
        />
        {awardSheet}
      </>
    );
  }

  if (path.screen === "assignNew") {
    return (
      <AssignPackPage
        className={className}
        library={library}
        collections={collections}
        libraryLoading={libraryLoading}
        assignedDeckIds={(shownAssign?.rows ?? []).map((a) => a.deck_id)}
        onBack={() => onNavigate(toAssignments)}
        onCreate={async (deckId, dueDate, note) => { await api.createAssignment(classId, deckId, dueDate, note); }}
        onDone={() => { loadAssignments(classId); onNavigate(toAssignments); }}
      />
    );
  }

  if (path.screen === "assignment") {
    const rows = shownAssign?.rows ?? null;
    const assignment = rows?.find((a) => a.id === path.assignmentId) ?? null;
    const missing = rows !== null && !assignment ? t("errors.assignmentNotFound") : null;
    return (
      <AssignmentPage
        key={path.assignmentId}
        assignment={assignment}
        roster={detail?.students ?? []}
        className={className}
        archived={!!detail?.class?.archived}
        error={shownAssign?.error ?? missing}
        wide={wide}
        onBack={() => onNavigate(toAssignments)}
        onOpenStudent={(id) => onNavigate({ ...path, screen: "student", studentId: id })}
        onUpdate={async (dueDate, note) => { await api.updateAssignment(path.assignmentId, dueDate, note); await loadAssignments(classId); }}
        onDelete={async () => { await api.deleteAssignment(path.assignmentId); await loadAssignments(classId); onNavigate(toAssignments); }}
        onCsv={(shown) => downloadCsv(classCsvName(className, "assignment", Date.now(), assignment?.deck_name), assignmentCsv(shown))}
      />
    );
  }

  if (path.screen === "class") {
    const existing = new Set([
      ...(detail?.students ?? []).map((s) => s.student_id),
      ...(searchMode === "teacher" ? (detail?.teachers ?? []).map((tc) => tc.teacher_id) : []),
    ]);
    return (
      <>
        <ClassPage
          detail={detail}
          error={detailError}
          wide={wide}
          onBack={() => onNavigate({ ...path, screen: "classes", classId: null })}
          onUpdateClass={async (name, year) => { await api.updateClass(classId, name, year); await reload(); }}
          onSetArchived={async (archived) => { await api.setClassArchived(classId, archived); await reload(); }}
          onRegenerate={async () => { await api.regenerateJoinCode(classId); await reload(); }}
          onUpdateMember={async (studentId, name, number) => { await api.updateClassMember(classId, studentId, name, number); await reload(); }}
          onRemoveMember={async (studentId) => { await api.removeStudentFromClass(classId, studentId); await reload(); }}
          onOpenSearch={setSearchMode}
          onShowLarge={() => setShowLarge(true)}
          awards={classAwards}
          onOpenStudent={(id) => onNavigate({ ...path, screen: "student", studentId: id, assignmentId: null })}
          onGive={setGiveTo}
          view={path.classView ?? "overview"}
          onView={(classView) => onNavigate({ ...path, classView })}
          days={days}
          onDays={(n) => onNavigate({ ...path, days: n })}
          sort={path.sort ?? TEACHER_START.sort}
          onSort={(sort) => onNavigate({ ...path, sort })}
          overview={shownOverview?.rows ?? null}
          overviewError={shownOverview?.error ?? null}
          troubleWords={shownTrouble}
          onUpdateNickname={async (studentId, nickname) => { await api.setMemberNickname(classId, studentId, nickname); await reload(); }}
          leaderboard={shownBoard?.data ?? null}
          leaderboardError={shownBoard?.error ?? null}
          onSetLeaderboard={async (enabled) => { await api.setClassLeaderboard(classId, enabled); await reload(); }}
          assignments={shownAssign?.rows ?? null}
          assignmentsError={shownAssign?.error ?? null}
          onNewAssignment={() => onNavigate({ ...path, screen: "assignNew", assignmentId: null })}
          onOpenAssignment={(id) => onNavigate({ ...path, screen: "assignment", assignmentId: id })}
          onOverviewCsv={saveOverviewCsv}
          onAwardsCsv={saveAwardsCsv}
          onRemoveTeacher={async (teacherId, isMe) => {
            try {
              await api.removeCoTeacher(classId, teacherId);
            } catch (e) {
              // Someone already removed them: reload so the list is right, and still show the message.
              if (e.code === "teacher_not_in_class") await reload().catch(() => {});
              throw e;
            }
            // Removing myself: the class can't be opened any more, so back to the class list.
            if (isMe) onNavigate({ ...path, screen: "classes", classId: null });
            else await reload();
          }}
        />
        {awardSheet}
        {searchMode && (
          <UserSearchSheet
            mode={searchMode}
            existingIds={existing}
            students={detail?.students ?? []}
            onSearch={api.searchUsers}
            onAdd={async (user, name, number) => {
              if (searchMode === "teacher") await api.addCoTeacher(classId, user.id);
              else await api.addStudentToClass(classId, user.id, name, number);
              await reload();
            }}
            onClose={() => setSearchMode(null)}
          />
        )}
        {showLarge && detail?.class && (
          <JoinCodeDisplay classTitle={detail.class.name} code={detail.class.join_code} onClose={() => setShowLarge(false)} />
        )}
      </>
    );
  }

  return (
    <TeacherTab
      classes={classes}
      error={listError}
      archived={path.archived}
      wide={wide}
      defaultYear={defaultYear}
      onOpenGuide={onOpenGuide}
      onToggleArchived={(archived) => onNavigate({ ...path, archived })}
      onOpen={(id) => onNavigate({ ...path, screen: "class", classId: id, classView: TEACHER_START.classView, sort: TEACHER_START.sort })}
      onCreate={async (name, year) => {
        const created = await api.createClass(name, year);
        onNavigate({ ...path, screen: "class", classId: created.id, classView: TEACHER_START.classView, sort: TEACHER_START.sort });
      }}
    />
  );
}
