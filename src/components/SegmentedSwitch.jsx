import { colors, fontBody } from '../styles/theme';

// A pill-shaped segmented switch, the same look as LevelSwitch (used by the teacher's class page:
// 一覧 / 名簿 and 7日間 / 30日間). options: [{ value, label }]; label: read aloud for the group.
export default function SegmentedSwitch({ options, value, onChange, label }) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "flex", gap: 4, padding: 4, borderRadius: 999,
        background: colors.surface, border: `2px solid ${colors.line}`,
      }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            style={{
              flex: 1, minWidth: 0, minHeight: 44, padding: "0 14px", borderRadius: 999, border: "none",
              background: selected ? colors.accent : "transparent", color: selected ? colors.accentInk : colors.muted,
              fontFamily: fontBody, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
