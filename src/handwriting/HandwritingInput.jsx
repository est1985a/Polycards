import { useMemo, useRef, useState } from "react";
import LetterBoxes from "./LetterBoxes.jsx";
import { answerSlots, readText } from "./answerLayout.js";
import { bestMatch, lenientMessage } from "./checkAnswer.js";
import { predictBatch } from "./model.js";
import { preprocessLetter } from "./preprocess.js";
import PracticeSheet from "./PracticeSheet.jsx";
import { HW_COLORS, PRACTICE_ENABLED } from "./config.js";
import { btnGhost, btnPrimary, colors } from "../styles/theme.js";
import { t, tx } from "../i18n";

// Reads the boxes: one batch through the model, then each box scored against its target letter,
// for the main answer and each alternate that fits the boxes (bestMatch).
// → scoreWord's result plus reads (the letter read in each box, null if empty), text (the whole
// answer as read, e.g. "f?sh") and accepted (the alternate that was accepted, or null).
async function readAnswer(boxes, slots, alternates) {
  const targets = slots.filter((s) => s.type === "box").map((s) => s.letter);
  const altTargets = alternates.map((alt) => answerSlots(alt).filter((s) => s.type === "box").map((s) => s.letter));
  const inputs = boxes.getBoxes().map((b) => (b ? preprocessLetter(b.gray, b.width, b.height) : null));
  const { probs } = await predictBatch(inputs.filter(Boolean));
  let k = 0;
  const boxProbs = inputs.map((x) => (x ? probs[k++] : null));
  const { accepted, ...result } = bestMatch(boxProbs, [targets, ...altTargets]);
  return { ...result, text: readText(slots, result.reads), accepted: accepted > 0 ? alternates[accepted - 1] : null };
}

// Handwriting answer for one card (Japanese → English, SRS review): one box per letter, written
// with the Apple Pencil only. Shown by StudySession instead of the typing box; after answering it
// stays on screen (locked) with the result, above the usual 次へ or まだ / わかった.
// answer: what to write (writtenAnswer(card.en)). result: what onResult reported, once read.
// alternates: other answers that fit the same boxes (fittingAlternates); a correct one is accepted too.
// answered: after こたえる or わからない. onError: the model couldn't run (fall back to typing).
// After a result, each red / orange box has a れんしゅう？ chip that opens letter practice for that
// box's letter (from the main answer, same case) in a pop-up; the review waits behind it.
// Give it a new `key` per card.
export default function HandwritingInput({ answer, alternates = [], result = null, answered = false, onResult, onDontKnow, onError, answerSize, wide = false, practiceEnabled = PRACTICE_ENABLED }) {
  const slots = useMemo(() => answerSlots(answer), [answer]);
  const boxesRef = useRef(null);
  const [hasInk, setHasInk] = useState(false);
  const [reading, setReading] = useState(false);
  const [practiceLetter, setPracticeLetter] = useState(null);
  const letterAt = (index) => slots.find((s) => s.type === "box" && s.index === index)?.letter;
  const fontSize = wide ? 18 : 16;

  async function handleAnswer() {
    if (reading || answered || !hasInk) return;
    setReading(true);
    try {
      onResult(await readAnswer(boxesRef.current, slots, alternates));
    } catch (error) {
      console.warn("Handwriting could not be read:", error);
      onError(error);
    } finally {
      setReading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!answered && (
        <p style={{ margin: 0, textAlign: "center", fontSize: wide ? 15 : 13, color: colors.muted }}>
          {t("handwriting.hint")}
        </p>
      )}
      <LetterBoxes
        ref={boxesRef}
        answer={answer}
        scores={result?.scores ?? []}
        locked={reading || Boolean(result)} // after わからない (answered, no result) the boxes stay open to practice in; nothing is read
        onChange={() => setHasInk(boxesRef.current?.hasInk() ?? false)}
        onPractice={practiceEnabled && result ? (index) => setPracticeLetter(letterAt(index)) : undefined}
      />
      {practiceLetter && <PracticeSheet letter={practiceLetter} onClose={() => setPracticeLetter(null)} />}

      {result && !result.allCorrect && (
        <div style={{ display: "grid", gap: 4, textAlign: "center", fontSize: wide ? 17 : 15, color: colors.text }}>
          <div>
            {tx("handwriting.read", { answer: (
              <span lang="en" style={{ fontWeight: 700 }}>
                {slots.map((s, i) => {
                  if (s.type === "gap") return <span key={i}> </span>;
                  if (s.type === "print") return <span key={i}>{s.text}</span>;
                  const score = result.scores[s.index];
                  const color = score === "wrong" ? colors.danger : score === "lenient" ? HW_COLORS.lenient : colors.text;
                  return <span key={i} style={{ color }}>{result.reads[s.index] ?? "?"}</span>;
                })}
              </span>
            ) })}
          </div>
          <div>{tx("review.rightAnswer", { answer: <span lang="en" style={{ fontWeight: 700, color: colors.accentText }}>{answer}</span> })}</div>
        </div>
      )}

      {result?.hasLenient && (
        <div role="status" style={{ display: "grid", gap: 2, textAlign: "center", fontSize: wide ? 16 : 14, fontWeight: 700, color: HW_COLORS.lenient }}>
          {result.lenientPairs.map((p) => <div key={p.target + p.read}>{lenientMessage(p)}</div>)}
        </div>
      )}

      {!answered && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button" disabled={reading} onClick={onDontKnow}
            style={{ ...btnGhost, flex: 1, fontSize, ...answerSize, opacity: reading ? 0.5 : 1 }}
          >
            {t("review.dontKnow")}
          </button>
          <button
            type="button" disabled={reading || !hasInk} onClick={handleAnswer}
            style={{ ...btnPrimary, flex: 2, fontSize, ...answerSize, opacity: reading || !hasInk ? 0.5 : 1 }}
          >
            {reading ? t("handwriting.reading") : t("handwriting.submit")}
          </button>
        </div>
      )}
    </div>
  );
}
