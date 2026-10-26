import { useRef, useState } from 'react';
import { colors } from '../styles/theme';
import { returnFocusTarget } from '../lib/partsOfSpeech';
import PosSheet from './PosSheet';
import { t } from '../i18n';

// The 44 px tap area around the small pill. Negative margins, so it never makes a row taller.
const tapArea = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxSizing: "border-box",
  minWidth: 44, minHeight: 44, padding: "0 4px", margin: "-11px -4px", lineHeight: 1,
  background: "transparent", border: "none", borderRadius: 999,
};

function Pill({ pos, fontSize }) {
  return (
    <span
      style={{
        fontSize, fontWeight: 700, lineHeight: 1.4, whiteSpace: "nowrap", padding: "1px 9px", borderRadius: 999,
        color: colors.muted, background: colors.surface2, border: `1px solid ${colors.line}`,
      }}
    >
      {t(`pos.label.${pos}`)}
    </span>
  );
}

// The 品詞 chip (名詞, 動詞 …) for a word's part of speech; nothing when pos is null.
// Tapping it opens PosSheet. The tap never reaches what is underneath (it can't flip a card,
// answer it or undo), and closing puts focus back where it was: on the typing box if the student
// was typing (so the iPad keyboard comes back), otherwise on the chip.
// placeholder: an invisible copy of the same size (FlipCard's front, see there).
export default function PosChip({ pos, fontSize = 12, placeholder = false }) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef(null);
  const pressedFocus = useRef(null); // what had focus when the chip was pressed
  const openedFrom = useRef(null);
  if (!pos) return null;

  if (placeholder) {
    return <span aria-hidden="true" style={{ ...tapArea, visibility: "hidden" }}><Pill pos={pos} fontSize={fontSize} /></span>;
  }

  function close() {
    returnFocusTarget(chipRef.current, openedFrom.current)?.focus?.({ preventScroll: true });
    openedFrom.current = null;
    setOpen(false);
  }

  return (
    <>
      <button
        ref={chipRef}
        type="button"
        aria-label={t("pos.chipAria", { label: t(`pos.label.${pos}`) })}
        aria-haspopup="dialog"
        onPointerDown={(e) => { e.stopPropagation(); pressedFocus.current = document.activeElement; }}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          // A keyboard press has no pointerdown: then focus is on the chip itself.
          openedFrom.current = pressedFocus.current ?? document.activeElement;
          pressedFocus.current = null;
          setOpen(true);
        }}
        style={{ ...tapArea, cursor: "pointer" }}
      >
        <Pill pos={pos} fontSize={fontSize} />
      </button>
      {open && <PosSheet highlight={pos} onClose={close} />}
    </>
  );
}
