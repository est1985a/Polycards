import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { colors, fontDisplay, fontBody, cardStyle, btnPrimary, btnGhost, btnDanger } from '../styles/theme';
import { CLEAR_TARGET, shuffle, reinsert } from '../lib/drill';
import { srsAnswer, newSessionId, saveErrorReporter } from '../lib/srs';
import { checkSpelling, ignoreNextKey, isAlternateAnswer, needsOtherMeaningCheck } from '../lib/spelling';
import { recordAnswer, checkOtherMeaning, holdAnswer, flushHeldAnswer, dropHeldAnswer } from '../lib/api';
import { takeSnapshot, makeUndo, restoreState, chipLabelKey } from '../lib/undo';
import Stamp from './Stamp';
import AddDeckButton from './AddDeckButton';
import FlipCard from './FlipCard';
import HandwritingInput from '../handwriting/HandwritingInput.jsx';
import { loadModel } from '../handwriting/model.js';
import { fittingAlternates, writtenAnswer } from '../handwriting/answerLayout.js';
import { HANDWRITING_ENABLED, LENIENT_GIVES_BONUS } from '../handwriting/config.js';
import { t, tx } from '../i18n';

// Visually hidden but read by screen readers.
const srOnly = { position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" };

const stampFill = (n) => Array.from({ length: CLEAR_TARGET }, (_, i) => i < n);

// An answer button's text: the English line, then the Japanese line under it. English mode has
// no Japanese line ("" in en.js), so the button shows English only.
function answerLabel(prefix) {
  const ja = t(`${prefix}.ja`);
  return <>{t(`${prefix}.en`)}{ja && <><br />{ja}</>}</>;
}

// 答えを見る before the flip; after it, the まだ / わかった buttons with a reassuring note below them
// (below, so the buttons themselves never move).
export function AnswerArea({ revealed, onReveal, onAnswer, answerSize, wide = false }) {
  if (!revealed) {
    return (
      <button style={{ ...btnPrimary, width: "100%", minHeight: 52, fontSize: 17, ...answerSize }} onClick={onReveal}>
        {t("review.showAnswer")}
      </button>
    );
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...btnDanger, flex: 1, ...answerSize }} onClick={() => onAnswer(false)}>{answerLabel("review.notYet")}</button>
        <button style={{ ...btnPrimary, flex: 1, ...answerSize }} onClick={() => onAnswer(true)}>{answerLabel("review.gotIt")}</button>
      </div>
      <p style={{ fontSize: wide ? 15 : 13, color: colors.muted, margin: 0, textAlign: "center" }}>
        {t("review.notYetNote")}
      </p>
    </div>
  );
}

// The "previous card" chip: the last card's front word, the button pressed, and 元に戻す.
// side: beside the card (wide screens with room, see SIDE_CHIP_QUERY), one centered column with a
// fixed-width button (same size in Japanese and English); otherwise a slim row above the card.
// The word is cut to 3 lines beside the card, 1 in the row, ending with "…"; a long word with no
// spaces breaks anywhere, so nothing sticks out. Small and muted, with no animation.
export function PreviousCardChip({ undo, onUndo, side = false }) {
  const prefix = chipLabelKey(undo.knew);
  const pressed = t(`${prefix}.ja`) || t(`${prefix}.en`); // English mode has no Japanese line
  const pressedColor = undo.knew ? colors.accentText : colors.danger;
  const align = side ? "center" : "baseline";
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: side ? 6 : 10, flexDirection: side ? "column" : "row",
        fontSize: 13, color: colors.muted, minWidth: 0, textAlign: side ? "center" : "left",
      }}
    >
      <div style={{ display: "flex", flexDirection: side ? "column" : "row", gap: side ? 2 : 8, alignItems: align, minWidth: 0, maxWidth: "100%" }}>
        <span style={{ flexShrink: 0 }}>{t("review.previousCard")}</span>
        <span
          style={{
            fontWeight: 700, color: colors.text, overflowWrap: "anywhere", minWidth: 0, flex: "0 1 auto",
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: side ? 3 : 1, overflow: "hidden",
          }}
        >
          {undo.front}
        </span>
        <span style={{ fontWeight: 700, color: pressedColor, flexShrink: 0 }}>{undo.knew ? "✓ " : ""}{pressed}</span>
      </div>
      <button
        style={{
          ...btnGhost, minHeight: 44, fontSize: 13, color: colors.muted, flexShrink: 0,
          ...(side ? { width: 96, padding: 0 } : { padding: "0 14px" }),
        }}
        aria-label={t("review.undoAria")}
        onClick={onUndo}
      >
        {t("review.undo")}
      </button>
    </div>
  );
}

