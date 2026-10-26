import { useEffect, useRef } from 'react';
import { colors, fontDisplay, fontBody } from '../styles/theme';
import WordInfo from './WordInfo';
import SpeakerButton from './SpeakerButton';
import PosChip from './PosChip';
import { speakWord, stopSpeaking } from '../lib/speech';
import { directionLabel } from '../lib/drill';
import { t } from '../i18n';

// Flip: 650 ms with a small overshoot. Turned off for "reduce motion" in src/index.css.
const FLIP = "transform 650ms cubic-bezier(0.34, 1.45, 0.55, 1)";

const face = {
  gridArea: "1 / 1", boxSizing: "border-box", width: "100%", minHeight: 320, padding: 20, borderRadius: 24,
  backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
  display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12, textAlign: "center",
  // Set here so the front (a button) and its chip layer (a div) lay out exactly alike. Some browsers
  // give buttons align-items: flex-start, which pushed the word and the hint to the left. Buttons also
  // don't inherit the page's letter-spacing, so it is set too (normal = how the front always looked).
  fontSize: 16, lineHeight: 1.45, letterSpacing: "normal",
};

const topRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 28 };
// Direction label + 品詞 chip, left in the top row. If both don't fit next to the Lv chip (a long
// label on a narrow phone), the chip goes onto a second line instead of running into it.
const topLeft = { flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4, textAlign: "left" };

function LevelChip({ level }) {
  return (
    <span
      style={{
        fontFamily: fontDisplay, fontWeight: 700, fontSize: 13, color: colors.gold, padding: "2px 10px",
        borderRadius: 999, border: `2px solid color-mix(in srgb, ${colors.gold} 45%, transparent)`,
      }}
    >
      {t("review.levelChip", { n: level })}
    </span>
  );
}

