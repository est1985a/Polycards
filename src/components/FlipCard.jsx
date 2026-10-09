import { useEffect, useRef } from 'react';
import { colors, fontDisplay, fontBody } from '../styles/theme';
import WordInfo from './WordInfo';
import { directionLabel } from '../lib/drill';

// Flip: 650 ms with a small overshoot. Turned off for "reduce motion" in src/index.css.
const FLIP = "transform 650ms cubic-bezier(0.34, 1.45, 0.55, 1)";

const face = {
  gridArea: "1 / 1", boxSizing: "border-box", width: "100%", minHeight: 320, padding: 20, borderRadius: 24,
  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
  display: "flex", flexDirection: "column", gap: 12, textAlign: "center",
};

const topRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 28 };

function LevelChip({ level }) {
  return (
    <span
      style={{
        fontFamily: fontDisplay, fontWeight: 700, fontSize: 13, color: colors.gold, padding: "2px 10px",
        borderRadius: 999, border: `2px solid color-mix(in srgb, ${colors.gold} 45%, transparent)`,
      }}
    >
      Lv {level}
    </span>
  );
}

// Big word style: Chakra Petch for English, Zen Maru Gothic for Japanese; long text gets smaller.
// Japanese letters are wider, so Japanese starts at 5/6 of the size (48 → 40 px).
function wordStyle(text, isEnglish, size) {
  const long = isEnglish ? text.length > 12 : text.length > 7;
  const base = isEnglish ? size : Math.round(size * 5 / 6);
  return {
    fontFamily: isEnglish ? fontDisplay : fontBody, fontWeight: 700, lineHeight: 1.2, overflowWrap: "anywhere",
    fontSize: long ? Math.round(base * 0.75) : base,
  };
}

// One study card with two faces that flips in 3D.
// The front is a real button (tap, Enter or Space flips it). The back is a plain box because it
// holds the dictionary link. The hidden face is `inert`, so it can't be tabbed to or read aloud.
// Give it a new `key` for each new card so it starts on the front without flipping back on screen.
// card: { front, back, direction, level, en, exampleEn, exampleJa }; showLevel: SRS review only.
export default function FlipCard({ card, showLevel, revealed, onFlip }) {
  const backRef = useRef(null);
  const frontIsEnglish = card.direction === "en2jp";

  // After the flip, move keyboard / screen-reader focus to the answer (not to an answer button).
  useEffect(() => {
    if (revealed) backRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  return (
    <div style={{ perspective: 1200 }}>
      <div
        className="flip-card-inner"
        style={{
          display: "grid", transformStyle: "preserve-3d", transition: FLIP,
          transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front: the question */}
        <button
          onClick={onFlip}
          inert={revealed}
          style={{ ...face, background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, cursor: "pointer" }}
        >
          <span style={topRow}>
            <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 14, color: colors.accentText }}>
              {directionLabel(card.direction)}
            </span>
            {showLevel && <LevelChip level={card.level} />}
          </span>
          <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={wordStyle(card.front, frontIsEnglish, 48)}>{card.front}</span>
          </span>
          <span
            className="tap-hint"
            style={{ fontSize: 13, color: colors.muted, animation: revealed ? "none" : "polycards-pulse 0.9s ease-in-out infinite alternate" }}
          >
            タップしてめくる
          </span>
        </button>

        {/* Back: the answer */}
        <div
          ref={backRef}
          tabIndex={-1}
          inert={!revealed}
          style={{
            ...face, transform: "rotateY(180deg)", outline: "none",
            background: colors.surface2, border: `2px solid ${colors.accent}`,
            boxShadow: `0 0 24px color-mix(in srgb, ${colors.accent} 28%, transparent)`,
          }}
        >
          <div style={topRow}>
            <span
              style={{
                fontSize: 13, fontWeight: 700, padding: "2px 12px", borderRadius: 999,
                background: colors.accent, color: colors.accentInk,
              }}
            >
              答え
            </span>
            {showLevel && <LevelChip level={card.level} />}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
            <div style={{ ...wordStyle(card.front, frontIsEnglish, 22), fontWeight: 500, color: colors.muted }}>{card.front}</div>
            <div style={{ ...wordStyle(card.back, !frontIsEnglish, 32), color: colors.accentText }}>{card.back}</div>
            <WordInfo english={card.en} exampleEn={card.exampleEn} exampleJa={card.exampleJa} />
          </div>
        </div>
      </div>
    </div>
  );
}