// Typing mode (Japanese → English cards in SRS review), shown instead of AnswerArea.
// phase 'typing': the text box, わからない and 答える (Enter also answers; disabled while empty).
// phase 'next': answered (correct spelling, or わからない); ✓ 正解！ when correct, then 次へ.
// phase 'choose': one letter off (close) or wrong: what they typed, the right answer, then まだ / わかった.
// checking: waiting to hear if a wrong answer is another word with the same meaning (答える shows 確認中…).
// retryNote: it was, so the student tries again (a calm gold line under the box).
// textbookAnswer: an alternate answer was accepted; the textbook's word, shown under ✓ 正解！.
// alternateAnswer: that alternate as the student gave it, shown (lighter) before ✓ 正解！.
// Give it a new `key` per card so the box is focused when each card appears.
export function TypingArea({
  phase, typed, spelling = null, answer, onTypedChange, onSubmit, onDontKnow, onNext, onAnswer, answerSize,
  checking = false, retryNote = false, textbookAnswer = null, alternateAnswer = null, wide = false,
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
          aria-label={t("review.typingLabel")}
          placeholder={t("review.typingPlaceholder")}
          style={{
            width: "100%", boxSizing: "border-box", minHeight: 52, padding: "0 16px", borderRadius: 14,
            fontFamily: fontBody, fontSize: wide ? 24 : 20, color: colors.text, background: colors.surface,
            border: `2px solid ${colors.line}`,
          }}
        />
        {retryNote && (
          <p role="status" style={{ margin: 0, textAlign: "center", fontSize: wide ? 17 : 15, color: colors.gold }}>
            {t("review.otherMeaning")}
          </p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button" disabled={checking} onClick={onDontKnow}
            style={{ ...btnGhost, flex: 1, fontSize, ...answerSize, opacity: checking ? 0.5 : 1 }}
          >
            {t("review.dontKnow")}
          </button>
          {/* Tapping 答える must not take focus from the box, so the keyboard stays open for a retry. */}
          <button
            type="submit" disabled={submitOff} onPointerDown={(e) => e.preventDefault()}
            style={{ ...btnPrimary, flex: 2, fontSize, ...answerSize, opacity: submitOff ? 0.5 : 1 }}
          >
            {checking ? t("review.checking") : t("review.submit")}
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
            {alternateAnswer && <><span lang="en" style={{ fontWeight: 400 }}>{alternateAnswer}</span>{" "}</>}
            {t("review.correct")}
          </div>
        )}
        {spelling === "exact" && textbookAnswer && (
          <div style={{ textAlign: "center", fontSize: wide ? 16 : 14, color: colors.gold }}>
            {tx("review.textbookAnswer", { answer: <span lang="en" style={{ fontWeight: 700 }}>{textbookAnswer}</span> })}
          </div>
        )}
        <button
          ref={nextRef}
          style={{ ...btnPrimary, width: "100%", fontSize: 17, ...answerSize }}
          onKeyDown={(e) => { if (ignoreNextKey(e, nextShownAt.current)) e.preventDefault(); }}
          onClick={onNext}
        >
          {t("review.next")}
        </button>
      </div>
    );
  }

  // phase 'choose'
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 4, textAlign: "center", fontSize: wide ? 17 : 15, color: colors.text }}>
        {spelling === "close" && <div style={{ fontSize: wide ? 22 : 19, fontWeight: 700, color: colors.gold }}>{t("review.close")}</div>}
        <div>{tx("review.yourAnswer", { answer: <span lang="en" style={{ fontWeight: 700 }}>{typed}</span> })}</div>
        <div>{tx("review.rightAnswer", { answer: <span lang="en" style={{ fontWeight: 700, color: colors.accentText }}>{answer}</span> })}</div>
      </div>
      <AnswerArea revealed onReveal={() => {}} onAnswer={onAnswer} answerSize={answerSize} wide={wide} />
    </div>
  );
}

