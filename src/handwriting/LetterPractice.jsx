import { useEffect, useRef, useState } from "react";
import LetterBox from "./LetterBox.jsx";
import FourLines from "./FourLines.jsx";
import StrokeGuide from "./StrokeGuide.jsx";
import { loadModel, predictBatch } from "./model.js";
import { preprocessLetter } from "./preprocess.js";
import { PRACTICE_BOXES, PRACTICE_BOX_GAP, lineMetrics, practiceBoxWidth } from "./letterGuides.js";
import { practiceResult, strokesToUnits } from "./practiceCheck.js";
import { HW_COLORS, PRACTICE_CHECK_DELAY_MS, PRACTICE_MODEL_INK } from "./config.js";
import { btnGhost, btnPrimary, colors, fontBody, fontDisplay } from "../styles/theme.js";
import { t } from "../i18n";

const BOXES = PRACTICE_BOXES;
const GAP = PRACTICE_BOX_GAP;
const RATIO = 1.45; // box height / width (about 90 × 130 on the iPad)

// The hint under the boxes: what to fix, then how to start again.
function hintText(hint) {
  if (!hint) return null;
  return t(`practice.hint.${hint.key}`, { letter: hint.letter });
}

// B ⇄ b
function CaseSwitch({ letter, onChange }) {
  const upper = letter.toUpperCase(), lower = letter.toLowerCase();
  return (
    <div role="group" aria-label={t("practice.caseSwitch")} style={{
      display: "flex", gap: 4, padding: 4, borderRadius: 999, background: colors.surface, border: `2px solid ${colors.line}`,
    }}>
      {[upper, lower].map((l) => {
        const selected = l === letter;
        return (
          <button
            key={l} type="button" lang="en" aria-pressed={selected} onClick={() => { if (!selected) onChange(l); }}
            style={{
              minWidth: 52, minHeight: 44, padding: "0 12px", borderRadius: 999, border: "none", cursor: "pointer",
              background: selected ? colors.accent : "transparent", color: selected ? colors.accentInk : colors.muted,
              fontFamily: fontDisplay, fontWeight: 700, fontSize: 20,
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

// できた！ with もう一回 and とじる, plus 次の文字へ when onNext is given (full page, not at Z / z).
export function DonePanel({ onAgain, onClose, onNext }) {
  const size = { minHeight: 48, minWidth: 120, fontSize: 15 };
  return (
    <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
      <div className="practice-done" style={{ fontFamily: fontDisplay, fontSize: 32, fontWeight: 700, color: HW_COLORS.pass }}>
        {t("practice.done")}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {onNext && (
          <button type="button" onClick={onNext} style={{ ...btnPrimary, ...size }}>
            {t("practice.nextLetter")}
          </button>
        )}
        <button type="button" onClick={onAgain} style={{ ...(onNext ? btnGhost : btnPrimary), ...size }}>
          {t("practice.again")}
        </button>
        <button type="button" onClick={onClose} style={{ ...btnGhost, ...size }}>
          {t("practice.close")}
        </button>
      </div>
    </div>
  );
}

// Letter practice for one letter: the stroke-order guide, then 4 boxes on the four lines (the first
// one with the letter to trace). Each box is checked a moment after the pen lifts (shape by the
// model, height by the four lines): green when right, red with a hint when not. A red box keeps its
// ink (new strokes add to it and check again); 消す clears the last written box. All 4 green → できた！
// Practice saves nothing (no SRS, points, bonus, tickets or answer log).
// Used as a pop-up from a review (PracticeSheet) and later as a full page.
// onClose: とじる (and × when closeRef is given, in the pop-up). onComplete(letter): all 4 boxes green.
// Full page (Training tab): onLetterChange(letter) is called by the B ⇄ b switch, and onNext (when given;
// not at Z / z) adds 次の文字へ to the できた！ panel.
export default function LetterPractice({ letter: startLetter, onClose, onComplete, onLetterChange, onNext, closeRef = null, allowAnyPointer = false, titleId = "practice-title" }) {
  const [letter, setLetter] = useState(startLetter);
  const [round, setRound] = useState(0); // a new set of empty boxes
  const [states, setStates] = useState(() => Array(BOXES).fill(null)); // null | "checking" | "pass" | "wrong"
  const [hint, setHint] = useState(null);
  const [inkCount, setInkCount] = useState(0); // boxes with ink that aren't green (for 消す)
  const [model, setModel] = useState("loading"); // loading | ready | error
  const [width, setWidth] = useState(0);
  const boxesRef = useRef(null);
  const boxRefs = useRef([]);
  const timers = useRef([]);
  const versions = useRef(Array(BOXES).fill(0));
  const history = useRef([]); // box index of each stroke, in order
  const statesRef = useRef(states);
  const completed = useRef(false);

  useEffect(() => {
    let alive = true;
    loadModel().then(() => alive && setModel("ready"), () => alive && setModel("error"));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = boxesRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const boxW = practiceBoxWidth(width);
  const boxH = Math.round(boxW * RATIO);
  const allPass = states.every((s) => s === "pass");

  useEffect(() => {
    if (allPass && !completed.current) {
      completed.current = true;
      onComplete?.(letter);
    }
  }, [allPass, letter, onComplete]);

  // The box states, kept in a ref too so the pen and timer callbacks read the latest ones.
  function setState(i, value) {
    statesRef.current = statesRef.current.map((s, j) => (j === i ? value : s));
    setStates(statesRef.current);
  }

  function countInk() {
    setInkCount(new Set(history.current.filter((i) => statesRef.current[i] !== "pass")).size);
  }

  function reset(nextLetter = letter) {
    timers.current.forEach(clearTimeout);
    versions.current = versions.current.map((v) => v + 1);
    history.current = [];
    completed.current = false;
    setLetter(nextLetter);
    setRound((r) => r + 1);
    statesRef.current = Array(BOXES).fill(null);
    setStates(statesRef.current);
    setHint(null);
    setInkCount(0);
  }

  function handlePenDown(i) {
    clearTimeout(timers.current[i]);
    versions.current[i] += 1;
    if (statesRef.current[i] !== null) setState(i, null); // back to plain while writing
  }

  function handleStroke(i) {
    history.current.push(i);
    countInk();
    clearTimeout(timers.current[i]);
    const version = versions.current[i];
    timers.current[i] = setTimeout(() => check(i, version), PRACTICE_CHECK_DELAY_MS);
  }

  async function check(i, version) {
    const box = boxRefs.current[i];
    if (!box || box.isEmpty()) return;
    setState(i, "checking");
    try {
      const { gray, width: w, height: h } = box.getGray({ inkRatio: PRACTICE_MODEL_INK });
      const input = preprocessLetter(gray, w, h);
      const { probs } = await predictBatch(input ? [input] : []);
      if (versions.current[i] !== version) return; // written in again meanwhile
      const strokes = strokesToUnits(box.getStrokes(), lineMetrics(boxH));
      const result = practiceResult({ target: letter, probs: input ? probs[0] : null, strokes });
      setState(i, result.pass ? "pass" : "wrong");
      setHint(result.pass ? null : result.hint);
      if (result.pass) countInk();
    } catch (error) {
      console.warn("Practice box could not be checked:", error);
      if (versions.current[i] === version) setState(i, null);
      setModel("error");
    }
  }

  // 消す: clears the last written box that isn't green yet.
  function handleClear() {
    const i = [...history.current].reverse().find((j) => statesRef.current[j] !== "pass");
    if (i === undefined) return;
    clearTimeout(timers.current[i]);
    versions.current[i] += 1;
    boxRefs.current[i]?.clear();
    history.current = history.current.filter((j) => j !== i);
    setState(i, null);
    setHint(null);
    countInk();
  }

  const fontSize = 15;

  return (
    <div style={{ display: "grid", gap: 14, fontFamily: fontBody, color: colors.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 id={titleId} style={{ margin: 0, flex: "1 1 auto", fontSize: 20, fontWeight: 700 }}>
          {t("practice.title", { letter })}
        </h2>
        <CaseSwitch letter={letter} onChange={(l) => { reset(l); onLetterChange?.(l); }} />
        {closeRef && (
          <button
            ref={closeRef} type="button" onClick={onClose} aria-label={t("common.close")}
            style={{ width: 44, height: 44, marginRight: -10, background: "transparent", border: "none", color: colors.muted, fontSize: 26, lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", justifyContent: "center" }}>
        <StrokeGuide key={letter} letter={letter} width={136} height={196} />

        <div style={{ flex: "1 1 340px", minWidth: 0, display: "grid", gap: 12 }}>
          <div
            ref={boxesRef}
            style={{ display: "flex", gap: GAP, justifyContent: "center", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          >
            {Array.from({ length: BOXES }, (_, i) => (
              <LetterBox
                key={`${round}-${letter}-${i}`}
                ref={(el) => { boxRefs.current[i] = el; }}
                size={boxW}
                height={boxH}
                inkWidth={Math.max(3, lineMetrics(boxH).gap * 0.14)}
                overlay={<FourLines width={boxW} height={boxH} trace={i === 0 ? letter : null} />}
                state={states[i] === "pass" || states[i] === "wrong" ? states[i] : null}
                allowAnyPointer={allowAnyPointer}
                locked={states[i] === "pass" || model === "error" || allPass}
                label={t("practice.boxLabel", { n: i + 1 })}
                onPenDown={() => handlePenDown(i)}
                onStroke={() => handleStroke(i)}
              />
            ))}
          </div>

          <div role="status" style={{ minHeight: 44, display: "grid", gap: 2, textAlign: "center", fontSize, fontWeight: 700 }}>
            {model === "loading" && <span style={{ color: colors.muted, fontWeight: 400 }}>{t("practice.loading")}</span>}
            {model === "error" && <span style={{ color: colors.danger }}>{t("practice.unavailable")}</span>}
            {model !== "error" && hint && (
              <>
                <span style={{ color: colors.danger }}>{hintText(hint)}</span>
                <span style={{ color: colors.muted, fontWeight: 400, fontSize: 13 }}>{t("practice.hint.erase")}</span>
              </>
            )}
          </div>

          {allPass ? (
            <DonePanel onAgain={() => reset()} onClose={onClose} onNext={onNext} />
          ) : (
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button type="button" onClick={handleClear} disabled={inkCount === 0} style={{ ...btnGhost, minHeight: 48, minWidth: 100, fontSize, opacity: inkCount === 0 ? 0.5 : 1 }}>
                {t("practice.clear")}
              </button>
              <button type="button" onClick={onClose} style={{ ...btnGhost, minHeight: 48, minWidth: 100, fontSize }}>
                {t("practice.close")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
