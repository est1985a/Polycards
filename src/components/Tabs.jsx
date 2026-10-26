import { colors, fontDisplay, tabBarHeight } from '../styles/theme';
import { t } from '../i18n';
import { PACK_BODY, PACK_STRIP } from '../lib/packShape';

// A small foil pack in currentColor (the PackIcon outline, scaled down): a crimped strip on top,
// a low-poly facet on the body. Outlined in the tab bar's surface color so stacked packs stay apart.
function MiniPack({ x, y, rotate, opacity = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(0.1) translate(-60 -80)`} opacity={opacity}>
      <polygon points={PACK_BODY} fill="currentColor" stroke={colors.surface} strokeWidth="14" paintOrder="stroke" />
      <polygon points="4,22 116,22 60,64" fill={colors.surface} opacity="0.35" />
      <polygon points="60,64 116,104 60,150" fill={colors.surface} opacity="0.2" />
      <polygon points={PACK_STRIP} fill="currentColor" stroke={colors.surface} strokeWidth="14" paintOrder="stroke" />
    </g>
  );
}

// One card of the My Deck stack, outlined in the tab bar's surface color.
function StackCard({ x, y, opacity }) {
  return <rect x={x} y={y} width="13" height="17" rx="2" fill="currentColor" stroke={colors.surface} strokeWidth="1.2" opacity={opacity} />;
}

// Small icons drawn with the current text color (currentColor).
const ICONS = {
  // a big stack of cards, the top one with a low-poly facet (My Deck)
  myCards: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <StackCard x={9.5} y={1} opacity={0.3} />
      <StackCard x={7.5} y={2.5} opacity={0.5} />
      <StackCard x={5.5} y={4} opacity={0.75} />
      <StackCard x={3.5} y={5.5} opacity={1} />
      <polygon points="4.5,6.5 15.5,6.5 10,13" fill={colors.surface} opacity="0.3" />
      <polygon points="4.5,21.5 10,13 15.5,21.5" fill={colors.surface} opacity="0.15" />
    </svg>
  ),
  // a small pile of foil packs (Word Packs)
  cardSets: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{ overflow: "visible" }}>
      <MiniPack x={7} y={12} rotate={-16} opacity={0.5} />
      <MiniPack x={17} y={12} rotate={16} opacity={0.5} />
      <MiniPack x={12} y={13} rotate={0} />
    </svg>
  ),
  // a pencil (トレーニング)
  training: (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="currentColor" />
      <path d="M4 20l4.6-1.2-3.4-3.4z" fill="currentColor" opacity="0.45" />
    </svg>
  ),
};

// Bottom tab bar, fixed to the bottom of the screen.
// tabs: [{ id: 'myCards', label: 'tabs.myCards' }, ...] (label: an i18n key)
// The active tab's icon and top line use accent (a fill); its label stays in text color,
// because accent is not readable as text in every theme.
// wide: the bar spans the whole screen and the tabs stay centered (240 px each).
export default function Tabs({ tabs, active, onChange, wide = false }) {
  return (
    <nav
      style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: wide ? "none" : 480, boxSizing: "border-box",
        background: colors.surface, borderTop: `2px solid ${colors.line}`,
        paddingBottom: "env(safe-area-inset-bottom)",
        display: "flex", justifyContent: "center", zIndex: 10,
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: wide ? "0 1 240px" : 1, height: tabBarHeight, background: "transparent",
              borderWidth: "3px 0 0", borderStyle: "solid", borderColor: isActive ? colors.accent : "transparent",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              cursor: "pointer", padding: 0,
            }}
          >
            <span style={{ color: isActive ? colors.accent : colors.muted, display: "flex" }}>{ICONS[tab.id]}</span>
            <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 14, color: isActive ? colors.text : colors.muted }}>
              {t(tab.label)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