// Big word style: Chakra Petch for English, Zen Maru Gothic for Japanese; long text gets smaller.
// Japanese letters are wider, so Japanese starts at 5/6 of the size (48 → 40 px) unless jaSize is given.
function wordStyle(text, isEnglish, size, jaSize = Math.round(size * 5 / 6)) {
  const long = isEnglish ? text.length > 12 : text.length > 7;
  const base = isEnglish ? size : jaSize;
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
// wide: a taller card with bigger text on the back (question 30 px, answer 48 px).
// compact (typing mode, before answering): a short card so the text box and buttons fit above the
// on-screen keyboard. The front can't be tapped (that would show the answer) and the back's
// content isn't drawn until it flips, so it doesn't stretch the card.
// card.pos: the 品詞 chip (PosChip) in the front's top row, right after the direction label, on
// every card (normal and compact, both directions); nothing when null.
// speech: { autoPlay, slow } for the 発音を聞く button, or null when the browser can't speak.
// The button reads the main English (card.en) and only shows where the English is already visible:
// the front of an English → Japanese card, and the back of every card (so never before the answer
// on a Japanese → English card). Auto-play: when the front of an English → Japanese card appears,
// or when a Japanese → English card flips. A card that appears already flipped (Undo) stays quiet.
export default function FlipCard({ card, showLevel, revealed, onFlip, compact = false, wide = false, speech = null }) {
  const backRef = useRef(null);
  const frontIsEnglish = card.direction === "en2jp";
  const shownFlipped = useRef(revealed); // flipped from the start (Undo): no auto-play
  const speechRef = useRef(speech);
  // The latest settings, read by the effects below (changing a setting mid-card doesn't replay the word).
  useEffect(() => { speechRef.current = speech; });

  // Auto-play the English front when the card appears. Leaving the screen stops any reading.
  useEffect(() => {
    const s = speechRef.current;
    if (s?.autoPlay && frontIsEnglish && !shownFlipped.current) speakWord(card.en, { slow: s.slow, audioPath: card.audioPath });
    return () => stopSpeaking();
  }, [card.en, card.audioPath, frontIsEnglish]);

  // Auto-play the English answer when a Japanese → English card flips.
  useEffect(() => {
    const s = speechRef.current;
    if (revealed && !frontIsEnglish && !shownFlipped.current && s?.autoPlay) speakWord(card.en, { slow: s.slow, audioPath: card.audioPath });
  }, [revealed, frontIsEnglish, card.en, card.audioPath]);

  // After the flip, move keyboard / screen-reader focus to the answer (not to an answer button).
  useEffect(() => {
    if (revealed) backRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  const minHeight = compact ? (wide ? 180 : 150) : (wide ? 420 : 320);
  const Front = compact ? "div" : "button";
  const speakerSize = wide ? 52 : 44;
  const chipSize = wide ? 14 : 12;
  // The front's top row: direction label, the 品詞 chip slot, and the Lv chip.
  const frontTopRow = (chipSlot) => (
    <span style={topRow}>
      <span style={topLeft}>
        <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 14, color: colors.accentText }}>
          {directionLabel(card.direction)}
        </span>
        {chipSlot || null}
      </span>
      {showLevel && <LevelChip level={card.level} />}
    </span>
  );
  // A line of English with the speaker button after it.
  const withSpeaker = (line) => !speech ? line : (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      {line}
      <SpeakerButton text={card.en} audioPath={card.audioPath} slow={speech.slow} size={speakerSize} />
    </div>
  );

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
        <Front
          onClick={compact ? undefined : onFlip}
          inert={revealed}
          style={{ ...face, minHeight, background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, cursor: compact ? "default" : "pointer" }}
        >
          {/* The compact front is a plain box, so the chip can sit in it; the normal front is a button, */}
          {/* so it only keeps the chip's space (the chip itself is in the layer below). */}
          {frontTopRow(card.pos && <PosChip pos={card.pos} fontSize={chipSize} placeholder={!compact} />)}
          <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={wordStyle(card.front, frontIsEnglish, 48)}>{card.front}</span>
          </span>
          {!compact && (
            <span
              className="tap-hint"
              style={{ fontSize: 13, color: colors.muted, animation: revealed ? "none" : "polycards-pulse 0.9s ease-in-out infinite alternate" }}
            >
              {t("review.tapToFlip")}
            </span>
          )}
        </Front>

        {/* The chip on the button front: a button can't hold a button, so it is in its own item in the */}
        {/* same grid cell: an invisible copy of the top row (same padding and sizes, so the chip lands */}
        {/* exactly on the front's placeholder) where only the chip is visible and tappable. It turns */}
        {/* away with the front. */}
        {card.pos && !compact && (
          <div
            data-front-pos=""
            inert={revealed}
            style={{
              ...face, minHeight: 0, alignSelf: "start", border: "2px solid transparent", paddingBottom: 0,
              visibility: "hidden", pointerEvents: "none", transform: "translateZ(1px)",
            }}
          >
            {frontTopRow(
              <span style={{ display: "inline-flex", visibility: "visible", pointerEvents: "auto" }}>
                <PosChip pos={card.pos} fontSize={chipSize} />
              </span>,
            )}
          </div>
        )}

        {/* Back: the answer */}
        <div
          ref={backRef}
          tabIndex={-1}
          inert={!revealed}
          style={{
            ...face, minHeight, transform: "rotateY(180deg)", outline: "none",
            background: colors.surface2, border: `2px solid ${colors.accent}`,
            boxShadow: `0 0 24px color-mix(in srgb, ${colors.accent} 28%, transparent)`,
          }}
        >
          {!compact && (
            <>
              <div style={topRow}>
                <span
                  style={{
                    fontSize: 13, fontWeight: 700, padding: "2px 12px", borderRadius: 999,
                    background: colors.accent, color: colors.accentInk,
                  }}
                >
                  {t("review.answerPill")}
                </span>
                {showLevel && <LevelChip level={card.level} />}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
                {(() => {
                  const question = <div style={{ ...wordStyle(card.front, frontIsEnglish, wide ? 30 : 22), fontWeight: 500, color: colors.muted }}>{card.front}</div>;
                  const answer = <div style={{ ...(wide ? wordStyle(card.back, !frontIsEnglish, 48, 48) : wordStyle(card.back, !frontIsEnglish, 32)), color: colors.accentText }}>{card.back}</div>;
                  return frontIsEnglish ? <>{withSpeaker(question)}{answer}</> : <>{question}{withSpeaker(answer)}</>;
                })()}
                <WordInfo english={card.en} exampleEn={card.exampleEn} exampleJa={card.exampleJa} wide={wide} />
              </div>
            </>
          )}
        </div>

        {/* Speaker on the English front: its own item in the same grid cell (a button can't hold a */}
        {/* button), in the bottom-right corner, turning away with the front. */}
        {speech && frontIsEnglish && !compact && (
          <div
            data-front-speaker=""
            inert={revealed}
            style={{
              gridArea: "1 / 1", alignSelf: "end", justifySelf: "end", margin: 14,
              backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "translateZ(1px)",
            }}
          >
            <SpeakerButton text={card.en} audioPath={card.audioPath} slow={speech.slow} size={speakerSize} />
          </div>
        )}
      </div>
    </div>
  );
}
