import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { colors, fontDisplay, fontBody, cardStyle, btnPrimary, btnGhost, btnDanger } from '../styles/theme';
import { CLEAR_TARGET, shuffle, reinsert } from '../lib/drill';
import { srsAnswer, newSessionId, saveErrorReporter } from '../lib/srs';
import { checkSpelling, ignoreNextKey, needsOtherMeaningCheck } from '../lib/spelling';
import { recordAnswer, checkOtherMeaning } from '../lib/api';
import Stamp from './Stamp';
import AddDeckButton from './AddDeckButton';
import FlipCard from './FlipCard';

// Visually hidden but read by screen readers.
const srOnly = { position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" };

const stampFill = (n) => Array.from({ length: CLEAR_TARGET }, (_, i) => i < n);

// 答えを見る before the flip; after it, the まだ / わかった buttons with a reassuring note below them
// (below, so the buttons themselves never move).
export function AnswerArea({ revealed, onReveal, onAnswer, answerSize, wide = false }) {
  if (!revealed) {
    return (
      <button style={{ ...btnPrimary, width: "100%", minHeight: 52, fontSize: 17, ...answerSize }} onClick={onReveal}>
        答えを見る
      </button>
    );
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...btnDanger, flex: 1, ...answerSize }} onClick={() => onAnswer(false)}>Still learning<br />まだ</button>
        <button style={{ ...btnPrimary, flex: 1, ...answerSize }} onClick={() => onAnswer(true)}>I knew it<br />わかった</button>
      </div>
      <p style={{ fontSize: wide ? 15 : 13, color: colors.muted, margin: 0, textAlign: "center" }}>
        まだでも大丈夫！すぐにまた出てきます
      </p>
    </div>
  );
}

// Typing mode (Japanese → English cards in SRS review), shown instead of AnswerArea.
// phase 'typing': the text box, わからない and 答える (Enter also answers; disabled while empty).
// phase 'next': answered (correct spelling, or わからない); ✓ 正解！ when correct, then 次へ.
// phase 'choose': one letter off (close) or wrong: what they typed, the right answer, then まだ / わかった.
// checking: waiting to hear if a wrong answer is another word with the same meaning (答える shows 確認中…).
// retryNote: it was, so the student tries again (a calm gold line under the box).
// Give it a new `key` per card so the box is focused when each card appears.
export function TypingArea({
  phase, typed, spelling = null, answer, onTypedChange, onSubmit, onDontKnow, onNext, onAnswer, answerSize,
  checking = false, retryNote = false, wide = false,
}) {
  const inputRef = useRef(null);
  const nextRef = useRef(null);
  const nextShownAt = useRef(0);

  // Focus the box during the tap that showed the card (iOS only opens the keyboard then),
  // and again when the retry note appears.
  useLayoutEffect(() => {
    if (phase === "typing") inputRef.current?.focus({ preventScroll: true });
  }, [phase, retryNote]);

  // A plain effect, so it runs after FlipCard moves focus to the answer: 次へ gets focus (Enter works).
  useEffect(() => {
    if (phase !== "next") return;
    nextShownAt.current = Date.now();
    nextRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const fontSize = wide ? 18 : 16;
  const empty = typed.trim() === "";
  const submitOff = empty || checking;

  if (phase === "typing") {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); if (!submitOff) onSubmit(); }}
        style={{ display: "grid", gap: 10 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => onTypedChange(e.target.value)}
          onKeyDown={(e) => {
            // An Enter that only confirms Japanese-keyboard input must not answer yet.
            if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault();
          }}
          autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} lang="en"
          aria-label="英語で答えを入力"
          placeholder="English"
          style={{
            width: "100%", boxSizing: "border-box", minHeight: 52, padding: "0 16px", borderRadius: 14,
            fontFamily: fontBody, fontSize: wide ? 24 : 20, color: colors.text, background: colors.surface,
            border: `2px solid ${colors.line}`,
          }}
        />
        {retryNote && (
          <p role="status" style={{ margin: 0, textAlign: "center", fontSize: wide ? 17 : 15, color: colors.gold }}>
            それも正しい意味ですが、この単語ではありません。もう一度！
          </p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button" disabled={checking} onClick={onDontKnow}
            style={{ ...btnGhost, flex: 1, fontSize, ...answerSize, opacity: checking ? 0.5 : 1 }}
          >
            わからない
          </button>
          {/* Tapping 答える must not take focus from the box, so the keyboard stays open for a retry. */}
          <button
            type="submit" disabled={submitOff} onPointerDown={(e) => e.preventDefault()}
            style={{ ...btnPrimary, flex: 2, fontSize, ...answerSize, opacity: submitOff ? 0.5 : 1 }}
          >
            {checking ? "確認中…" : "答える"}
          </button>
        </div>
      </form>
    );
  }

  if (phase === "next") {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {spelling === "exact" && (
          <div style={{ textAlign: "center", fontSize: wide ? 22 : 19, fontWeight: 700, color: colors.accentText }}>
            ✓ 正解！
          </div>
        )}
        <button
          ref={nextRef}
          style={{ ...btnPrimary, width: "100%", fontSize: 17, ...answerSize }}
          onKeyDown={(e) => { if (ignoreNextKey(e, nextShownAt.current)) e.preventDefault(); }}
          onClick={onNext}
        >
          次へ
        </button>
      </div>
    );
  }

  // phase 'choose'
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 4, textAlign: "center", fontSize: wide ? 17 : 15, color: colors.text }}>
        {spelling === "close" && <div style={{ fontSize: wide ? 22 : 19, fontWeight: 700, color: colors.gold }}>おしい！</div>}
        <div>あなたの答え: <span lang="en" style={{ fontWeight: 700 }}>{typed}</span></div>
        <div>正しい答え: <span lang="en" style={{ fontWeight: 700, color: colors.accentText }}>{answer}</span></div>
      </div>
      <AnswerArea revealed onReveal={() => {}} onAnswer={onAnswer} answerSize={answerSize} wide={wide} />
    </div>
  );
}

