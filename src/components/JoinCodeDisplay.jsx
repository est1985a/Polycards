import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { colors, fontDisplay, btnPrimary } from '../styles/theme';
import { splitJoinCode } from '../lib/classes';
import { t } from '../i18n';

// The screen itself (without the portal, so tests can render it).
export function JoinCodeScreen({ classTitle, code, onClose, closeRef = null }) {
  const parts = splitJoinCode(code);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("teacher.joinCodeFor", { name: classTitle })}
      style={{
        position: "fixed", inset: 0, zIndex: 30, background: colors.bg, color: colors.text,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4vh",
        padding: "24px 16px calc(24px + env(safe-area-inset-bottom))", boxSizing: "border-box", textAlign: "center",
      }}
    >
      <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: "clamp(22px, 4vw, 44px)", overflowWrap: "anywhere" }}>
        {t("teacher.joinCodeFor", { name: classTitle })}
      </div>
      <div
        data-join-code=""
        lang="en"
        style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.5em",
          fontFamily: fontDisplay, fontWeight: 700, fontSize: "clamp(56px, 15vw, 220px)", lineHeight: 1,
          letterSpacing: "0.12em", color: colors.gold,
          textShadow: `0 0 32px color-mix(in srgb, ${colors.gold} 35%, transparent)`,
        }}
      >
        {parts.map((p, i) => <span key={i}>{p}</span>)}
      </div>
      <div style={{ fontSize: "clamp(16px, 2.6vw, 28px)", color: colors.muted }}>{t("teacher.joinSteps")}</div>
      <button ref={closeRef} onClick={onClose} style={{ ...btnPrimary, minHeight: 52, minWidth: 160, fontSize: 18 }}>{t("teacher.close")}</button>
    </div>
  );
}

// 大きく表示: the class's join code across the whole screen, to project in the classroom.
// Closes with とじる or Escape.
export default function JoinCodeDisplay({ classTitle, code, onClose }) {
  const closeRef = useRef(null);
  const latestClose = useRef(onClose);
  useEffect(() => { latestClose.current = onClose; });
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') latestClose.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus?.({ preventScroll: true });
    };
  }, []);
  return createPortal(<JoinCodeScreen classTitle={classTitle} code={code} onClose={onClose} closeRef={closeRef} />, document.body);
}
