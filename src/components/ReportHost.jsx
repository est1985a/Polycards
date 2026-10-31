import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { colors, fontDisplay, btnPrimary, btnGhost } from '../styles/theme';
import { inputStyle, noAutoFix } from '../styles/forms';
import SheetFrame from './SheetFrame';
import { Field, ErrorText, SelectBox } from './ClassFields';
import { REPORT_REASONS, NOTE_MAX, ANSWER_MAX, screenshotDefault, showsAnswerField } from '../lib/cardReports';
import { compressImage, reportContext } from '../lib/reportCapture';
import { submitCardReport, sendReportScreenshot, reportErrorMessage } from '../lib/api';
import { t } from '../i18n';

// Loaded only after the first tap on a report flag (see ReportFlag.jsx).

const TOAST_MS = 2500;

// The report form, without state (so tests can render it as plain markup).
// shot: an object URL of the screenshot to show (the auto-capture or a chosen photo), or null.
export function ReportForm({
  target, reason, note, answer, attach, shot, photoFailed, sending, error,
  onReason, onNote, onAnswer, onAttach, onChoosePhoto, onSend,
}) {
  const answerLabel = target.answer ? t("report.yourAnswer") : t("report.whatAnswer");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div lang="en" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: colors.text, overflowWrap: "anywhere" }}>
        {target.english}
      </div>

      <div role="radiogroup" aria-label={t("report.reasonLabel")} style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{t("report.reasonLabel")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {REPORT_REASONS.map((key) => {
            const on = reason === key;
            return (
              <button
                key={key} type="button" role="radio" aria-checked={on} onClick={() => onReason(key)}
                style={{
                  minHeight: 44, padding: "8px 12px", borderRadius: 12, textAlign: "left", fontSize: 14, lineHeight: 1.3,
                  cursor: "pointer", color: colors.text, background: on ? colors.surface2 : "transparent",
                  border: `2px solid ${on ? colors.accent : colors.line}`, fontWeight: on ? 700 : 400,
                }}
              >
                {t(`report.reason.${key}`)}
              </button>
            );
          })}
        </div>
      </div>

      {showsAnswerField(reason) && (
        <Field label={answerLabel}>
          <input
            type="text" lang="en" value={answer} maxLength={ANSWER_MAX} onChange={(e) => onAnswer(e.target.value)}
            autoCapitalize="none" {...noAutoFix} style={inputStyle}
          />
        </Field>
      )}

      <Field label={t("report.noteLabel")} hint={t("report.count", { n: note.length, max: NOTE_MAX })}>
        <textarea
          value={note} maxLength={NOTE_MAX} rows={3} onChange={(e) => onNote(e.target.value)}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
      </Field>

      <div style={{ display: "grid", gap: 8 }}>
        {shot && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={shot} alt={t("report.shotAlt")}
              style={{ width: 96, maxHeight: 96, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: `1px solid ${colors.line}`, opacity: attach ? 1 : 0.4 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
              <SelectBox checked={attach} label={t("report.attachShot")} onToggle={onAttach} />
              <span aria-hidden="true" onClick={onAttach} style={{ fontSize: 14, color: colors.text, cursor: "pointer" }}>{t("report.attachShot")}</span>
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={onChoosePhoto} style={{ ...btnGhost, minHeight: 44, padding: "8px 14px", fontSize: 14 }}>
            {t("report.choosePhoto")}
          </button>
          {photoFailed && <span style={{ fontSize: 13, color: colors.muted }}>{t("report.photoFailed")}</span>}
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <button
        type="button" onClick={onSend} disabled={!reason || sending}
        style={{ ...btnPrimary, width: "100%", minHeight: 52, fontSize: 17, opacity: !reason || sending ? 0.5 : 1 }}
      >
        {sending ? t("report.sending") : t("report.send")}
      </button>
    </div>
  );
}

// The open sheet: the form's state, the screenshot, sending.
function ReportSheet({ target, capture, onDone, onClose }) {
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState("");
  const [answer, setAnswer] = useState(target.answer || "");
  const [attach, setAttach] = useState(false);
  const [attachTouched, setAttachTouched] = useState(false); // the student ticked / unticked it
  const [captured, setCaptured] = useState(null); // the automatic screenshot (a JPEG blob)
  const [photo, setPhoto] = useState(null);       // a chosen photo, already a JPEG (replaces the capture)
  const [photoFailed, setPhotoFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let live = true;
    capture.then((blob) => { if (live) setCaptured(blob); });
    return () => { live = false; };
  }, [capture]);

  const shotBlob = photo || captured;
  const shotUrl = useMemo(() => (shotBlob ? URL.createObjectURL(shotBlob) : null), [shotBlob]);
  useEffect(() => () => { if (shotUrl) URL.revokeObjectURL(shotUrl); }, [shotUrl]);

  function chooseReason(key) {
    setReason(key);
    if (!attachTouched) setAttach(screenshotDefault(key));
  }

  function toggleAttach() {
    setAttachTouched(true);
    setAttach((a) => !a);
  }

  // A chosen photo (HEIC from the iPad's Photos app included) becomes a JPEG before anything else.
  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // choosing the same photo again still counts
    if (!file) return;
    setPhotoFailed(false);
    compressImage(file)
      .then((blob) => {
        setPhoto(blob);
        setAttachTouched(true);
        setAttach(true);
      })
      .catch((err) => {
        console.warn("Chosen photo could not be read:", err?.message || err);
        setPhotoFailed(true);
      });
  }

  async function send() {
    if (!reason || sending) return;
    setSending(true);
    setError(null);
    try {
      const id = await submitCardReport({
        ...target, reason, note: note.trim(),
        submittedAnswer: showsAnswerField(reason) ? answer.trim() : null,
        context: reportContext(target.source),
      });
      if (attach && shotBlob) await sendReportScreenshot(id, shotBlob);
      onDone(t("report.sent"));
    } catch (err) {
      if (err.code === "already_reported") onDone(t("report.alreadyReported"));
      else {
        setError(reportErrorMessage(err));
        setSending(false);
      }
    }
  }

  return (
    <SheetFrame titleId="report-title" title={t("report.title")} onClose={onClose} className="report-sheet">
      <ReportForm
        target={target} reason={reason} note={note} answer={answer} attach={attach && !!shotUrl} shot={shotUrl}
        photoFailed={photoFailed} sending={sending} error={error}
        onReason={chooseReason} onNote={setNote} onAnswer={setAnswer} onAttach={toggleAttach}
        onChoosePhoto={() => fileRef.current?.click()} onSend={send}
      />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
    </SheetFrame>
  );
}

