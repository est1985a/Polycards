import { useState } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { AWARD_MIN, AWARD_MAX, AWARD_MESSAGE_MAX, clampAmount, cleanAwardMessage, messageLength, messageTooLong } from '../lib/awards';
import SheetFrame from './SheetFrame';
import { Field, ErrorText } from './ClassFields';
import { inputStyle, ghostSmall, primarySmall, noAutoFix } from '../styles/forms';
import { TicketIcon } from './GachaIcons';
import { t } from '../i18n';

const stepBtn = {
  width: 52, height: 52, borderRadius: "50%", border: `2px solid ${colors.line}`, background: colors.surface2,
  color: colors.text, fontSize: 26, fontWeight: 700, lineHeight: 1, cursor: "pointer",
};

// Who gets the tickets: one or two names, else "N人".
function recipients(students) {
  if (students.length <= 2) return t("award.to", { names: students.map((s) => s.real_name).join(t("award.nameSeparator")) });
  return t("award.toMany", { n: students.length });
}

// The steps of giving tickets, as plain markup (tests render each step).
// step: 'form' | 'confirm' | 'done'.
export function AwardSteps({ step, students, amount, message, busy = false, error = null, onAmount, onMessage, onNext, onBack, onSend, onDone }) {
  if (step === "done") {
    return (
      <div style={{ display: "grid", gap: 16, justifyItems: "center", textAlign: "center", padding: "8px 0" }}>
        <div role="status" style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: colors.text }}>{t("award.done")}</div>
        <button onClick={onDone} autoFocus style={{ ...primarySmall, minWidth: 140 }}>{t("award.ok")}</button>
      </div>
    );
  }

  const clean = cleanAwardMessage(message);
  if (step === "confirm") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 700, color: colors.text }}>
          {t("award.confirm", { students: students.length, amount, total: students.length * amount })}
        </div>
        <div style={{ fontSize: 14, color: colors.muted, overflowWrap: "anywhere" }}>{recipients(students)}</div>
        {clean && (
          <div style={{ padding: "10px 14px", borderRadius: 12, background: colors.surface2, fontSize: 16, color: colors.text, overflowWrap: "anywhere" }}>
            {clean}
          </div>
        )}
        <ErrorText>{error}</ErrorText>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onBack} disabled={busy} style={ghostSmall}>{t("award.back")}</button>
          <button onClick={onSend} disabled={busy} style={{ ...primarySmall, opacity: busy ? 0.6 : 1 }}>{busy ? t("award.sending") : t("award.send")}</button>
        </div>
      </div>
    );
  }

  const tooLong = messageTooLong(message);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!tooLong) onNext(); }} style={{ display: "grid", gap: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{recipients(students)}</div>
      <div style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{t("award.amount")}</span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <button type="button" onClick={() => onAmount(clampAmount(amount - 1))} disabled={amount <= AWARD_MIN} aria-label={t("award.less")} style={{ ...stepBtn, opacity: amount <= AWARD_MIN ? 0.4 : 1 }}>−</button>
          <span data-amount="" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 96, justifyContent: "center", fontFamily: fontDisplay, fontWeight: 700, fontSize: 40, color: colors.gold }}>
            <TicketIcon size={32} />{amount}
          </span>
          <button type="button" onClick={() => onAmount(clampAmount(amount + 1))} disabled={amount >= AWARD_MAX} aria-label={t("award.more")} style={{ ...stepBtn, opacity: amount >= AWARD_MAX ? 0.4 : 1 }}>+</button>
        </div>
      </div>
      <Field label={t("award.message")} hint={t("award.messageCount", { n: messageLength(message) })}>
        <input
          type="text" value={message} onChange={(e) => onMessage(e.target.value)} maxLength={AWARD_MESSAGE_MAX + 20}
          placeholder={t("award.messagePlaceholder")} {...noAutoFix} style={{ ...inputStyle, borderColor: tooLong ? colors.danger : colors.line }}
        />
      </Field>
      {tooLong && <ErrorText>{t("errors.messageTooLong")}</ErrorText>}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={tooLong} style={{ ...primarySmall, opacity: tooLong ? 0.6 : 1 }}>{t("award.next")}</button>
      </div>
    </form>
  );
}

// チケットを贈る (teacher): amount 1–10 and an optional message, then a confirm step.
// students: [{ student_id, real_name }]. onAward(amount, message) → promise; onDone(): after OK.
export default function AwardSheet({ students, onAward, onClose }) {
  const [step, setStep] = useState("form");
  const [amount, setAmount] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function send() {
    setBusy(true); setError(null);
    try {
      await onAward(amount, cleanAwardMessage(message));
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SheetFrame titleId="award-title" title={t("award.give")} onClose={onClose}>
      <AwardSteps
        step={step} students={students} amount={amount} message={message} busy={busy} error={error}
        onAmount={setAmount} onMessage={setMessage}
        onNext={() => { setError(null); setStep("confirm"); }}
        onBack={() => setStep("form")}
        onSend={send}
        onDone={onClose}
      />
    </SheetFrame>
  );
}
