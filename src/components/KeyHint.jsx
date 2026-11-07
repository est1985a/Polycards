import { colors, fontDisplay } from '../styles/theme';

// A small keycap (↵, ←, →, ⌫) in a corner of a review button, telling keyboard users which key does the
// same thing (src/lib/reviewKeys.js). Absolutely placed, so the button never changes size; the button
// needs position: relative. aria-hidden: the button's aria-keyshortcuts says it for screen readers.
// outside: hangs over the button's top-right corner (small buttons such as 元に戻す), else sits inside it.
export default function KeyHint({ glyph, outside = false }) {
  return (
    <span
      aria-hidden="true"
      data-key-hint=""
      style={{
        position: "absolute", ...(outside ? { top: -8, right: -8 } : { top: 6, right: 8 }),
        minWidth: 20, height: 20, padding: "0 4px", boxSizing: "border-box", borderRadius: 6,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: fontDisplay, fontSize: 12, fontWeight: 700, lineHeight: 1,
        color: colors.muted, background: colors.surface2, border: `1px solid ${colors.line}`,
        boxShadow: `0 1px 0 ${colors.line}`, pointerEvents: "none",
      }}
    >
      {glyph}
    </span>
  );
}
