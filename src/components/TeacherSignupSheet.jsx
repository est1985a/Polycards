import { useState } from 'react';
import { colors, fontDisplay, btnPrimary } from '../styles/theme';
import * as api from '../lib/api';
import {
  PREFECTURES, SCHOOL_TYPES, cleanSchoolName, schoolNameValid, schoolKanaValid, cleanTeacherName, teacherNameValid,
  SCHOOL_NAME_MAX, TEACHER_NAME_MAX, schoolLine, prefLabel, typeLabel,
} from '../lib/schools';
import SheetFrame from './SheetFrame';
import { Field, ErrorText } from './ClassFields';
import { inputStyle, ghostSmall, primarySmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';


function PrefectureSelect({ value, onChange, allowAny = false, id }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="">{allowAny ? t("signup.anyPrefecture") : t("signup.choosePlaceholder")}</option>
      {PREFECTURES.map((k) => <option key={k} value={k}>{prefLabel(k)}</option>)}
    </select>
  );
}

// A list of schools, each with 選ぶ.
function SchoolList({ schools, onChoose, label }) {
  return (
    <ul aria-label={label} style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
      {schools.map((s) => (
        <li
          key={s.id}
          data-school-result={s.id}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 12, background: colors.surface2 }}
        >
          <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{s.name}</span>
            <span style={{ fontSize: 13, color: colors.muted }}>{schoolLine(s)}</span>
          </span>
          <button type="button" onClick={() => onChoose(s)} style={primarySmall}>{t("signup.choose")}</button>
        </li>
      ))}
    </ul>
  );
}

function DisplayNameField({ value, onChange, autoFocus = false }) {
  return (
    <Field label={t("signup.displayName")} hint={t("signup.displayNameHint")}>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={TEACHER_NAME_MAX + 10}
        placeholder={t("signup.displayNamePlaceholder")} autoFocus={autoFocus} {...noAutoFix} style={inputStyle}
      />
    </Field>
  );
}

const EMPTY_FORM = { name: "", kana: "", prefecture: "", type: "" };

