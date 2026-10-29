import { useState } from 'react';
import { colors, fontDisplay, btnPrimary } from '../styles/theme';
import {
  normalizeJoinCode, isJoinCodeShaped, JOIN_CODE_LENGTH, cleanRealName, realNameValid, parseStudentNumber, studentNumberValid,
} from '../lib/classes';
import * as api from '../lib/api';
import SheetFrame from './SheetFrame';
import { Field, ErrorText, StudentFields } from './ClassFields';
import { inputStyle, ghostSmall, primarySmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';

// The steps of joining, as plain markup (tests render each step).
// step: 'code' | 'details' | 'confirm' | 'done'.
export function JoinClassSteps({
  step, code, onCode, found, name, number, onName, onNumber, busy = false, error = null,
  onCheck, onDetails, onBack, onJoin, onDone,
}) {
  if (step === "done") {
    return (
      <div style={{ display: "grid", gap: 16, justifyItems: "center", textAlign: "center", padding: "8px 0" }}>
        <div role="status" style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>
          {t("joinClass.done", { name: found?.name })}
        </div>
        <button onClick={onDone} autoFocus style={{ ...btnPrimary, minHeight: 44, minWidth: 140 }}>{t("joinClass.ok")}</button>
      </div>
    );
  }

  if (step === "confirm") {
    const n = parseStudentNumber(number);
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, overflowWrap: "anywhere" }}>{t("joinClass.confirm", { name: found?.name })}</div>
        <div style={{ display: "grid", gap: 4, padding: "10px 14px", borderRadius: 12, background: colors.surface2, fontSize: 16 }}>
          <span>{t("joinClass.confirmName", { name: cleanRealName(name) })}</span>
          <span>{n == null ? t("joinClass.confirmNoNumber") : t("joinClass.confirmNumber", { n })}</span>
        </div>
        <ErrorText>{error}</ErrorText>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onBack} disabled={busy} style={ghostSmall}>{t("joinClass.back")}</button>
          <button onClick={onJoin} disabled={busy} style={{ ...primarySmall, opacity: busy ? 0.6 : 1 }}>{busy ? t("joinClass.joining") : t("joinClass.join")}</button>
        </div>
      </div>
    );
  }

  if (step === "details") {
    const ok = realNameValid(name) && studentNumberValid(number);
    return (
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onDetails(); }} style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: colors.accentText, overflowWrap: "anywhere" }}>{t("joinClass.classFound", { name: found?.name })}</div>
        <StudentFields
          name={name} number={number} onName={onName} onNumber={onNumber} autoFocus
          nameLabel={t("joinClass.realName")} numberLabel={t("joinClass.studentNumber")} numberHint={t("teacher.studentNumberHint")}
          namePlaceholder={t("joinClass.realNamePlaceholder")}
        />
        {!studentNumberValid(number) && <ErrorText>{t("errors.badStudentNumber")}</ErrorText>}
        <div style={{ fontSize: 13, color: colors.muted }}>{t("joinClass.privacyNote")}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onBack} style={ghostSmall}>{t("joinClass.back")}</button>
          <button type="submit" disabled={!ok} style={{ ...primarySmall, opacity: ok ? 1 : 0.6 }}>{t("joinClass.next")}</button>
        </div>
      </form>
    );
  }

  const ok = isJoinCodeShaped(code);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok && !busy) onCheck(); }} style={{ display: "grid", gap: 12 }}>
      <Field label={t("joinClass.codeLabel")} hint={t("joinClass.codeHint")}>
        <input
          type="text" value={code} onChange={(e) => onCode(e.target.value)} maxLength={JOIN_CODE_LENGTH + 4}
          autoCapitalize="characters" autoFocus lang="en" {...noAutoFix}
          style={{ ...inputStyle, fontFamily: fontDisplay, fontWeight: 700, fontSize: 28, letterSpacing: "0.2em", textAlign: "center", textTransform: "uppercase" }}
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={!ok || busy} style={{ ...primarySmall, opacity: !ok || busy ? 0.6 : 1 }}>{busy ? t("joinClass.checking") : t("joinClass.next")}</button>
      </div>
    </form>
  );
}

// クラスに参加 (from the account menu): 1) the join code (checked, shows the class name),
// 2) 本名 + 出席番号, 3) 参加しますか？, then できた. onJoined(): a class was joined (to reload lists).
export default function JoinClassSheet({ onClose, onJoined = () => {}, check = api.checkJoinCode, join = api.joinClass }) {
  const [step, setStep] = useState("code");
  const [code, setCode] = useState("");
  const [found, setFound] = useState(null);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(fn) {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <SheetFrame titleId="join-class-title" title={t("joinClass.title")} onClose={onClose}>
      <JoinClassSteps
        step={step} code={code} found={found} name={name} number={number} busy={busy} error={error}
        onCode={(v) => { setCode(v); setError(null); }}
        onName={setName}
        onNumber={setNumber}
        onCheck={() => run(async () => { setFound(await check(normalizeJoinCode(code))); setStep("details"); })}
        onDetails={() => { setError(null); setStep("confirm"); }}
        onBack={() => { setError(null); setStep(step === "confirm" ? "details" : "code"); }}
        onJoin={() => run(async () => {
          await join(normalizeJoinCode(code), cleanRealName(name), parseStudentNumber(number));
          setStep("done");
          onJoined();
        })}
        onDone={onClose}
      />
    </SheetFrame>
  );
}
