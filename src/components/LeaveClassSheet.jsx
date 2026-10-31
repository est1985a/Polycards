import { useState } from 'react';
import { colors } from '../styles/theme';
import SheetFrame from './SheetFrame';
import { ErrorText } from './ClassFields';
import { ghostSmall, dangerSmall } from '../styles/forms';
import { t } from '../i18n';

// The confirm step as plain markup (tests render it): the question, what stays and what goes,
// then キャンセル / ぬける. Errors show inside.
export function LeaveClassConfirm({ name, busy = false, error = null, onLeave, onCancel }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{t("classTab.leaveConfirm", { name })}</div>
      <p style={{ margin: 0, fontSize: 15, color: colors.muted }}>{t("classTab.leaveNote")}</p>
      <ErrorText>{error}</ErrorText>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onCancel} disabled={busy} autoFocus style={ghostSmall}>{t("classTab.leaveCancel")}</button>
        <button onClick={onLeave} disabled={busy} style={{ ...dangerSmall, opacity: busy ? 0.6 : 1 }}>
          {busy ? t("classTab.leaving") : t("classTab.leaveYes")}
        </button>
      </div>
    </div>
  );
}

// クラスをぬける (クラス tab). onLeave() returns a promise (api.leaveClass); the pop-up closes when it
// succeeds, a failure shows its message here.
export default function LeaveClassSheet({ name, onLeave, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function leave() {
    setBusy(true); setError(null);
    try {
      await onLeave();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <SheetFrame titleId="leave-class-title" title={t("classTab.leaveTitle")} onClose={busy ? () => {} : onClose}>
      <LeaveClassConfirm name={name} busy={busy} error={error} onLeave={leave} onCancel={onClose} />
    </SheetFrame>
  );
}
