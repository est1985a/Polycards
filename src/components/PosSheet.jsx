import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { colors, fontDisplay } from '../styles/theme';
import { shouldCloseSheet } from '../lib/sheet';
import { POS_KEYS, POS_EXAMPLES } from '../lib/partsOfSpeech';
import { t } from '../i18n';

// One part of speech: name (current language) + the other language's name, the explanation,
// and English example words. The one on the tapped chip is highlighted.
function PosRow({ pos, current, rowRef }) {
  return (
    <li
      ref={current ? rowRef : null}
      aria-current={current ? "true" : undefined}
      style={{
        display: "grid", gap: 6, padding: "12px 14px", borderRadius: 14,
        background: current ? colors.surface2 : "transparent",
        border: `2px solid ${current ? colors.accent : colors.line}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 10 }}>
        <span style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, color: current ? colors.accentText : colors.text }}>{t(`pos.label.${pos}`)}</span>
        <span style={{ fontSize: 14, color: colors.muted }}>{t(`pos.other.${pos}`)}</span>
      </div>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: colors.text }}>{t(`pos.desc.${pos}`)}</p>
      <ul lang="en" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {POS_EXAMPLES[pos].map((word) => (
          <li
            key={word}
            style={{
              fontFamily: fontDisplay, fontSize: 14, fontWeight: 700, padding: "2px 10px", borderRadius: 999,
              background: colors.surface, border: `1px solid ${colors.line}`, color: colors.gold,
            }}
          >
            {word}
          </li>
        ))}
      </ul>
    </li>
  );
}

// The box itself (without the portal, so tests can render it as plain markup).
export function PosSheetBox({ highlight, onClose, closeRef = null, rowRef = null, sheetRef = null }) {
  return (
    <div
      ref={sheetRef}
      className="review-plan-sheet about-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-title"
      style={{ background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, textAlign: "left", paddingTop: 0 }}
    >
      <div style={{ position: "sticky", top: 0, zIndex: 1, background: colors.surface, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "12px 0 10px" }}>
        <div>
          <h2 id="pos-title" style={{ margin: 0, fontFamily: fontDisplay, fontSize: 22, fontWeight: 700 }}>{t("pos.title")}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: colors.muted }}>{t("pos.subtitle")}</p>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label={t("common.close")}
          style={{ width: 44, height: 44, flexShrink: 0, marginRight: -10, background: "transparent", border: "none", color: colors.muted, fontSize: 26, lineHeight: 1, cursor: "pointer" }}
        >
          ×
        </button>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {POS_KEYS.map((pos) => <PosRow key={pos} pos={pos} current={pos === highlight} rowRef={rowRef} />)}
      </ul>
    </div>
  );
}

// 品詞 pop-up: all 12 parts of speech, the tapped one highlighted and scrolled into view.
// Same pattern and classes as the review plan / "What is Polycards?" pop-ups, but drawn into
// <body> (a portal): the study card has a 3D transform, which would trap a fixed box inside it.
// Closes with ×, Escape or a tap on the backdrop. Focus goes to × when it opens; PosChip puts it
// back (to the chip, or to the typing box) when it closes.
export default function PosSheet({ highlight, onClose }) {
  const closeRef = useRef(null);
  const rowRef = useRef(null);
  const sheetRef = useRef(null);
  const latestClose = useRef(onClose);
  useEffect(() => { latestClose.current = onClose; });

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    // Center the highlighted row by scrolling the box only (scrollIntoView could also move the page
    // behind it, and the student should come back to exactly where they were).
    const sheet = sheetRef.current; const row = rowRef.current;
    if (sheet && row) {
      const s = sheet.getBoundingClientRect(); const r = row.getBoundingClientRect();
      sheet.scrollTop += r.top - s.top - (s.height - r.height) / 2;
    }
    const onKey = (e) => { if (shouldCloseSheet(e)) latestClose.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return createPortal(
    // Clicks inside the pop-up must not bubble (through React) to whatever holds the chip.
    <div
      className="review-plan-backdrop"
      onClick={(e) => { e.stopPropagation(); if (shouldCloseSheet(e)) onClose(); }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ background: `color-mix(in srgb, ${colors.bg} 75%, transparent)` }}
    >
      <PosSheetBox highlight={highlight} onClose={onClose} closeRef={closeRef} rowRef={rowRef} sheetRef={sheetRef} />
    </div>,
    document.body,
  );
}
