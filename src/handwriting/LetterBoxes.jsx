import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import LetterBox from "./LetterBox.jsx";
import { answerSlots, boxLayout } from "./answerLayout.js";
import { btnGhost, colors, fontDisplay } from "../styles/theme.js";

const SPACING = 6;
const BOX_BORDER = 3; // LetterBox's border; the layout size includes it

// The row (or two rows) of letter boxes for one answer, with printed characters between them,
// plus 消す (clear the tapped / last-written box) and 戻す (undo the last stroke).
// Shared by the /hw-test page and (Phase 2) HandwritingInput.
// scores: per box index, "correct" | "lenient" | "wrong" | null (colors the boxes after checking)
// ref → { getBoxes(): [{ gray, width, height } | null] (null = empty box), clearAll() }
export default function LetterBoxes({ ref, answer, scores = [], allowAnyPointer = false, onChange }) {
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

  useImperativeHandle(ref, () => ({
    getBoxes() {
      return Array.from({ length: boxCount }, (_, i) => {
        const box = boxRefs.current[i];
        return box && !box.isEmpty() ? box.getGray() : null;
      });
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
      <div ref={containerRef} style={{ display: "grid", gap: 10, justifyItems: "center", minWidth: 0 }}>
        {width > 0 && rows.map((row, r) => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: SPACING }}>
            {row.map((slot, i) => {
              if (slot.type === "box") {
                return (
                  <LetterBox
                    key={`b${slot.index}`}
                    ref={(el) => { boxRefs.current[slot.index] = el; }}
                    size={size - 2 * BOX_BORDER}
                    state={scores[slot.index] ?? null}
                    selected={selected === slot.index}
                    allowAnyPointer={allowAnyPointer}
                    label={`${slot.index + 1}文字目`}
                    onStroke={() => handleStroke(slot.index)}
                    onSelect={() => setSelected(slot.index)}
                  />
                );
              }
              if (slot.type === "gap") return <div key={`g${r}-${i}`} style={{ width: size * 0.45 - SPACING, flex: "none" }} />;
              return (
                <span key={`p${r}-${i}`} aria-hidden="true" style={{
                  flex: "none", fontFamily: fontDisplay, fontSize: Math.round(size * 0.55), fontWeight: 700,
                  color: colors.text, alignSelf: "flex-end", lineHeight: 1, paddingBottom: size * 0.1,
                }}>
                  {slot.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <button type="button" onClick={handleClear} disabled={selected === null || !hasInk} style={{ ...btnGhost, minHeight: 44, minWidth: 88 }}>
          消す
        </button>
        <button type="button" onClick={handleUndo} disabled={!hasInk} style={{ ...btnGhost, minHeight: 44, minWidth: 88 }}>
          戻す
        </button>
      </div>
    </div>
  );
}