// One study session: either the Card Sets drill or an SRS review (activeSet.mode === 'srs').
// Give it a new `key` to start a fresh session. wide: bigger card text and taller answer buttons.
// answerMode: how Japanese → English cards in an SRS review are answered: "off" (buttons), "typing"
// or "handwriting" (Apple Pencil, src/handwriting/). The drill always uses the buttons.
// sideChip: there is room for the "previous card" chip beside the card (else it goes above it).
//
// Undo: the last まだ / わかった answer is held (holdAnswer in api.js), not sent, so 元に戻す can throw
// it away and put the session back as it was (src/lib/undo.js). It is sent when the next answer is
// given, when this screen closes, and when the app goes to the background. A correct spelling and
// わからない are not undoable: they are sent at once, after the held answer.
export default function StudySession({ activeSet, isAdded, saving, onAddDeck, onBack, answerMode = "off", wide = false, sideChip = false }) {
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
  const [handwritingFailed, setHandwritingFailed] = useState(false); // the letter model couldn't run: typing instead
  const [undo, setUndo] = useState(null); // the held まだ / わかった answer that can be undone (makeUndo)
  const [answeredOnce, setAnsweredOnce] = useState(false); // keeps the chip's row reserved after the first answer
  const promptRef = useRef(null);
  const turnRef = useRef(turn); // the current turn, for answers that arrive after a wait
  useEffect(() => { turnRef.current = turn; }, [turn]);

  // Leaving the review in any way sends the held answer. A layout-effect cleanup runs while React
  // is still updating the screen, before App's effects wait for pending saves and recount points.
  useLayoutEffect(() => () => { flushHeldAnswer(); }, []);

  // The app going to the background (or the page closing) sends it too; then there is nothing to undo.
  useEffect(() => {
    const onHide = (e) => {
      if (e.type === "visibilitychange" && document.visibilityState !== "hidden") return;
      flushHeldAnswer();
      setUndo(null);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  const done = pile.length === 0;
  const card = done ? null : activeSet.cards.find((c) => c.id === pile[0]) || null;
  const typingCard = Boolean(card) && isSrs && answerMode !== "off" && card.direction === "jp2en";
  // Handwriting goes through the same typing-mode answers, only the input differs.
  const handwritingSession = HANDWRITING_ENABLED && isSrs && answerMode === "handwriting"
    && activeSet.cards.some((c) => c.direction === "jp2en");
  const handwritingCard = typingCard && handwritingSession && !handwritingFailed;

  // 手書き: start loading (and warming up) the letter model as soon as the review starts, so the
  // first card doesn't wait. If it can't load, this session uses typing instead.
  useEffect(() => {
    if (!handwritingSession) return;
    loadModel().catch((error) => {
      console.warn("Handwriting model could not be loaded:", error);
      setHandwritingFailed(true);
    });
  }, [handwritingSession]);
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
      if (!el || !el.getClientRects().length) return; // hidden while settings is open
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
    setAnsweredOnce(true);
  }

  // The session as it is now, before an answer changes it (for Undo).
  function snapshotNow() {
    return takeSnapshot({ pile, counts, wrongCounts, clearedCount, typed, typedResult, retryUsed });
  }

  // A まだ / わかった answer: held (sent later, see the top of StudySession) so it can be undone.
  // sendIt sends it; the drill saves nothing, so there it does nothing.
  function holdForUndo(snapshot, knew, sendIt) {
    holdAnswer(sendIt);
    setUndo(makeUndo(snapshot, card, knew));
  }

  // Before an answer that is sent at once (correct spelling, わからない): send the held one first.
  function sendHeld() {
    flushHeldAnswer();
    setUndo(null);
  }

  // 元に戻す: forget the held answer and put the session back as it was, with the card on top and
  // its まだ / わかった showing again (a new turn key, so it appears already flipped, no animation).
  function handleUndo() {
    if (!undo) return;
    dropHeldAnswer();
    const state = restoreState(undo);
    setPile(state.pile);
    setCounts(state.counts);
    setWrongCounts(state.wrongCounts);
    setClearedCount(state.clearedCount);
    setTyped(state.typed);
    setTypedResult(state.typedResult);
    setRetryUsed(state.retryUsed);
    setChecking(state.checking);
    setRevealed(state.revealed);
    setLevelUp(null);
    setSpellBonus(null);
    setUndo(null);
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
    const snapshot = snapshotNow();
    const answer = srsAnswer(card.level, knew ? "got_it" : "not_yet", wrongCounts[card.id] || 0);
    // Typing mode, one letter off or wrong: the student's choice goes with what they typed.
    if (typedResult) {
      const typedText = typed, spelling = typedResult.spelling;
      holdForUndo(snapshot, knew, () => send(answer.result, typedText, spelling));
    } else {
      holdForUndo(snapshot, knew, () => send(answer.result));
    }

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
    // An alternate answer (card.altAnswers) spelled right is exact, so it never gets the retry.
    const spelling = checkSpelling(typed, card.en, card.altAnswers);
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
      sendHeld();
      send(answer.result, typed, spelling);
      showFloats(answer);
      setTypedResult({ spelling, next: true, again: false, alternate: isAlternateAnswer(typed, card.en, card.altAnswers) ? typed.trim() : null });
    } else {
      setTypedResult({ spelling, next: false, again: false });
    }
  }

  // 手書き: こたえる, once the model has read the boxes. All boxes right (look-alikes included) is a
  // correct spelling: the target word goes as the typed answer, so the database gives the bonus
  // (unless LENIENT_GIVES_BONUS is off and a box was only lenient: then nothing typed is sent).
  // Otherwise the card flips and the student chooses まだ / わかった, sent with what was read.
  // An alternate that fits the boxes may be accepted instead (read.accepted): it is sent instead of
  // the textbook word, and 教科書の答え shows the textbook word.
  // readTurn: the turn the boxes were written on; a read that finishes after an Undo is ignored.
  function handleHandwritingResult(read, readTurn) {
    if (!card || typedResult || turnRef.current !== readTurn) return;
    setRevealed(true);
    if (read.allCorrect) {
      const bonus = !read.hasLenient || LENIENT_GIVES_BONUS;
      const answer = srsAnswer(card.level, "got_it", wrongCounts[card.id] || 0, bonus ? "exact" : null);
      sendHeld();
      send(answer.result, bonus ? read.accepted ?? writtenAnswer(card.en) : null, bonus ? "exact" : null);
      showFloats(answer);
      setTypedResult({ spelling: "exact", next: true, again: false, alternate: read.accepted ?? null, handwriting: read });
    } else {
      setTyped(read.text);
      setTypedResult({ spelling: checkSpelling(read.text, card.en, card.altAnswers), next: false, again: false, handwriting: read });
    }
  }

  // Typing mode: わからない. Saved straight away as a miss (the card comes back, like まだ).
  function handleDontKnow() {
    if (!card || typedResult || checking) return;
    const answer = srsAnswer(card.level, "dont_know", wrongCounts[card.id] || 0);
    sendHeld();
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
    holdForUndo(snapshotNow(), knew, () => {}); // the drill saves nothing, but can be undone
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
      {t("review.spellBonus")}
    </div>
  );

  const addDeckControl = isSrs ? null : <AddDeckButton isAdded={isAdded} saving={saving} onAdd={onAddDeck} />;
  const answerSize = wide ? { minHeight: 76, fontSize: 18 } : { minHeight: 52 };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.text }}>
        <span>{activeSet.name}</span>
        <span>{t("review.progress", { cleared: clearedCount, left: pile.length })}</span>
      </div>

      {addDeckControl}

      {isSrs && <div role="status" style={srOnly}>{[levelUp?.label, spellBonus && t("review.spellBonus")].filter(Boolean).join(" ")}</div>}

      {/* No room beside the card: a row above the question. After the first answer it keeps its */}
      {/* height even when there is nothing to undo, so the card doesn't jump between cards. */}
      {card && !sideChip && answeredOnce && (
        <div style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
          {undo && <PreviousCardChip undo={undo} onUndo={handleUndo} />}
        </div>
      )}

      {card && (
        <>
          <p ref={promptRef} style={{ fontSize: wide ? 17 : 14, color: colors.text, margin: 0, textAlign: "center" }}>
            {card.direction === "en2jp" ? t("review.questionEn2jp") : t("review.questionJp2en")}
          </p>
          <div style={{ position: "relative" }}>
            {/* Room beside the card: the chip is centered in the space between the screen edge and the */}
            {/* card, vertically centered on the card. The column is centered, so that space is */}
            {/* 50vw - half the card's width (% here = the card's width). */}
            {sideChip && undo && (
              <div style={{ position: "absolute", right: "100%", width: "calc(50vw - 50%)", top: "50%", transform: "translateY(-50%)", display: "flex", justifyContent: "center" }}>
                <div style={{ maxWidth: 150 }}>
                  <PreviousCardChip undo={undo} onUndo={handleUndo} side />
                </div>
              </div>
            )}
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
          {handwritingCard ? (
            <>
              <HandwritingInput
                key={`hw-${turn}`}
                answer={writtenAnswer(card.en)}
                alternates={fittingAlternates(card.en, card.altAnswers)}
                result={typedResult?.handwriting ?? null}
                answered={Boolean(typedResult)}
                onResult={(read) => handleHandwritingResult(read, turn)}
                onDontKnow={handleDontKnow}
                onError={() => setHandwritingFailed(true)}
                answerSize={answerSize}
                wide={wide}
              />
              {typingPhase === "next" && (
                <TypingArea
                  key={turn} phase="next" typed="" spelling={typedResult.spelling} answer={card.back}
                  textbookAnswer={typedResult.alternate ? card.en : null}
                  alternateAnswer={typedResult.alternate}
                  onNext={handleNext} answerSize={answerSize} wide={wide}
                />
              )}
              {typingPhase === "choose" && (
                <AnswerArea revealed onReveal={() => {}} onAnswer={handleAnswer} answerSize={answerSize} wide={wide} />
              )}
            </>
          ) : typingPhase ? (
            <>
              {handwritingSession && handwritingFailed && (
                <p role="status" style={{ margin: 0, textAlign: "center", fontSize: wide ? 15 : 13, color: colors.gold }}>
                  {t("handwriting.unavailable")}
                </p>
              )}
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
                textbookAnswer={typedResult?.alternate ? card.en : null}
                alternateAnswer={typedResult?.alternate ?? null}
                wide={wide}
              />
            </>
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
          <div style={{ fontFamily: fontDisplay, fontSize: 22, color: colors.text }}>{t("review.allCleared")}</div>
          {undo && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <PreviousCardChip undo={undo} onUndo={handleUndo} />
            </div>
          )}
          {addDeckControl}
          <button style={btnGhost} onClick={onBack}>{t("review.backToDashboard")}</button>
        </div>
      )}
    </div>
  );
}