// A short thank-you at the top of the screen after the sheet closes.
export function ReportToast({ text }) {
  return (
    <div
      data-report-ui="" role="status"
      style={{
        position: "fixed", left: "50%", transform: "translateX(-50%)", top: "calc(16px + env(safe-area-inset-top))", zIndex: 45,
        maxWidth: "calc(100vw - 32px)", boxSizing: "border-box", padding: "10px 18px", borderRadius: 999,
        background: colors.surface2, border: `2px solid ${colors.accent}`, color: colors.text,
        fontSize: 15, fontWeight: 700, textAlign: "center", pointerEvents: "none",
        boxShadow: `0 4px 18px color-mix(in srgb, ${colors.bg} 60%, transparent)`,
      }}
    >
      {text}
    </div>
  );
}

// report: { target, capture } while the sheet is open, else null. Stays mounted after the first
// report, so the thank-you message can show after the sheet has closed.
export default function ReportHost({ report, onClose }) {
  const [toast, setToast] = useState(null); // { text, id }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function done(text) {
    onClose();
    setToast({ text, id: Date.now() });
  }

  return (
    <>
      {report && <ReportSheet key={report.target.wordId} {...report} onDone={done} onClose={onClose} />}
      {toast && createPortal(<ReportToast key={toast.id} text={toast.text} />, document.body)}
    </>
  );
}
