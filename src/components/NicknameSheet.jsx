import { useState } from 'react';
import { colors } from '../styles/theme';
import { cleanNickname, nicknameValid } from '../lib/classes';
import SheetFrame from './SheetFrame';
import { ErrorText, NicknameField } from './ClassFields';
import { ghostSmall, primarySmall } from '../styles/forms';
import { t } from '../i18n';

// The nickname form: the field, an error, and the save button (plus キャンセル when onCancel is given).
// onSave(cleaned) returns a promise; a failure (e.g. nickname_taken) shows its message here.
export function NicknameForm({ initial = "", onSave, onCancel = null, saveLabel = null, autoFocus = false }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ok = nicknameValid(value) && !busy;

  async function submit(e) {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setError(null);
    try {
      await onSave(cleanNickname(value));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <NicknameField value={value} onChange={(v) => { setValue(v); setError(null); }} autoFocus={autoFocus} />
      <ErrorText>{error}</ErrorText>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {onCancel && <button type="button" onClick={onCancel} style={ghostSmall}>{t("nickname.cancel")}</button>}
        <button type="submit" disabled={!ok} style={{ ...primarySmall, opacity: ok ? 1 : 0.6, color: colors.accentInk }}>
          {busy ? t("nickname.saving") : saveLabel ?? t("nickname.save")}
        </button>
      </div>
    </form>
  );
}

// ニックネームを変更 (クラス tab): a pop-up with the form. onSave(nickname) saves it; closes when done.
export default function NicknameSheet({ initial, onSave, onClose }) {
  return (
    <SheetFrame titleId="nickname-sheet-title" title={t("nickname.sheetTitle")} onClose={onClose}>
      <NicknameForm initial={initial} autoFocus onCancel={onClose} onSave={async (v) => { await onSave(v); onClose(); }} />
    </SheetFrame>
  );
}
