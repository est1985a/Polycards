import { useEffect, useState } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { cleanRealName, realNameValid, parseStudentNumber, studentNumberValid } from '../lib/classes';
import SheetFrame from './SheetFrame';
import { Field, ErrorText, StudentFields } from './ClassFields';
import { inputStyle, ghostSmall, primarySmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';

export const SEARCH_DELAY_MS = 300; // wait this long after the last key before searching
export const SEARCH_LIMIT = 20; // search_users() returns at most this many

// One search result: name, username / email, and 先生 / 追加済み badges, or a 選ぶ / 追加 button.
export function ResultRow({ user, added, actionLabel, busy = false, onPick }) {
  const sub = [user.username, user.email].filter((x) => x && x !== user.display_name).join(" · ");
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 8px 14px", border: `2px solid ${colors.line}`, borderRadius: 14 }}>
      <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 16, fontWeight: 700 }}>
          {user.display_name}
          {user.is_teacher && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "1px 8px", borderRadius: 999, background: colors.surface2, color: colors.accentText }}>{t("teacher.teacherBadge")}</span>
          )}
        </span>
        {sub && <span style={{ display: "block", fontSize: 13, color: colors.muted }}>{sub}</span>}
      </span>
      {added ? (
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.muted, whiteSpace: "nowrap" }}>{t("teacher.inClass")}</span>
      ) : (
        <button onClick={() => onPick(user)} disabled={busy} style={{ ...primarySmall, opacity: busy ? 0.6 : 1 }}>{busy ? t("teacher.adding") : actionLabel}</button>
      )}
    </li>
  );
}

// The 本名 / 出席番号 form after a student was picked.
export function AddStudentForm({ user, onAdd, onBack }) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ok = realNameValid(name) && studentNumberValid(number);

  async function submit(e) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setError(null);
    try {
      await onAdd(user, cleanRealName(name), parseStudentNumber(number));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <div style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{t("teacher.addingStudent", { name: user.display_name })}</div>
      <StudentFields
        name={name} number={number} onName={setName} onNumber={setNumber} autoFocus
        nameLabel={t("teacher.realName")} numberLabel={t("teacher.studentNumber")} numberHint={t("teacher.studentNumberHint")}
      />
      {!studentNumberValid(number) && <ErrorText>{t("errors.badStudentNumber")}</ErrorText>}
      <ErrorText>{error}</ErrorText>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" onClick={onBack} disabled={busy} style={ghostSmall}>{t("teacher.backToSearch")}</button>
        <button type="submit" disabled={!ok || busy} style={{ ...primarySmall, opacity: !ok || busy ? 0.6 : 1 }}>{busy ? t("teacher.adding") : t("teacher.add")}</button>
      </div>
    </form>
  );
}

// Search pop-up for adding a student (mode "student": pick, then 本名 + 出席番号) or a co-teacher
// (mode "teacher": teacher accounts only, added straight away).
// existingIds: ids already in the class (shown as 追加済み). onSearch(query, teachersOnly) → promise of rows;
// onAdd(user, realName, number) → promise (teacher mode: onAdd(user)). Closes after a successful add.
export default function UserSearchSheet({ mode = "student", existingIds, onSearch, onAdd, onClose }) {
  const teachersOnly = mode === "teacher";
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(null); // { query, rows, error }: the last search answered
  const [addError, setAddError] = useState(null);
  const [picked, setPicked] = useState(null); // student mode: the account being added
  const [addingId, setAddingId] = useState(null); // teacher mode: the account being added
  const trimmed = query.trim();
  const ready = trimmed.length >= 2;

  // Search a moment after typing stops. Only the answer for the text in the box is shown,
  // so an older answer that arrives late never replaces a newer one.
  useEffect(() => {
    if (!ready) return undefined;
    const timer = setTimeout(() => {
      onSearch(trimmed, teachersOnly)
        .then((rows) => setFound({ query: trimmed, rows, error: null }))
        .catch((e) => setFound({ query: trimmed, rows: [], error: e.message }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, trimmed, teachersOnly, onSearch]);

  const answer = ready && found?.query === trimmed ? found : null;
  const searching = ready && !answer;
  const results = answer?.rows ?? null;
  const error = answer?.error ?? addError;

  async function addTeacher(user) {
    setAddingId(user.id); setAddError(null);
    try {
      await onAdd(user);
      onClose();
    } catch (e) {
      setAddError(e.message);
      setAddingId(null);
    }
  }

  const title = teachersOnly ? t("teacher.searchTeacherTitle") : t("teacher.searchStudentTitle");
  return (
    <SheetFrame titleId="user-search-title" title={title} onClose={onClose}>
      {picked ? (
        <AddStudentForm
          user={picked}
          onBack={() => setPicked(null)}
          onAdd={async (user, name, number) => { await onAdd(user, name, number); onClose(); }}
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <Field label={t("teacher.searchLabel")} hint={trimmed.length < 2 ? t("teacher.searchHint") : null}>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoCapitalize="off" {...noAutoFix} style={inputStyle} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <div role="status" style={{ fontSize: 14, color: colors.muted, minHeight: 20 }}>
            {searching ? t("teacher.searching")
              : results && results.length === 0 && !error ? t("teacher.noResults")
              : results && results.length >= SEARCH_LIMIT ? t("teacher.resultsLimited") : null}
          </div>
          {results && results.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {results.map((u) => (
                <ResultRow
                  key={u.id}
                  user={u}
                  added={existingIds.has(u.id)}
                  actionLabel={teachersOnly ? t("teacher.add") : t("teacher.choose")}
                  busy={addingId === u.id}
                  onPick={teachersOnly ? addTeacher : setPicked}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </SheetFrame>
  );
}
