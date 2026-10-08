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

export const serif = "Georgia, 'Hiragino Mincho ProN', 'Yu Mincho', serif";

export const wrap = {
  maxWidth: 480, margin: "0 auto", padding: "24px 20px 60px", minHeight: 500,
  fontFamily: "'Hiragino Maru Gothic ProN', 'Yu Gothic', 'Segoe UI', system-ui, sans-serif", color: colors.text,
};

export const cardStyle = { background: colors.surface, border: `1px solid ${colors.line}`, borderRadius: 10 };

const btn = { borderRadius: 8, padding: "12px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
export const btnPrimary = { ...btn, background: colors.accent, color: colors.accentInk, border: "none" };
export const btnDanger = { ...btn, background: colors.danger, color: colors.dangerInk, border: "none" };
export const btnGhost = { ...btn, background: "transparent", color: colors.text, border: `1px solid ${colors.line}` };
export const btnLink = { background: "none", border: "none", color: colors.muted, fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 };

export const tabActive = { padding: "10px 16px", borderBottom: `3px solid ${colors.accent}`, fontWeight: "bold", cursor: "pointer", color: colors.text };
export const tabInactive = { padding: "10px 16px", borderBottom: "3px solid transparent", cursor: "pointer", color: colors.muted };
