import { useState } from 'react';
import { colors, fontDisplay, cardStyle, btnPrimary, btnGhost, btnDanger } from '../styles/theme';
import { CLEAR_TARGET, shuffle, reinsert } from '../lib/drill';
import { levelAfterCorrect, levelAfterWrong } from '../lib/srs';
import { saveProgress } from '../lib/api';
import Stamp from './Stamp';
import FlipCard from './FlipCard';

const stampFill = (n) => Array.from({ length: CLEAR_TARGET }, (_, i) => i < n);

// One study session: either the Card Sets drill or an SRS review (activeSet.mode === 'srs').
// Give it a new `key` to start a fresh session.
export default function StudySession({ activeSet, userId, isAdded, saving, onAddDeck, onBack }) {
  const isSrs = activeSet.mode === 'srs';
  const [pile, setPile] = useState(() => shuffle(activeSet.cards.map((c) => c.id)));
  const [counts, setCounts] = useState({});           // drill: correct answers per card
  const [wrongCounts, setWrongCounts] = useState({}); // SRS: misses per card this session
  const [clearedCount, setClearedCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [turn, setTurn] = useState(0); // goes up with every answer

  const done = pile.length === 0;
  const card = done ? null : activeSet.cards.find((c) => c.id === pile[0]) || null;

  function finishAnswer(nextPile, clearedDelta) {
    setPile(nextPile);
    setClearedCount((c) => c + clearedDelta);
    setRevealed(false);
    setTurn((t) => t + 1);
  }

  function save(newLevel) {
    saveProgress(userId, card, newLevel).catch((e) => alert(e.message));
  }

  function handleSrsAnswer(knew) {
    let nextPile = pile.slice(1);
    let clearedDelta = 0;

    if (knew) {
      // Only a clean answer (no misses on this card yet this session) moves it UP.
      // If it was missed earlier, its lowered level was already saved at that miss.
      if (!wrongCounts[card.id]) save(levelAfterCorrect(card.level));
      clearedDelta = 1;
    } else {
      // Each miss lowers the saved level further (see levelAfterWrong).
      // card.level is the level the card had when the session started.
      const wrongs = (wrongCounts[card.id] || 0) + 1;
      setWrongCounts({ ...wrongCounts, [card.id]: wrongs });
      save(levelAfterWrong(card.level, wrongs));
      nextPile = reinsert(nextPile, card.id);
    }
    finishAnswer(nextPile, clearedDelta);
  }

  function handleDrillAnswer(knew) {
    const nextCounts = { ...counts };
    let nextPile = pile.slice(1);
    let clearedDelta = 0;

    if (knew) {
      const n = (counts[card.id] || 0) + 1;
      nextCounts[card.id] = n;
      if (n >= CLEAR_TARGET) {
        clearedDelta = 1;
      } else {
        nextPile = reinsert(nextPile, card.id);
      }
    } else {
      nextCounts[card.id] = 0;
      nextPile = reinsert(nextPile, card.id);
    }
    setCounts(nextCounts);
    finishAnswer(nextPile, clearedDelta);
  }

  function handleAnswer(knew) {
    if (!card) return;
    if (isSrs) handleSrsAnswer(knew);
    else handleDrillAnswer(knew);
  }

  const addDeckControl = isSrs ? null : isAdded ? (
    <div style={{ textAlign: "center", fontSize: 13, color: colors.text }}>✓ マイカードに追加済み (Added to My Cards)</div>
  ) : (
    <button onClick={onAddDeck} disabled={saving} style={{ ...btnGhost, padding: "8px 12px", fontSize: 13 }}>
      {saving ? "追加中..." : "＋ マイカードに追加 (Add to My Cards)"}
    </button>
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.text }}>
        <span>{activeSet.name}</span>
        <span>覚えた: {clearedCount} ・ 残り: {pile.length}</span>
      </div>

      {addDeckControl}

      {card && (
        <>
          <p style={{ fontSize: 14, color: colors.text, margin: 0, textAlign: "center" }}>
            {card.direction === "en2jp" ? "この単語は日本語で何と言いますか？" : "この単語は英語で何と言いますか？"}
          </p>
          {/* A new key per turn: the next card starts on its front without flipping back on screen. */}
          <FlipCard key={turn} card={card} showLevel={isSrs} revealed={revealed} onFlip={() => setRevealed(true)} />
          {!isSrs && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              {stampFill(counts[card.id] || 0).map((f, i) => <Stamp key={i} filled={f} />)}
            </div>
          )}
          {revealed ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnDanger, flex: 1, minHeight: 52 }} onClick={() => handleAnswer(false)}>Still learning<br />まだ</button>
              <button style={{ ...btnPrimary, flex: 1, minHeight: 52 }} onClick={() => handleAnswer(true)}>I knew it<br />わかった</button>
            </div>
          ) : (
            <button style={{ ...btnPrimary, width: "100%", minHeight: 52, fontSize: 17 }} onClick={() => setRevealed(true)}>
              答えを見る
            </button>
          )}
        </>
      )}

      {done && (
        <div style={{ ...cardStyle, padding: 28, textAlign: "center", display: "grid", gap: 10 }}>
          <div style={{ fontFamily: fontDisplay, fontSize: 22, color: colors.text }}>全部クリアしました！</div>
          {addDeckControl}
          <button style={btnGhost} onClick={onBack}>ダッシュボードに戻る</button>
        </div>
      )}
    </div>
  );
}
