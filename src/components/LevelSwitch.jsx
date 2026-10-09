import { colors, fontBody } from '../styles/theme';
import { schoolLabel } from '../lib/library';

// Segmented switch for the school level on the Textbooks screen: 中学 · JHS | 高校 · HS (| Other).
// options: ['JHS', 'HS', ...]; value: the selected one; onChange(level).
export default function LevelSwitch({ options, value, onChange }) {
  return (
    <div
      role="group"
      aria-label="School level"
      style={{
        display: "flex", gap: 4, padding: 4, borderRadius: 999,
        background: colors.surface, border: `2px solid ${colors.line}`,
      }}
    >
      {options.map((level) => {
        const selected = level === value;
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            aria-pressed={selected}
            style={{
              flex: 1, minWidth: 0, minHeight: 44, padding: "0 8px", borderRadius: 999, border: "none",
              background: selected ? colors.accent : "transparent", color: selected ? colors.accentInk : colors.muted,
              fontFamily: fontBody, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", cursor: "pointer",
            }}
          >
            {schoolLabel(level)}
          </button>
        );
      })}
    </div>
  );
}
