import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { colors, fontBody } from '../styles/theme';
import { rarityInfo, rarityGlow, obtainedDate } from '../lib/gacha';
import { shouldCloseSheet } from '../lib/sheet';
import AvatarShowcase from './AvatarShowcase';
import { t } from '../i18n';

// The card itself (without the portal, so tests can render it as plain markup).
// Same card as the gacha reveal's finished look, plus 入手日 and ×.
export function AvatarViewerBox({ avatar, onClose, closeRef = null }) {
  const info = rarityInfo(avatar.rarity);
  const date = obtainedDate(avatar.obtained_at);
  return (
    <div
      className="gacha-reveal-in"
      role="dialog"
      aria-modal="true"
      aria-label={t("collection.viewerLabel")}
      style={{
        position: "relative", width: "100%", maxWidth: 380, boxSizing: "border-box", textAlign: "center",
        background: colors.surface, border: `2px solid ${info.color}`, borderRadius: 24, padding: 24,
        boxShadow: rarityGlow(avatar.rarity), display: "grid", gap: 14, margin: "auto",
      }}
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label={t("common.close")}
        style={{
          position: "absolute", top: 6, right: 6, width: 44, height: 44, background: "transparent", border: "none",
          color: colors.muted, fontSize: 26, lineHeight: 1, cursor: "pointer",
        }}
      >
        ×
      </button>
      <AvatarShowcase avatar={avatar} />
      {date && <div style={{ fontSize: 14, color: colors.muted }}>{t("collection.obtainedOn", date)}</div>}
    </div>
  );
}

// ポリアバター図鑑: the worn Polyavatar shown large (opened by tapping it in the summary panel).
// Drawn into <body> over a dimmed backdrop; closes with ×, Escape or a tap on the backdrop.
// Focus goes to × when it opens; GachaCollection puts it back on the avatar when it closes.
export default function AvatarViewer({ avatar, onClose }) {
  const closeRef = useRef(null);
  const latestClose = useRef(onClose);
  useEffect(() => { latestClose.current = onClose; });

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (shouldCloseSheet(e)) latestClose.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return createPortal(
    <div
      onClick={(e) => { if (shouldCloseSheet(e)) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 30, overflowY: "auto", display: "flex", padding: 16, boxSizing: "border-box",
        background: `color-mix(in srgb, ${colors.bg} 75%, transparent)`, fontFamily: fontBody, color: colors.text,
      }}
    >
      <AvatarViewerBox avatar={avatar} onClose={onClose} closeRef={closeRef} />
    </div>,
    document.body,
  );
}
