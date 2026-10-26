import { useEffect, useMemo, useRef, useState } from "react";
import LetterBoxes from "./LetterBoxes.jsx";
import { answerSlots, readText } from "./answerLayout.js";
import { bestMatch, lenientMessage } from "./checkAnswer.js";
import { isModelReady, modelReady, predictBatch, withTimeout } from "./model.js";
import { penLog } from "./penDebug.js";
import { preprocessLetter } from "./preprocess.js";
import PracticeSheet from "./PracticeSheet.jsx";
import { HW_COLORS, PRACTICE_ENABLED, RECOGNITION_TIMEOUT_MS } from "./config.js";
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
  const { probs } = await withTimeout(predictBatch(inputs.filter(Boolean)), RECOGNITION_TIMEOUT_MS);
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
// onReadingStart: こたえる was pressed (the card now counts as answered, so a mode switch waits for the
// next card). boxMax: the largest box size (smaller on short screens). short: tighter gaps.
// After a result, each red / orange box has a れんしゅう？ chip that opens letter practice for that
// box's letter (from the main answer, same case) in a pop-up; the review waits behind it.
// Give it a new `key` per card.
export default function HandwritingInput({ answer, alternates = [], result = null, answered = false, onResult, onDontKnow, onError, onReadingStart, answerSize, wide = false, practiceEnabled = PRACTICE_ENABLED, boxMax = 96, short = false }) {
  const slots = useMemo(() => answerSlots(answer), [answer]);
  const boxesRef = useRef(null);
  const [hasInk, setHasInk] = useState(false);
  const [reading, setReading] = useState(false);
  const [practiceLetter, setPracticeLetter] = useState(null);
  // The boxes take ink once the model has loaded and warmed up (StudySession starts loading it when
  // the review starts; a load that fails switches the review to typing there).
  const [ready, setReady] = useState(isModelReady);
  useEffect(() => {
    if (ready) return undefined;
    let alive = true;
    modelReady().then(() => alive && setReady(true), () => {});
    return () => { alive = false; };
  }, [ready]);
  const letterAt = (index) => slots.find((s) => s.type === "box" && s.index === index)?.letter;
  const fontSize = wide ? 18 : 16;

  async function handleAnswer() {
    if (reading || answered || !hasInk) return;
    setReading(true);
    onReadingStart?.();
    const start = performance.now();
    try {
      const read = await readAnswer(boxesRef.current, slots, alternates);
      penLog({ recognition: { ms: Math.round(performance.now() - start), result: `read "${read.text}" for "${answer}"${read.allCorrect ? " (correct)" : ""}` } });
      onResult(read);
    } catch (error) {
      // also a read that took too long: the review switches to typing, with a message
      console.warn("Handwriting could not be read:", error);
      penLog({ recognition: { ms: Math.round(performance.now() - start), error: String(error?.message ?? error) } });
      onError(error);
    } finally {
      setReading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: short ? 8 : 12 }}>
      {!answered && (
        <p style={{ margin: 0, textAlign: "center", fontSize: wide ? 15 : 13, color: colors.muted }}>
          {ready ? t("handwriting.hint") : t("handwriting.loading")}
        </p>
      )}
      <LetterBoxes
        ref={boxesRef}
        answer={answer}
        scores={result?.scores ?? []}
        locked={reading || Boolean(result)} // after わからない (answered, no result) the boxes stay open to practice in; nothing is read
        loading={!ready && !result}
        onChange={() => setHasInk(boxesRef.current?.hasInk() ?? false)}
        onPractice={practiceEnabled && result ? (index) => setPracticeLetter(letterAt(index)) : undefined}
        maxSize={boxMax}
      />
      {practiceLetter && <PracticeSheet letter={practiceLetter} onClose={() => setPracticeLetter(null)} />}

      {result && !result.allCorrect && (
        // short: the two lines side by side (they wrap onto two lines when there isn't room)
        <div style={{
          ...(short ? { display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 20, rowGap: 2 } : { display: "grid", gap: 4 }),
          textAlign: "center", fontSize: wide ? 17 : 15, color: colors.text,
        }}>
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
