// Shared colors, fonts, and button styles.
// Colors are CSS variables filled in by applyTheme() in src/themes.js, so a theme switch
// recolors every screen. Use these role names; never write hex codes in components.

const v = (name) => `var(--${name})`;

export const colors = {
  bg: v("bg"),               // page background
  surface: v("surface"),     // cards
  surface2: v("surface2"),   // raised elements on a card
  line: v("line"),           // borders
  text: v("text"),
  muted: v("muted"),         // labels, hints, links
  accent: v("accent"),       // fills only, never text
  accentInk: v("accentInk"),
  danger: v("danger"),
  dangerInk: v("dangerInk"),
  gold: v("gold"),           // points, levels, big numbers
  level: (n) => v(`lv${n}`), // Lv0 to Lv7 chart colors
};

// Fonts are loaded from Google Fonts in index.html.
// Chakra Petch has no Japanese letters, so Japanese in headings falls back to Zen Maru Gothic.
export const fontDisplay = "'Chakra Petch', 'Zen Maru Gothic', sans-serif"; // headings, numbers
export const fontBody = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'Yu Gothic', sans-serif"; // body, Japanese

export const gutter = 16; // side padding of the page column
export const tabBarHeight = 72; // bottom tab bar (the page needs this much extra bottom padding)

// The page column: 480 px wide on desktop, full width on phones.
export const wrap = {
  maxWidth: 480, width: "100%", margin: "0 auto", minHeight: 500, boxSizing: "border-box",
  fontFamily: fontBody, color: colors.text,
};

// Dashboard panels (player card, level chart).
export const panel = { background: colors.surface, border: `2px solid ${colors.line}`, borderRadius: 20, padding: 16 };

export const cardStyle = { background: colors.surface, border: `1px solid ${colors.line}`, borderRadius: 10 };

const btn = { borderRadius: 8, padding: "12px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
export const btnPrimary = { ...btn, background: colors.accent, color: colors.accentInk, border: "none" };
export const btnDanger = { ...btn, background: colors.danger, color: colors.dangerInk, border: "none" };
export const btnGhost = { ...btn, background: "transparent", color: colors.text, border: `1px solid ${colors.line}` };
export const btnLink = { background: "none", border: "none", color: colors.muted, fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 };
