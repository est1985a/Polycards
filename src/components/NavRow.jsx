import { colors } from '../styles/theme';

// One tappable row in the Card Sets lists (textbooks, units, decks).
// Same look as the deck rows in マイデッキ: small subtitle, bold title, a pill on the right, then ›.
export default function NavRow({ title, subtitle, pill, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", minHeight: 44, boxSizing: "border-box",
        display: "flex", alignItems: "center", gap: 12, padding: "14px 12px 14px 16px",
        background: colors.surface, border: `2px solid ${colors.line}`, borderRadius: 16,
        textAlign: "left", color: colors.text, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1,
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
        {subtitle && <span style={{ display: "block", fontSize: 12, color: colors.muted }}>{subtitle}</span>}
        <span style={{ display: "block", fontSize: 17, fontWeight: 700 }}>{title}</span>
      </span>
      {pill != null && (
        <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: colors.surface2, whiteSpace: "nowrap" }}>
          {pill}
        </span>
      )}
      <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 22, lineHeight: 1, color: colors.muted }}>›</span>
    </button>
  );
}
