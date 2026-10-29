import { useState } from 'react';
import { toggleId, ownedCounts } from '../lib/library';
import { colors, fontDisplay, fontBody, gutter, panel, btnGhost, wideLayout } from '../styles/theme';
import AddDeckButton from './AddDeckButton';
import Highlighted from './Highlighted';
import ToggleSwitch from './ToggleSwitch';
import SpeakerButton from './SpeakerButton';
import PosChip from './PosChip';
import { t, tx } from '../i18n';

const blurred = { filter: "blur(6px)", userSelect: "none" };

// One word in the list: English, Japanese, and the example sentence (if any).
// hideJa: the 日本語をかくす switch is on, so the Japanese word becomes a button that shows/hides it.
// revealed: this word was tapped open while the switch is on.
// word: an English-to-Japanese card from buildCards ({ wordId, en, jp, exampleEn, exampleJa, pos }).
// The 品詞 chip (word.pos) comes after the English word and the speaker.
// speech: { slow } for the 発音を聞く button after the English word, or null (no button).
// owned: the student already has this word (a small muted 所持済み tag after the English word).
export function WordRow({ word, hideJa, revealed, first, onToggle, speech = null, owned = false }) {
  const hidden = hideJa && !revealed;
  // Props for the Japanese parts: hidden and skipped by screen readers while hidden.
  const jaHidden = hidden || undefined;
  const jpText = { fontFamily: fontBody, fontSize: 16, color: colors.text };

  // The Japanese word. With the switch on it is a button that keeps the word's own size in both
  // states (the text is only made invisible under the placeholder), so the row never jumps.
  const jp = hideJa ? (
    <button
      onClick={onToggle}
      aria-label={hidden ? t("wordList.showWord", { word: word.en }) : t("wordList.hideWord", { word: word.en })}
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
          {t("wordList.tapToShow")}
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.text }}>{word.en}</span>
            {speech && <SpeakerButton text={word.en} audioPath={word.audioPath} slow={speech.slow} style={{ margin: "-4px 0" }} />}
            <PosChip pos={word.pos} />
            {owned && (
              <span style={{
                fontSize: 11, fontWeight: 700, lineHeight: 1.4, color: colors.muted, whiteSpace: "nowrap",
                border: `1px solid ${colors.line}`, borderRadius: 999, padding: "0 7px",
              }}>
                {t("wordList.owned")}
              </span>
            )}
          </span>
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

// Word Packs (Card Sets in the code): every word of a deck, shown before the drill starts.
// activeSet.ownedWordIds: words the student already has (fetchOwnedWordIds), or null if unknown.
// activeSet.cards comes from buildCards (two cards per word, in deck order).
// wide: the fixed bottom bar matches the 720 px list instead of 480 px, with both buttons in one row.
// speech: { slow } for the speaker buttons, or null when the browser can't speak.
// The bottom bar's main button is ＋ マイデッキに追加 (or ✓ added + マイデッキへ, onGoToMyDeck);
// the drill (onStart) is the small おためしドリル button, because it saves nothing.
export default function WordList({ activeSet, isAdded, saving, onAddDeck, onStart, onGoToMyDeck = null, wide = false, speech = null }) {
  const words = activeSet.cards.filter((c) => c.direction === "en2jp");
  // 所持済み tags only while the deck isn't added yet: once it is, every word is owned.
  const ownedIds = !isAdded && Array.isArray(activeSet.ownedWordIds) ? new Set(activeSet.ownedWordIds) : null;
  const [hideJa, setHideJa] = useState(false);
  // words tapped open while hidden; cleared by the switch, and reset when the deck is left
  // (App gives the list key={activeSet.id}, so another deck always starts fresh)
  const [revealed, setRevealed] = useState(() => new Set());

  function toggleHide() {
    setHideJa((h) => !h);
    setRevealed(new Set());
  }

  return (
    // Bottom padding = about the bar's height, so the last word never hides behind it.
    <div style={{ display: "grid", gap: 16, textAlign: "left", paddingBottom: `calc(${wide ? 120 : 170}px + env(safe-area-inset-bottom))` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, margin: 0, color: colors.text }}>{activeSet.name}</h2>
        <span style={{ fontSize: 14, color: colors.muted, whiteSpace: "nowrap" }}>
          {tx("wordList.wordCount", { n: <span style={{ fontFamily: fontDisplay, fontWeight: 700 }}>{words.length}</span>, count: words.length })}
        </span>
      </div>

      {/* The switch stays at the top while the list scrolls under it: frosted glass (surface at 85% plus
          a blur), so a theme's backdrop shows through softly and the text stays readable. */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 5, padding: "4px 12px", margin: "-4px -12px", borderRadius: 14,
          background: `color-mix(in srgb, ${colors.surface} 85%, transparent)`,
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <button
          role="switch"
          aria-checked={hideJa}
          onClick={toggleHide}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, width: "100%",
            padding: 0, background: "transparent", border: "none", cursor: "pointer", fontSize: 15, color: colors.text,
          }}
        >
          <span>{t("wordList.hideSwitch")}</span>
          <ToggleSwitch on={hideJa} />
        </button>
      </div>

      <ol style={{ ...panel, padding: 0, margin: 0, listStyle: "none", overflow: "hidden" }}>
        {words.map((w, i) => (
          <WordRow
            key={w.wordId}
            word={w}
            first={i === 0}
            speech={speech}
            owned={!!ownedIds?.has(w.wordId)}
            hideJa={hideJa}
            revealed={revealed.has(w.wordId)}
            onToggle={() => setRevealed((r) => toggleId(r, w.wordId))}
          />
        ))}
      </ol>

      {/* Bottom bar, fixed to the bottom of the screen: Add to My Deck (main) and the drill (small).
          Phones: the drill under the main button; wide: one row, drill on the left. */}
      <div
        style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", zIndex: 10,
          width: "100%", maxWidth: wide ? wideLayout.readWidth + 2 * gutter : 480, boxSizing: "border-box",
          padding: `12px ${gutter}px calc(12px + env(safe-area-inset-bottom))`,
          background: colors.surface, borderTop: `2px solid ${colors.line}`,
          display: "flex", flexDirection: wide ? "row-reverse" : "column", alignItems: wide ? "flex-end" : "stretch", gap: wide ? 12 : 8,
        }}
      >
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <AddDeckButton
            primary isAdded={isAdded} saving={saving} onAdd={onAddDeck} onGoToMyDeck={onGoToMyDeck}
            counts={ownedCounts(activeSet.cards, activeSet.ownedWordIds)}
          />
        </div>
        <button
          onClick={onStart}
          style={{ ...btnGhost, flex: "0 0 auto", minHeight: wide ? 56 : 44, padding: "8px 18px", fontSize: 14, alignSelf: wide ? "auto" : "center" }}
        >
          {t("wordList.startDrill")}
        </button>
      </div>
    </div>
  );
}
