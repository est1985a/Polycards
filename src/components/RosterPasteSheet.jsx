import { useState } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { parseRosterPaste, rosterPayload, previewRows, previewSummary, ROSTER_MAX_ROWS, SCHOOL_EMAIL_DOMAIN } from '../lib/rosterPaste';
import SheetFrame from './SheetFrame';
import { ErrorText, DuplicateNumberTag } from './ClassFields';
import { inputStyle, ghostSmall, primarySmall, noAutoFix } from '../styles/forms';
import { t } from '../i18n';

// How each status pill looks (theme roles only; an error uses danger, a warning never does).
function statusStyle(status) {
  if (status === 'added_member') return { background: colors.accent, borderColor: colors.accent, color: colors.accentInk };
  if (status === 'added_pending' || status === 'updated') return { borderColor: colors.accent, color: colors.accentText };
  if (status === 'error') return { borderColor: colors.danger, color: colors.danger };
  return { borderColor: colors.line, color: colors.muted };
}

export function StatusPill({ status }) {
  return (
    <span
      data-roster-status={status}
      style={{
        display: "inline-block", padding: "2px 10px", borderRadius: 999, border: "1.5px solid", fontSize: 13, fontWeight: 700,
        lineHeight: 1.5, whiteSpace: "nowrap", ...statusStyle(status),
      }}
    >
      {t(`rosterPaste.status.${status}`)}
    </span>
  );
}

// The preview list (one row per pasted line): number, name + email (+ warnings), status.
// rows: previewRows(). Plain markup, so tests can render it.
export function RosterPastePreview({ rows, headerSkipped = false }) {
  const summary = previewSummary(rows);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {headerSkipped && <div style={{ fontSize: 14, color: colors.muted }}>{t("rosterPaste.headerSkipped")}</div>}
      <ul aria-label={t("rosterPaste.previewLabel")} style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {rows.map((r) => (
          <li
            key={r.line}
            style={{
              display: "grid", gridTemplateColumns: "36px minmax(0, 1fr) auto", alignItems: "start", gap: 10,
              padding: "8px 12px", borderRadius: 12, background: colors.surface2,
            }}
          >
            <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.gold, textAlign: "center", lineHeight: 1.5 }}>
              {r.studentNumber == null || Number.isNaN(r.studentNumber) ? (r.numberText || "–") : r.studentNumber}
            </span>
            <span style={{ minWidth: 0, display: "grid", gap: 2, overflowWrap: "anywhere" }}>
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{r.realName || "–"}</span>
                {r.sameNumber && <DuplicateNumberTag />}
              </span>
              <span style={{ fontSize: 13, color: colors.muted }}>{r.email || "–"}</span>
              {r.status === 'error' && <span style={{ fontSize: 13, color: colors.danger }}>{t(`rosterPaste.reason.${r.reason}`)}</span>}
              {r.status !== 'error' && r.outsideSchool && (
                <span data-outside-school="" style={{ fontSize: 13, color: colors.gold }}>{t("rosterPaste.outsideSchool", { domain: SCHOOL_EMAIL_DOMAIN })}</span>
              )}
            </span>
            <StatusPill status={r.status} />
          </li>
        ))}
      </ul>
      {summary.errors > 0 && <div style={{ fontSize: 14, color: colors.muted }}>{t("rosterPaste.errorsSkipped")}</div>}
    </div>
  );
}

// ＋ 名簿を貼り付け (teacher, class page → 名簿): paste → 確認する (the database answers for every row
// without saving: onCheck) → the preview → 名簿に追加 (onSave) → done.
// members / pending: the class's students and 未ログイン rows (for the same-number warning).
// onCheck(rows) / onSave(rows): add_roster_entries() with and without p_dry_run; both return its results.
export default function RosterPasteSheet({ members = [], pending = [], onCheck, onSave, onClose }) {
  const [text, setText] = useState("");
  const [step, setStep] = useState("paste"); // 'paste' | 'preview' | 'done'
  const [parsed, setParsed] = useState(null);
  const [results, setResults] = useState(null);
  const [done, setDone] = useState(null); // add_roster_entries()'s answer after saving
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function check() {
    const p = parseRosterPaste(text);
    setError(null);
    if (p.rows.length === 0) { setError(t("rosterPaste.empty")); return; }
    if (p.tooMany) { setError(t("rosterPaste.tooMany", { n: ROSTER_MAX_ROWS })); return; }
    const payload = rosterPayload(p);
    setBusy(true);
    try {
      setResults(payload.length > 0 ? await onCheck(payload) : []);
      setParsed(p);
      setStep("preview");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      setDone(await onSave(rosterPayload(parsed)));
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (step === "done") {
    const count = (s) => (done || []).filter((r) => r.status === s).length;
    const errors = count("error") + (parsed?.rows.filter((r) => r.problems.length > 0).length ?? 0);
    body = (
      <div style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, color: colors.text }}>{t("rosterPaste.doneTitle")}</h3>
        <p style={{ margin: 0, fontSize: 16, color: colors.text }}>
          {t("rosterPaste.doneCounts", { pending: count("added_pending"), member: count("added_member"), updated: count("updated") })}
        </p>
        {errors > 0 && <p style={{ margin: 0, fontSize: 14, color: colors.muted }}>{t("rosterPaste.doneErrors", { n: errors })}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={primarySmall}>{t("rosterPaste.close")}</button>
        </div>
      </div>
    );
  } else if (step === "preview") {
    const rows = previewRows(parsed, results, members, pending);
    const n = previewSummary(rows).add;
    body = (
      <div style={{ display: "grid", gap: 12 }}>
        <RosterPastePreview rows={rows} headerSkipped={parsed.headerSkipped} />
        <ErrorText>{error}</ErrorText>
        <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => { setStep("paste"); setError(null); }} disabled={busy} style={ghostSmall}>{t("rosterPaste.edit")}</button>
          <button onClick={save} disabled={busy || n === 0} style={{ ...primarySmall, opacity: busy || n === 0 ? 0.6 : 1 }}>
            {busy ? t("rosterPaste.saving") : t("rosterPaste.save", { n, count: n })}
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 15, color: colors.text }}>{t("rosterPaste.intro")}</p>
        <p style={{ margin: 0, fontSize: 14, color: colors.muted }}>{t("rosterPaste.note")}</p>
        <textarea
          aria-label={t("rosterPaste.label")} value={text} onChange={(e) => { setText(e.target.value); setError(null); }}
          placeholder={t("rosterPaste.placeholder")} rows={10} {...noAutoFix} autoCapitalize="none"
          style={{ ...inputStyle, minHeight: 200, resize: "vertical", fontSize: 15, lineHeight: 1.5, whiteSpace: "pre", overflowX: "auto" }}
        />
        <ErrorText>{error}</ErrorText>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={check} disabled={busy || text.trim() === ""} style={{ ...primarySmall, opacity: busy || text.trim() === "" ? 0.6 : 1 }}>
            {busy ? t("rosterPaste.checking") : t("rosterPaste.check")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <SheetFrame titleId="roster-paste-title" title={t("rosterPaste.title")} onClose={onClose} className="roster-paste-sheet">
      {body}
    </SheetFrame>
  );
}
