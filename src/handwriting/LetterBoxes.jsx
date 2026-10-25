import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import LetterBox from "./LetterBox.jsx";
import { answerSlots, boxLayout, printPosition, slotFactor } from "./answerLayout.js";
import { needsPractice } from "./checkAnswer.js";
import { btnGhost, colors, fontDisplay } from "../styles/theme.js";
import { t } from "../i18n";

const SPACING = 6;
const BOX_BORDER = 3; // LetterBox's border; the layout size includes it

// れんしゅう？ under a red / orange box: small to look at, 44 px tall to tap.
function PracticeChip({ size, letter, onClick }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={t("practice.chipAria", { letter })}
      style={{
        minHeight: 44, padding: 0, margin: 0, border: "none", background: "transparent", cursor: "pointer",
        display: "grid", placeItems: "center", maxWidth: size + SPACING,
      }}
    >
      <span style={{
        padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap", fontWeight: 700, fontSize: size < 72 ? 10 : 12,
        background: colors.surface2, color: colors.text, border: `1px solid ${colors.line}`,
      }}>
        {t("practice.chip")}
      </span>
    </button>
  );
}

// The row (or two rows) of letter boxes for one answer, with printed characters between them,
// plus 消す (clear the tapped / last-written box) and 戻す (undo the last stroke).
// Shared by the /hw-test page and (Phase 2) HandwritingInput.
// scores: per box index, "correct" | "lenient" | "wrong" | null (colors the boxes after checking)
// locked: answered: the ink stays, nothing draws, and 消す / 戻す are hidden.
// onPractice(index): when given, a locked red or orange box gets a れんしゅう？ chip under it.
// ref → { getBoxes(): [{ gray, width, height } | null] (null = empty box), hasInk(), clearAll() }
export default function LetterBoxes({ ref, answer, scores = [], allowAnyPointer = false, locked = false, onChange, onPractice }) {
  const slots = useMemo(() => answerSlots(answer), [answer]);
  const boxCount = slots.filter((s) => s.type === "box").length;
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const boxRefs = useRef([]);
  const history = useRef([]); // box index of every stroke, in order (for 戻す)
  const [selected, setSelected] = useState(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { rows, size } = boxLayout(slots, width, { spacing: SPACING });
  const practiceAt = (index) => Boolean(onPractice) && locked && needsPractice(scores[index]);
  const anyChip = slots.some((s) => s.type === "box" && practiceAt(s.index));

  useImperativeHandle(ref, () => ({
    getBoxes() {
      return Array.from({ length: boxCount }, (_, i) => {
        const box = boxRefs.current[i];
        return box && !box.isEmpty() ? box.getGray() : null;
      });
    },
    hasInk() {
      return history.current.length > 0;
    },
    clearAll() {
      boxRefs.current.forEach((b) => b?.clear());
      history.current = [];
      setSelected(null);
      setHasInk(false);
    },
  }));

  function changed() {
    setHasInk(history.current.length > 0);
    onChange?.();
  }

  function handleStroke(index) {
    history.current.push(index);
    setSelected(index);
    changed();
  }

  function handleUndo() {
    const index = history.current.pop();
    if (index === undefined) return;
    boxRefs.current[index]?.undo();
    setSelected(index);
    changed();
  }

  function handleClear() {
    if (selected === null) return;
    boxRefs.current[selected]?.clear();
    history.current = history.current.filter((i) => i !== selected);
    changed();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div ref={containerRef} style={{
        display: "grid", gap: 10, justifyItems: "center", minWidth: 0,
        userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
      }}>
        {width > 0 && rows.map((row, r) => (
          <div key={r} style={{ display: "flex", alignItems: anyChip ? "flex-start" : "center", gap: SPACING }}>
            {row.map((slot, i) => {
              if (slot.type === "box") {
                const box = (
                  <LetterBox
                    ref={(el) => { boxRefs.current[slot.index] = el; }}
                    size={size - 2 * BOX_BORDER}
                    state={scores[slot.index] ?? null}
                    selected={!locked && selected === slot.index}
                    allowAnyPointer={allowAnyPointer}
                    locked={locked}
                    label={t("handwriting.boxLabel", { n: slot.index + 1 })}
                    onStroke={() => handleStroke(slot.index)}
                    onSelect={() => setSelected(slot.index)}
                  />
                );
                // Each box is a column (box, then its chip after answering). Always the same wrapper, so
                // the box (and its ink) isn't rebuilt when the chips appear; the row is then top-aligned.
                return (
                  <div key={`b${slot.index}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none", width: size }}>
                    {box}
                    {practiceAt(slot.index) && (
                      <PracticeChip size={size} letter={slot.letter} onClick={() => onPractice(slot.index)} />
                    )}
                  </div>
                );
              }
              if (slot.type === "gap") return <div key={`g${r}-${i}`} style={{ width: size * 0.45 - SPACING, flex: "none" }} />;
              // A column as tall as a box, with the character at the top, middle or baseline.
              const position = printPosition(slot.text);
              const narrow = position === "top";
              return (
                <span key={`p${r}-${i}`} aria-hidden="true" style={{
                  flex: "none", height: size, display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: position === "top" ? "flex-start" : position === "middle" ? "center" : "flex-end",
                  paddingTop: position === "top" ? size * 0.08 : 0, paddingBottom: position === "baseline" ? size * 0.1 : 0,
                  boxSizing: "border-box", width: narrow ? Math.max(8, size * slotFactor(slot)) : "auto",
                  // pull the boxes on either side closer, so the apostrophe in "don't" keeps the word together
                  marginInline: narrow ? -SPACING / 2 : 0,
                  fontFamily: fontDisplay, fontSize: Math.round(size * 0.55), fontWeight: 700, lineHeight: 1, color: colors.text,
                }}>
                  {slot.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {!locked && <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <button type="button" onClick={handleClear} disabled={selected === null || !hasInk} style={{ ...btnGhost, minHeight: 44, minWidth: 88 }}>
          {t("handwriting.clear")}
        </button>
        <button type="button" onClick={handleUndo} disabled={!hasInk} style={{ ...btnGhost, minHeight: 44, minWidth: 88 }}>
          {t("handwriting.undo")}
        </button>
      </div>}
    </div>
  );
}