// One study session: either the Card Sets drill or an SRS review (activeSet.mode === 'srs').
// Give it a new `key` to start a fresh session. wide: bigger card text and taller answer buttons.
// typingMode: Japanese → English cards in an SRS review are answered by typing (the drill never is).
export default function StudySession({ activeSet, isAdded, saving, onAddDeck, onBack, typingMode = false, wide = false }) {
  const isSrs = activeSet.mode === 'srs';
  const [pile, setPile] = useState(() => shuffle(activeSet.cards.map((c) => c.id)));
  const [counts, setCounts] = useState({});           // drill: correct answers per card
  const [wrongCounts, setWrongCounts] = useState({}); // SRS: misses per card this session
  const [clearedCount, setClearedCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [turn, setTurn] = useState(0); // goes up with every answer
  const [levelUp, setLevelUp] = useState(null); // SRS: { id, label, mastered } of the level-up float
  const [sessionId] = useState(newSessionId); // SRS: made once, when the session starts
  const [reportSaveError] = useState(() => saveErrorReporter()); // SRS: one save-error pop-up per session
  const [typed, setTyped] = useState("");          // typing mode: what the student typed
  const [typedResult, setTypedResult] = useState(null); // typing mode: { spelling, next, again } once answered
  const [spellBonus, setSpellBonus] = useState(null);   // typing mode: { id } of the "+1 スペル" float
  const [checking, setChecking] = useState(false);      // typing mode: waiting for other_meaning_check
  const [retryUsed, setRetryUsed] = useState(false);    // typing mode: this showing of the card had its retry
  const promptRef = useRef(null);
  const turnRef = useRef(turn); // the current turn, for answers that arrive after a wait
  useEffect(() => { turnRef.current = turn; }, [turn]);

  const done = pile.length === 0;
  const card = done ? null : activeSet.cards.find((c) => c.id === pile[0]) || null;
  const typingCard = Boolean(card) && isSrs && typingMode && card.direction === "jp2en";
  const typingPhase = !typingCard ? null : !typedResult ? "typing" : typedResult.next ? "next" : "choose";

  // While typing, keep the question, the card, the box and the buttons above the on-screen keyboard
  // (on a landscape iPad it covers about half the screen): when the visible area changes size,
  // scroll so the question line is at the top.
  useEffect(() => {
    if (typingPhase !== "typing") return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const keepVisible = () => {
      const el = promptRef.current;
      if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 8 });
    };
    viewport.addEventListener("resize", keepVisible);
    return () => viewport.removeEventListener("resize", keepVisible);
  }, [typingPhase]);

  function finishAnswer(nextPile, clearedDelta) {
    setPile(nextPile);
    setClearedCount((c) => c + clearedDelta);
    setRevealed(false);
    setTyped("");
    setTypedResult(null);
    setChecking(false);
    setRetryUsed(false); // a card that comes back later gets a fresh retry
    setTurn((t) => t + 1);
  }

  // Sends one SRS answer. typedText / localSpelling: typing mode only. The database checks the
  // spelling itself and decides the bonus; if it disagrees with the app, only warn.
  function send(result, typedText = null, localSpelling = null) {
    recordAnswer(card, result, sessionId, typedText)
      .then((saved) => {
        if (typedText !== null && saved && saved.spelling !== localSpelling) {
          console.warn("Spelling check differs from the database:", { typed: typedText, app: localSpelling, database: saved.spelling });
        }
      })
      .catch(reportSaveError);
  }

  function showFloats(answer) {
    if (answer.label) setLevelUp({ id: turn, label: answer.label, mastered: answer.mastered });
    if (answer.spellingBonus) setSpellBonus({ id: turn });
  }

  function handleSrsAnswer(knew) {
    // card.level is the level the card had when the session started; the database works out
    // and saves the new level itself (same rules as src/lib/srs.js).
    const answer = srsAnswer(card.level, knew ? "got_it" : "not_yet", wrongCounts[card.id] || 0);
    // Typing mode, one letter off or wrong: the student's choice goes with what they typed.
    if (typedResult) send(answer.result, typed, typedResult.spelling);
    else send(answer.result);

    showFloats(answer);
    let nextPile = pile.slice(1);
    if (answer.again) {
      setWrongCounts({ ...wrongCounts, [card.id]: answer.wrongs });
      nextPile = reinsert(nextPile, card.id);
    }
    finishAnswer(nextPile, knew ? 1 : 0);
  }

  // Typing mode: 答える. A correct spelling counts as わかった and is saved straight away;
  // otherwise the card flips and the student chooses まだ / わかった.
  // A wrong answer that is another word with the same meaning (once per showing of the card):
  // no flip and nothing saved; the box is cleared for one more try, which is still the first answer.
  function handleTypedAnswer() {
    if (!card || typedResult || checking || typed.trim() === "") return;
    const spelling = checkSpelling(typed, card.en);
    if (!needsOtherMeaningCheck(spelling, retryUsed)) {
      showTypedResult(spelling);
      return;
    }
    const askedTurn = turn;
    setChecking(true);
    checkOtherMeaning(card.wordId, typed).then((otherMeaning) => {
      if (turnRef.current !== askedTurn) return; // the card has moved on
      setChecking(false);
      if (otherMeaning) {
        setRetryUsed(true);
        setTyped("");
      } else {
        showTypedResult(spelling);
      }
    });
  }

  function showTypedResult(spelling) {
    setRevealed(true);
    if (spelling === "exact") {
      const answer = srsAnswer(card.level, "got_it", wrongCounts[card.id] || 0, spelling);
      send(answer.result, typed, spelling);
      showFloats(answer);
      setTypedResult({ spelling, next: true, again: false });
    } else {
      setTypedResult({ spelling, next: false, again: false });
    }
  }

  // Typing mode: わからない. Saved straight away as a miss (the card comes back, like まだ).
  function handleDontKnow() {
    if (!card || typedResult || checking) return;
    const answer = srsAnswer(card.level, "dont_know", wrongCounts[card.id] || 0);
    send(answer.result);
    setWrongCounts({ ...wrongCounts, [card.id]: answer.wrongs });
    setRevealed(true);
    setTypedResult({ spelling: null, next: true, again: true });
  }

  // Typing mode: 次へ after a correct spelling or わからない (already saved).
  function handleNext() {
    if (!card || !typedResult?.next) return;
    let nextPile = pile.slice(1);
    if (typedResult.again) nextPile = reinsert(nextPile, card.id);
    finishAnswer(nextPile, typedResult.again ? 0 : 1);
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

  // Level-up float over the next card (or the finish panel), see src/index.css. It can't be tapped,
  // so the answer buttons keep working underneath.
  // Mastered!: big and gold, rising from the card's top edge (1 s).
  // Lv N!: small, rising from just above the level chip in the top-right corner (0.8 s).
  const levelUpFloat = levelUp && (levelUp.mastered ? (
    <div
      key={`levelup-${levelUp.id}`}
      className="level-up-float"
      aria-hidden="true"
      onAnimationEnd={() => setLevelUp(null)}
      style={{
        position: "absolute", left: 0, right: 0, top: -18, textAlign: "center", pointerEvents: "none",
        fontFamily: fontDisplay, fontWeight: 700, fontSize: 28, color: colors.gold, zIndex: 2,
        textShadow: `0 2px 10px ${colors.bg}, 0 0 4px ${colors.bg}`,
      }}
    >
      {levelUp.label}
    </div>
  ) : (
    <div
      key={`levelup-${levelUp.id}`}
      className="level-up-tick"
      aria-hidden="true"
      onAnimationEnd={() => setLevelUp(null)}
      style={{
        position: "absolute", right: 22, top: 2, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 2,
        fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, lineHeight: 1.2, color: colors.accentText,
        textShadow: `0 2px 10px ${colors.bg}, 0 0 4px ${colors.bg}`,
      }}
    >
      {levelUp.label}
    </div>
  ));

  // "+1 スペル": a correct spelling on a card not missed this session (gold, top-left corner,
  // mirroring the Lv tick on the right). Can't be tapped; only fades with reduce motion.
  const spellBonusFloat = spellBonus && (
    <div
      key={`spell-${spellBonus.id}`}
      className="spell-bonus-float"
      aria-hidden="true"
      onAnimationEnd={() => setSpellBonus(null)}
      style={{
        position: "absolute", left: 22, top: 2, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 2,
        fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, lineHeight: 1.2, color: colors.gold,
        textShadow: `0 2px 10px ${colors.bg}, 0 0 4px ${colors.bg}`,
      }}
    >
      +1 スペル
    </div>
  );

  const addDeckControl = isSrs ? null : <AddDeckButton isAdded={isAdded} saving={saving} onAdd={onAddDeck} />;
  const answerSize = wide ? { minHeight: 76, fontSize: 18 } : { minHeight: 52 };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.text }}>
        <span>{activeSet.name}</span>
        <span>覚えた: {clearedCount} ・ 残り: {pile.length}</span>
      </div>

      {addDeckControl}

      {isSrs && <div role="status" style={srOnly}>{[levelUp?.label, spellBonus && "+1 スペル"].filter(Boolean).join(" ")}</div>}

      {card && (
        <>
          <p ref={promptRef} style={{ fontSize: wide ? 17 : 14, color: colors.text, margin: 0, textAlign: "center" }}>
            {card.direction === "en2jp" ? "この単語は日本語で何と言いますか？" : "この単語は英語で何と言いますか？"}
          </p>
          <div style={{ position: "relative" }}>
            {/* A new key per turn: the next card starts on its front without flipping back on screen. */}
            {/* Prefixed keys (card-, levelup-, spell-): the floats below share this div, and a float made on */}
            {/* the same turn would otherwise have the same key as the card, leaving the old card on screen. */}
            {/* compact while typing: a short card, so the box and buttons fit above the keyboard. */}
            <FlipCard
              key={`card-${turn}`} card={card} showLevel={isSrs} revealed={revealed} onFlip={() => setRevealed(true)}
              compact={typingPhase === "typing"} wide={wide}
            />
            {levelUpFloat}
            {spellBonusFloat}
          </div>
          {!isSrs && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              {stampFill(counts[card.id] || 0).map((f, i) => <Stamp key={i} filled={f} />)}
            </div>
          )}
          {typingPhase ? (
            <TypingArea
              key={turn}
              phase={typingPhase}
              typed={typed}
              spelling={typedResult?.spelling ?? null}
              answer={card.back}
              onTypedChange={(text) => { if (!checking) setTyped(text); }}
              onSubmit={handleTypedAnswer}
              onDontKnow={handleDontKnow}
              onNext={handleNext}
              onAnswer={handleAnswer}
              answerSize={answerSize}
              checking={checking}
              retryNote={retryUsed}
              wide={wide}
            />
          ) : (
            <AnswerArea
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              onAnswer={handleAnswer}
              answerSize={answerSize}
              wide={wide}
            />
          )}
        </>
      )}

      {done && (
        <div style={{ ...cardStyle, position: "relative", padding: 28, textAlign: "center", display: "grid", gap: 10 }}>
          {levelUpFloat}
          {spellBonusFloat}
          <div style={{ fontFamily: fontDisplay, fontSize: 22, color: colors.text }}>全部クリアしました！</div>
          {addDeckControl}
          <button style={btnGhost} onClick={onBack}>ダッシュボードに戻る</button>
        </div>
      )}
    </div>
  );
}
