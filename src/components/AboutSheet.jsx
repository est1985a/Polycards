import { useEffect, useRef } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { levelLadder } from '../lib/schedule';
import { shouldCloseSheet } from '../lib/sheet';
import { ABOUT } from '../content/aboutPolycards';

const chip = {
  display: "inline-flex", alignItems: "baseline", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 14, fontWeight: 700,
};

// Lv1 4時間 … Lv7 4か月 (from LEVEL_HOURS), then Mastered!
function Ladder() {
  return (
    <ol aria-label="レベルと次の復習まで" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {levelLadder().map(({ level, label }) => (
        <li key={level} className="about-ladder-chip" style={{ ...chip, background: colors.surface2, border: `1px solid ${colors.line}`, color: colors.text }}>
          <span style={{ fontFamily: fontDisplay, color: colors.muted }}>Lv{level}</span>
          <span>{label}</span>
        </li>
      ))}
      <li className="about-ladder-mastered" style={{ ...chip, fontFamily: fontDisplay, background: colors.accent, border: `1px solid ${colors.accent}`, color: colors.accentInk }}>
        Mastered!
      </li>
    </ol>
  );
}

const paragraph = { margin: 0, fontSize: 15, lineHeight: 1.7, color: colors.text };

function Section({ number, section }) {
  const { heading, paragraphsBefore = [], paragraphsAfter = [], paragraphs = [], list = [] } = section;
  const hasLadder = paragraphsBefore.length > 0 || paragraphsAfter.length > 0;
  return (
    <section style={{ display: "grid", gap: 10 }}>
      <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 18, color: colors.text }}>
        <span style={{ color: colors.gold }}>{number}.</span> {heading}
      </h3>
      {paragraphsBefore.map((p) => <p key={p} style={paragraph}>{p}</p>)}
      {hasLadder && <Ladder />}
      {paragraphsAfter.map((p) => <p key={p} style={paragraph}>{p}</p>)}
      {paragraphs.map((p) => <p key={p} style={paragraph}>{p}</p>)}
      {list.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 6 }}>
          {list.map((item) => <li key={item} style={paragraph}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}

// "What is Polycards?" pop-up: how the SRS works, for students. Text lives in src/content/aboutPolycards.js.
// Same layout as the review plan pop-up (classes in src/index.css), a little wider on big screens.
// Focus moves to × when it opens and goes back to the button that opened it when it closes.
export default function AboutSheet({ onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (shouldCloseSheet(e)) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="review-plan-backdrop"
      onClick={(e) => { if (shouldCloseSheet(e)) onClose(); }}
      style={{ background: `color-mix(in srgb, ${colors.bg} 75%, transparent)` }}
    >
      <div
        className="review-plan-sheet about-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        style={{ background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, textAlign: "left", paddingTop: 0 }}
      >
        <div style={{ position: "sticky", top: 0, zIndex: 1, background: colors.surface, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "12px 0 10px" }}>
          <div>
            <h2 id="about-title" style={{ margin: 0, fontFamily: fontDisplay, fontSize: 22, fontWeight: 700 }}>{ABOUT.title}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: colors.muted }}>{ABOUT.subtitle}</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="閉じる (Close)"
            style={{ width: 44, height: 44, flexShrink: 0, marginRight: -10, background: "transparent", border: "none", color: colors.muted, fontSize: 26, lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
        <div style={{ display: "grid", gap: 22 }}>
          {ABOUT.sections.map((s, i) => <Section key={s.heading} number={i + 1} section={s} />)}
        </div>
      </div>
    </div>
  );
}