// The steps of 先生として登録 (no portal, so tests can render each step):
//   'search'  学校をさがす (name + 都道府県) → results (選ぶ) / 新しい学校を登録
//   'join'    the chosen school + 表示名 → 参加をリクエスト
//   'new'     学校名, ふりがな, 都道府県, 学校の種類, 表示名 → 次へ
//   'similar' この学校ではありませんか？ (schools with a similar name) → 選ぶ / どれでもない
//   'done'    approved / request sent / new school sent
// initial: a starting state for tests. search / request / register: the api calls (replaceable in tests).
// onFinished(result): after a request or registration was sent (App reloads the teacher status).
export function TeacherSignupBody({
  initial = {}, onClose, onFinished = () => {},
  search = api.searchSchools, request = api.requestJoinSchool, register = api.registerSchool,
}) {
  const [step, setStep] = useState(initial.step ?? "search");
  const [query, setQuery] = useState(initial.query ?? "");
  const [pref, setPref] = useState(initial.pref ?? "");
  const [results, setResults] = useState(initial.results ?? null);
  const [chosen, setChosen] = useState(initial.chosen ?? null);
  const [similar, setSimilar] = useState(initial.similar ?? []);
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(initial.form ?? {}) });
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [done, setDone] = useState(initial.done ?? null); // { kind: 'approved' | 'pending' | 'school', school }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(fn) {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const go = (next) => { setError(null); setStep(next); };
  const nameOk = teacherNameValid(displayName);

  const doSearch = () => run(async () => setResults(await search(query, pref || null)));
  const choose = (school) => { setChosen(school); go("join"); };
  const sendRequest = () => run(async () => {
    const res = await request(chosen.id, cleanTeacherName(displayName));
    const kind = res?.status === "approved" ? "approved" : "pending";
    setDone({ kind, school: res?.school_name ?? chosen.name });
    setStep("done");
    onFinished(res);
  });
  const sendSchool = () => run(async () => {
    const res = await register({
      name: cleanSchoolName(form.name), kana: form.kana.trim() || null, prefecture: form.prefecture,
      schoolType: form.type, displayName: cleanTeacherName(displayName),
    });
    setDone({ kind: "school", school: cleanSchoolName(form.name) });
    setStep("done");
    onFinished(res);
  });
  // 次へ on the new-school form: schools with a similar name in that prefecture first, so nobody
  // registers a school that is already there.
  const next = () => run(async () => {
    const found = await search(cleanSchoolName(form.name), form.prefecture);
    if (found.length > 0) { setSimilar(found); setStep("similar"); return; }
    await sendSchool();
  });

  const buttons = (back, main) => (
    <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
      {back}
      {main}
    </div>
  );
  const backBtn = (to) => <button type="button" onClick={() => go(to)} disabled={busy} style={ghostSmall}>{t("signup.back")}</button>;

  if (step === "done") {
    const text = done?.kind === "approved" ? t("signup.approved", { school: done.school })
      : done?.kind === "school" ? t("signup.schoolSent") : t("signup.requestSent");
    return (
      <div style={{ display: "grid", gap: 16, justifyItems: "center", textAlign: "center", padding: "8px 0" }}>
        <div role="status" style={{ fontFamily: fontDisplay, fontSize: done?.kind === "approved" ? 22 : 18, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>
          {text}
        </div>
        <button type="button" onClick={onClose} autoFocus style={{ ...btnPrimary, minHeight: 44, minWidth: 140 }}>{t("signup.close")}</button>
      </div>
    );
  }

  if (step === "join") {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, overflowWrap: "anywhere" }}>{chosen?.name}</div>
          {chosen && <div style={{ fontSize: 14, color: colors.muted }}>{schoolLine(chosen)}</div>}
        </div>
        <DisplayNameField value={displayName} onChange={setDisplayName} autoFocus />
        <ErrorText>{error}</ErrorText>
        {buttons(backBtn("search"), (
          <button type="button" onClick={sendRequest} disabled={busy || !nameOk} style={{ ...primarySmall, opacity: busy || !nameOk ? 0.6 : 1 }}>
            {busy ? t("signup.sending") : t("signup.request")}
          </button>
        ))}
      </div>
    );
  }

  if (step === "similar") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700 }}>{t("signup.similarTitle")}</div>
        <SchoolList schools={similar} onChoose={choose} label={t("signup.similarTitle")} />
        <ErrorText>{error}</ErrorText>
        {buttons(backBtn("new"), (
          <button type="button" onClick={sendSchool} disabled={busy} style={{ ...ghostSmall, opacity: busy ? 0.6 : 1 }}>
            {busy ? t("signup.sending") : t("signup.similarNone")}
          </button>
        ))}
      </div>
    );
  }

  if (step === "new") {
    const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
    const ok = schoolNameValid(form.name) && schoolKanaValid(form.kana) && form.prefecture && form.type && nameOk;
    return (
      <form onSubmit={(e) => { e.preventDefault(); if (ok && !busy) next(); }} style={{ display: "grid", gap: 12 }}>
        <Field label={t("signup.schoolName")} hint={t("signup.schoolNameHint")}>
          <input type="text" value={form.name} onChange={(e) => set("name")(e.target.value)} maxLength={SCHOOL_NAME_MAX + 10} autoFocus {...noAutoFix} style={inputStyle} />
        </Field>
        <Field label={t("signup.schoolKana")}>
          <input type="text" value={form.kana} onChange={(e) => set("kana")(e.target.value)} maxLength={SCHOOL_NAME_MAX + 10} {...noAutoFix} style={inputStyle} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <Field label={t("signup.prefecture")}>
            <PrefectureSelect value={form.prefecture} onChange={set("prefecture")} />
          </Field>
          <Field label={t("signup.schoolType")}>
            <select value={form.type} onChange={(e) => set("type")(e.target.value)} style={inputStyle}>
              <option value="">{t("signup.choosePlaceholder")}</option>
              {SCHOOL_TYPES.map((k) => <option key={k} value={k}>{typeLabel(k)}</option>)}
            </select>
          </Field>
        </div>
        <DisplayNameField value={displayName} onChange={setDisplayName} />
        <div style={{ fontSize: 13, color: colors.muted }}>{t("signup.newSchoolNote")}</div>
        <ErrorText>{error}</ErrorText>
        {buttons(backBtn("search"), (
          <button type="submit" disabled={busy || !ok} style={{ ...primarySmall, opacity: busy || !ok ? 0.6 : 1 }}>
            {busy ? t("signup.sending") : t("signup.next")}
          </button>
        ))}
      </form>
    );
  }

  // 'search'
  const canSearch = query.trim() !== "" || pref !== "";
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ fontSize: 15, color: colors.text }}>{t("signup.intro")}</div>
      <form onSubmit={(e) => { e.preventDefault(); if (canSearch && !busy) doSearch(); }} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <Field label={t("signup.schoolSearch")}>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("signup.searchPlaceholder")} autoFocus {...noAutoFix} style={inputStyle} />
          </Field>
          <Field label={t("signup.prefecture")}>
            <PrefectureSelect value={pref} onChange={setPref} allowAny />
          </Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={busy || !canSearch} style={{ ...primarySmall, opacity: busy || !canSearch ? 0.6 : 1 }}>
            {busy ? t("signup.searching") : t("signup.search")}
          </button>
        </div>
      </form>
      <ErrorText>{error}</ErrorText>
      {results && (results.length === 0
        ? <div role="status" style={{ fontSize: 15, color: colors.muted }}>{t("signup.noResults")}</div>
        : <SchoolList schools={results} onChoose={choose} label={t("signup.results")} />)}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, paddingTop: 12, borderTop: `1px solid ${colors.line}` }}>
        <span style={{ fontSize: 14, color: colors.muted }}>{t("signup.notFound")}</span>
        <button type="button" onClick={() => go("new")} style={ghostSmall}>{t("signup.registerNew")}</button>
      </div>
    </div>
  );
}

// 先生として登録 (account menu, Google accounts that aren't teachers yet).
export default function TeacherSignupSheet({ onClose, onFinished }) {
  return (
    <SheetFrame titleId="teacher-signup-title" title={t("signup.title")} onClose={onClose}>
      <TeacherSignupBody onClose={onClose} onFinished={onFinished} />
    </SheetFrame>
  );
}
