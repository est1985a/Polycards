import { colors, fontDisplay, tabBarHeight } from '../styles/theme';

// Small icons drawn with the current text color (currentColor).
const ICONS = {
  // two stacked cards
  myCards: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="3" width="13" height="16" rx="2" fill="currentColor" opacity="0.45" />
      <rect x="4" y="6" width="13" height="16" rx="2" fill="currentColor" />
    </svg>
  ),
  // a 2×2 grid of sets
  cardSets: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" />
    </svg>
  ),
};

// Bottom tab bar, fixed to the bottom of the screen.
// tabs: [{ id: 'myCards', label: 'My Cards' }, ...]
// The active tab's icon and top line use accent (a fill); its label stays in text color,
// because accent is not readable as text in every theme.
export default function Tabs({ tabs, active, onChange }) {
  return (
    <nav
      style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, boxSizing: "border-box",
        background: colors.surface, borderTop: `2px solid ${colors.line}`,
        paddingBottom: "env(safe-area-inset-bottom)",
        display: "flex", zIndex: 10,
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1, height: tabBarHeight, background: "transparent",
              borderWidth: "3px 0 0", borderStyle: "solid", borderColor: isActive ? colors.accent : "transparent",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              cursor: "pointer", padding: 0,
            }}
          >
            <span style={{ color: isActive ? colors.accent : colors.muted, display: "flex" }}>{ICONS[t.id]}</span>
            <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 14, color: isActive ? colors.text : colors.muted }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
