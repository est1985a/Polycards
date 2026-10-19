import { useState } from 'react';
import { toggleId } from '../lib/library';
import { colors, fontDisplay, fontBody, gutter, panel, btnPrimary, wideLayout } from '../styles/theme';
import AddDeckButton from './AddDeckButton';
import Highlighted from './Highlighted';
import ToggleSwitch from './ToggleSwitch';

const blurred = { filter: "blur(6px)", userSelect: "none" };

// One word in the list: English, Japanese, and the example sentence (if any).
// hideJa: the 日本語をかくす switch is on, so the Japanese word becomes a button that shows/hides it.
// revealed: this word was tapped open while the switch is on.
// word: an English-to-Japanese card from buildCards ({ wordId, en, jp, exampleEn, exampleJa }).
export function WordRow({ word, hideJa, revealed, first, onToggle }) {
  const hidden = hideJa && !revealed;
  // Props for the Japanese parts: hidden and skipped by screen readers while hidden.
  const jaHidden = hidden || undefined;
  const jpText = { fontFamily: fontBody, fontSize: 16, color: colors.text };

  // The Japanese word. With the switch on it is a button that keeps the word's own size in both
  // states (the text is only made invisible under the placeholder), so the row never jumps.
  const jp = hideJa ? (
    <button
      onClick={onToggle}
      aria-label={`${hidden ? "日本語を見る" : "日本語をかくす"}: ${word.en}`}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "flex-end",
        minHeight: 44, minWidth: 96, boxSizing: "border-box", padding: "0 10px", margin: "-4px -10px -4px 0",
        background: "transparent", border: "none", borderRadius: 10, cursor: "pointer",
      }}
    >
      <span aria-hidden={jaHidden} style={{ ...jpText, visibility: hidden ? "hidden" : "visible" }}>{word.jp}</span>
      {hidden && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: colors.surface2, border: `1px solid ${colors.line}`, borderRadius: 10,
            fontFamily: fontBody, fontSize: 12, color: colors.muted, whiteSpace: "nowrap",
          }}
        >
          タップで表示
        </span>
      )}
    </button>
  ) : (
    <span style={jpText}>{word.jp}</span>
  );

  return (
    <li style={{ borderTop: first ? "none" : `1px solid ${colors.line}` }}>
      <div style={{ boxSizing: "border-box", minHeight: 44, padding: "12px 16px", textAlign: "left", fontFamily: fontBody }}>
        <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", columnGap: 12, rowGap: 2 }}>
          <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.text }}>{word.en}</span>
          {jp}
        </span>
        {word.exampleEn && (
          <span style={{ display: "block", marginTop: 6, fontSize: 14, lineHeight: 1.5, color: colors.text }}>
            <Highlighted sentence={word.exampleEn} english={word.en} />
            {word.exampleJa && (
              <span aria-hidden={jaHidden} style={{ display: "block", fontSize: 13, color: colors.muted, ...(hidden ? blurred : null) }}>
                {word.exampleJa}
              </span>
            )}
          </span>
        )}
      </div>
    </li>
  );
}

// Card Sets: every word of a deck, shown before the drill starts.
// activeSet.cards comes from buildCards (two cards per word, in deck order).
// wide: the fixed start bar matches the 720 px list instead of 480 px.
export default function WordList({ activeSet, isAdded, saving, onAddDeck, onStart, wide = false }) {
  const words = activeSet.cards.filter((c) => c.direction === "en2jp");
  const [hideJa, setHideJa] = useState(false);
  // words tapped open while hidden; cleared by the switch, and reset when the deck is left
  // (App gives the list key={activeSet.id}, so another deck always starts fresh)
  const [revealed, setRevealed] = useState(() => new Set());

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

      {/* The switch stays at the top while the list scrolls under it (solid background). */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: colors.bg, padding: "4px 0", margin: "-4px 0" }}>
        <button
          role="switch"
          aria-checked={hideJa}
          onClick={toggleHide}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, width: "100%",
            padding: 0, background: "transparent", border: "none", cursor: "pointer", fontSize: 15, color: colors.text,
          }}
        >
          <span>日本語をかくす</span>
          <ToggleSwitch on={hideJa} />
        </button>
      </div>

      <ol style={{ ...panel, padding: 0, margin: 0, listStyle: "none", overflow: "hidden" }}>
        {words.map((w, i) => (
          <WordRow
            key={w.wordId}
            word={w}
            first={i === 0}
            hideJa={hideJa}
            revealed={revealed.has(w.wordId)}
            onToggle={() => setRevealed((r) => toggleId(r, w.wordId))}
          />
        ))}
      </ol>

      {/* Start button, fixed to the bottom of the screen. */}
      <div
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", zIndex: 10,
          width: "100%", maxWidth: wide ? wideLayout.readWidth + 2 * gutter : 480, boxSizing: "border-box",
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
