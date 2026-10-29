import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { colors, fontDisplay } from '../styles/theme';
import { shouldCloseSheet } from '../lib/sheet';
import { t } from '../i18n';

// The box of a pop-up: a sticky title row with ×, then the content. Without the portal, so tests
// can render it as plain markup.
export function SheetBox({ titleId, title, onClose, closeRef = null, className = "", children }) {
  return (
    <div
      className={`review-plan-sheet ${className}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{ background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, textAlign: "left", paddingTop: 0 }}
    >
      <div style={{ position: "sticky", top: 0, zIndex: 1, background: colors.surface, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 0 10px" }}>
        <h2 id={titleId} style={{ margin: 0, fontFamily: fontDisplay, fontSize: 22, fontWeight: 700 }}>{title}</h2>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label={t("common.close")}
          style={{ width: 44, height: 44, flexShrink: 0, marginRight: -10, background: "transparent", border: "none", color: colors.muted, fontSize: 26, lineHeight: 1, cursor: "pointer" }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

// A pop-up in the same style as the review plan / 品詞 pop-ups, drawn into <body>. Closes with ×,
// Escape or a tap on the backdrop. Focus goes to × when it opens and back to whatever had it
// (the button that opened it) when it closes.
export default function SheetFrame({ titleId, title, onClose, className, children }) {
  const closeRef = useRef(null);
  const latestClose = useRef(onClose);
  useEffect(() => { latestClose.current = onClose; });

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (shouldCloseSheet(e)) latestClose.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      className="review-plan-backdrop"
      onClick={(e) => { if (shouldCloseSheet(e)) onClose(); }}
      style={{ background: `color-mix(in srgb, ${colors.bg} 75%, transparent)` }}
    >
      <SheetBox titleId={titleId} title={title} onClose={onClose} closeRef={closeRef} className={className}>
        {children}
      </SheetBox>
    </div>,
    document.body,
  );
}
