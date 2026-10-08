import { useState } from 'react';
import { colors, fontDisplay, fontBody, gutter, panel, btnPrimary } from '../styles/theme';
import AddDeckButton from './AddDeckButton';
import Highlighted from './Highlighted';

const blurred = { filter: "blur(6px)", userSelect: "none" };

// One word in the list: English, Japanese, and the example sentence (if any).
// hidden: the Japanese parts are blurred and the row becomes a button that reveals them.
// word: an English-to-Japanese card from buildCards ({ wordId, en, jp, exampleEn, exampleJa }).
export function WordRow({ word, hidden, first, onReveal }) {
  // Props for the Japanese parts: blurred and skipped by screen readers while hidden.
  const jaHidden = hidden || undefined;
  const jaBlur = hidden ? blurred : null;
  const content = (
    <>
      <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", columnGap: 12, rowGap: 2 }}>
        <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.text }}>{word.en}</span>
        <span aria-hidden={jaHidden} style={{ fontFamily: fontBody, fontSize: 16, color: colors.text, ...jaBlur }}>{word.jp}</span>
      </span>
      {word.exampleEn && (
        <span style={{ display: "block", marginTop: 6, fontSize: 14, lineHeight: 1.5, color: colors.text }}>
          <Highlighted sentence={word.exampleEn} english={word.en} />
          {word.exampleJa && (
            <span aria-hidden={jaHidden} style={{ display: "block", fontSize: 13, color: colors.muted, ...jaBlur }}>
              {word.exampleJa}
            </span>
          )}
        </span>
      )}
    </>
  );

  const row = {
    display: "block", width: "100%", boxSizing: "border-box", minHeight: 44, padding: "12px 16px",
    textAlign: "left", fontFamily: fontBody,
  };
  return (
    <li style={{ borderTop: first ? "none" : `1px solid ${colors.line}` }}>
      {hidden ? (
        <button
          onClick={onReveal}
          aria-label={`日本語を見る: ${word.en}`}
          style={{ ...row, background: "transparent", border: "none", cursor: "pointer" }}
        >
          {content}
        </button>
      ) : (
        <div style={row}>{content}</div>
      )}
    </li>
  );
}

// Card Sets: every word of a deck, shown before the drill starts.
// activeSet.cards comes from buildCards (two cards per word, in deck order).
export default function WordList({ activeSet, isAdded, saving, onAddDeck, onStart }) {
  const words = activeSet.cards.filter((c) => c.direction === "en2jp");
  const [hideJa, setHideJa] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set()); // words tapped open while hidden

  function toggleHide() {
    setHideJa((h) => !h);
    setRevealed(new Set());
  }

  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left", paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, margin: 0, color: colors.text }}>{activeSet.name}</h2>
        <span style={{ fontSize: 14, color: colors.muted, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: fontDisplay, fontWeight: 700 }}>{words.length}</span>語
        </span>
      </div>

      <AddDeckButton isAdded={isAdded} saving={saving} onAdd={onAddDeck} />

      <button
        role="switch"
        aria-checked={hideJa}
        onClick={toggleHide}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44,
          padding: 0, background: "transparent", border: "none", cursor: "pointer", fontSize: 15, color: colors.text,
        }}
      >
        <span>日本語をかくす</span>
        <span
          aria-hidden="true"
          style={{
            position: "relative", width: 52, height: 30, flexShrink: 0, boxSizing: "border-box", borderRadius: 15,
            background: hideJa ? colors.accent : colors.surface2, border: `2px solid ${hideJa ? colors.accent : colors.line}`,
          }}
        >
          <span
            style={{
              position: "absolute", top: 2, left: hideJa ? 24 : 2, width: 22, height: 22, borderRadius: "50%",
              background: hideJa ? colors.accentInk : colors.muted, transition: "left 150ms",
            }}
          />
        </span>
      </button>

      <ol style={{ ...panel, padding: 0, margin: 0, listStyle: "none", overflow: "hidden" }}>
        {words.map((w, i) => (
          <WordRow
            key={w.wordId}
            word={w}
            first={i === 0}
            hidden={hideJa && !revealed.has(w.wordId)}
            onReveal={() => setRevealed((r) => new Set(r).add(w.wordId))}
          />
        ))}
      </ol>

      {/* Start button, fixed to the bottom of the screen. */}
      <div
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", zIndex: 10,
          width: "100%", maxWidth: 480, boxSizing: "border-box",
          padding: `12px ${gutter}px calc(12px + env(safe-area-inset-bottom))`,
          background: colors.surface, borderTop: `2px solid ${colors.line}`,
        }}
      >
        <button onClick={onStart} style={{ ...btnPrimary, width: "100%", minHeight: 56, fontSize: 17 }}>
          ドリルを始める (Start drill)
        </button>
      </div>
    </div>
  );
}
