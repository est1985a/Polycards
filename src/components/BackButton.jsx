import { colors, fontDisplay } from '../styles/theme';

// The ‹ back button used on every screen that goes back up a level (Card Sets lists, ABCを書こう,
// settings, stats, the ポリアバター図鑑, the word list, Mastered and the review).
// A pill with a chevron, left-aligned, 44 px tall. Hover / press / focus looks: .back-button in
// src/index.css. label: the text (already translated). The chevron is drawn, not a "←" character.
export default function BackButton({ label, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      className="back-button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        alignSelf: "start", justifySelf: "start", flexShrink: 0, minHeight: 44, maxWidth: "100%",
        display: "inline-flex", alignItems: "center", gap: 6, padding: "0 16px 0 10px", borderRadius: 999,
        background: colors.surface2, border: `2px solid ${colors.line}`, color: colors.text,
        fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, cursor: "pointer",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}
