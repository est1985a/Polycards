import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import LetterPractice from "./LetterPractice.jsx";
import { shouldCloseSheet } from "../lib/sheet.js";
import { colors } from "../styles/theme.js";

// Letter practice as a pop-up over the review (same backdrop and sheet as the review plan, a wider
// box). The review behind it stays exactly as it was. Closes with とじる, ×, Escape or a tap on the
// backdrop; focus goes to × and back to where it was (the れんしゅう？ chip) on close.
export default function PracticeSheet({ letter, onClose }) {
  const closeRef = useRef(null);
  const latestClose = useRef(onClose);
  useEffect(() => { latestClose.current = onClose; });

  useEffect(() => {
    const before = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (shouldCloseSheet(e)) latestClose.current(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="review-plan-backdrop"
      onClick={(e) => { if (shouldCloseSheet(e)) onClose(); }}
      style={{ background: `color-mix(in srgb, ${colors.bg} 75%, transparent)` }}
    >
      <div
        className="review-plan-sheet practice-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-title"
        style={{ background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, textAlign: "left" }}
      >
        <LetterPractice letter={letter} onClose={onClose} closeRef={closeRef} />
      </div>
    </div>,
    document.body,
  );
}
