import { useEffect, useRef } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { levelLadder } from '../lib/schedule';
import { shouldCloseSheet } from '../lib/sheet';
import { ABOUT } from '../content/aboutPolycards';
import { DEFAULT_SESSION_SIZE } from '../lib/srs';
import { t } from '../i18n';

const chip = {
  display: "inline-flex", alignItems: "baseline", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 14, fontWeight: 700,
};

// Lv1 4時間 … Lv7 4か月 (from LEVEL_HOURS), then Mastered!
function Ladder() {
  return (
    <ol aria-label={t("about.ladderLabel")} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {levelLadder().map(({ level, label }) => (
        <li key={level} className="about-ladder-chip" style={{ ...chip, background: colors.surface2, border: `1px solid ${colors.line}`, color: colors.text }}>
          <span style={{ fontFamily: fontDisplay, color: colors.muted }}>{t("about.ladderLevel", { n: level })}</span>
          <span>{label}</span>
        </li>
      ))}
      <li className="about-ladder-mastered" style={{ ...chip, fontFamily: fontDisplay, background: colors.accent, border: `1px solid ${colors.accent}`, color: colors.accentInk }}>
        {t("about.ladderMastered")}
      </li>
    </ol>
  );
}

const paragraph = { margin: 0, fontSize: 15, lineHeight: 1.7, color: colors.text };

function Section({ number, section, sessionSize }) {
  const fill = (keys) => keys.map((key) => t(key, { sessionSize }));
  const heading = t(section.heading);
  const paragraphsBefore = fill(section.paragraphsBefore ?? []);
  const paragraphsAfter = fill(section.paragraphsAfter ?? []);
  const paragraphs = fill(section.paragraphs ?? []);
  const list = fill(section.list ?? []);
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

// "What is Polycards?" pop-up: how the SRS works, for students. Layout in src/content/aboutPolycards.js,
// wording in src/i18n/ja.js (about.*).
// Same layout as the review plan pop-up (classes in src/index.css), a little wider on big screens.
// Focus moves to × when it opens and goes back to the button that opened it when it closes.
// sessionSize: the student's 1回の枚数, shown in the text.
export default function AboutSheet({ onClose, sessionSize = DEFAULT_SESSION_SIZE }) {
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
            <h2 id="about-title" style={{ margin: 0, fontFamily: fontDisplay, fontSize: 22, fontWeight: 700 }}>{t(ABOUT.title)}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: colors.muted }}>{t(ABOUT.subtitle)}</p>
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
        <div style={{ display: "grid", gap: 22 }}>
          {ABOUT.sections.map((s, i) => <Section key={s.heading} number={i + 1} section={s} sessionSize={sessionSize} />)}
        </div>
      </div>
    </div>
  );
}
