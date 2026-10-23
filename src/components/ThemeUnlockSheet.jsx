import { useEffect, useRef, useState } from 'react';
import { colors, fontDisplay, btnPrimary, btnGhost } from '../styles/theme';
import { shouldCloseSheet } from '../lib/sheet';
import ThemePreview from './ThemePreview';
import { t, tx } from '../i18n';

// Pop-up on My Cards when a new theme has been unlocked (featuredUnlock in src/lib/themeUnlocks.js).
// item: the new theme with the highest unlock rank; others: how many more are new; rank: the student's
// rank (shown in the preview).
// onUse: applies and saves the theme (App closes the sheet when it worked; if it throws, the sheet
// stays open with the error). onLater: closes (also for ×-less exits: Escape, a tap on the backdrop).
// Same pop-up classes and focus handling as AboutSheet.
export default function ThemeUnlockSheet({ item, others = 0, rank = null, onUse, onLater }) {
  const firstRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const opener = document.activeElement;
    firstRef.current?.focus();
    const onKey = (e) => { if (shouldCloseSheet(e)) onLater(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onLater]);

  async function use() {
    setSaving(true);
    setError(null);
    try {
      await onUse();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div
      className="review-plan-backdrop"
      onClick={(e) => { if (!saving && shouldCloseSheet(e)) onLater(); }}
      style={{ background: `color-mix(in srgb, ${colors.bg} 75%, transparent)` }}
    >
      <div
        className="review-plan-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-unlock-title"
        style={{ background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, textAlign: "center", display: "grid", gap: 14 }}
      >
        <h2 id="theme-unlock-title" style={{ margin: "6px 0 0", fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, color: colors.gold }}>
          {t("themes.rankReached", { n: item.unlockLevel })}
        </h2>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>
          {tx("themes.newTheme", { name: <span style={{ fontWeight: 700 }}>{item.name}</span> })}
        </p>
        <ThemePreview theme={item.theme} rank={rank} radius={16} />
        {others > 0 && (
          <p style={{ margin: 0, fontSize: 14, color: colors.muted }}>{t("themes.others", { n: others })}</p>
        )}
        {error && <div role="alert" style={{ fontSize: 14, color: colors.danger }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            ref={firstRef}
            onClick={use}
            disabled={saving}
            style={{ ...btnPrimary, flex: 1, minHeight: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? t("themes.saving") : t("themes.useNow")}
          </button>
          <button
            onClick={onLater}
            disabled={saving}
            style={{ ...btnGhost, flex: 1, minHeight: 48, borderRadius: 14, fontSize: 16, fontWeight: 700 }}
          >
            {t("themes.later")}
          </button>
        </div>
      </div>
    </div>
  );
}
