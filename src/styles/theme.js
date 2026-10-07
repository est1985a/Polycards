// Shared colors, fonts, and button styles.

export const colors = {
  cream: "#f4efe1",
  navy: "#22406b",
  red: "#b23a2f",
  blue: "#3a6096",     // library deck buttons
  paper: "#fffdf7",    // card background
  line: "#e4dcc4",     // borders
  lineDark: "#d9d2bf",
  text: "#2c2a24",
  textSoft: "#5c5744",
  muted: "#8a8468",
  link: "#7a7462",
};

export const serif = "Georgia, 'Hiragino Mincho ProN', 'Yu Mincho', serif";

export const wrap = {
  maxWidth: 480, margin: "0 auto", padding: "24px 20px 60px", minHeight: 500,
  fontFamily: "'Hiragino Maru Gothic ProN', 'Yu Gothic', 'Segoe UI', system-ui, sans-serif", color: colors.text,
};

export const cardStyle = { background: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 10 };

export const btnPrimary = { background: colors.navy, color: "#fbf7ec", border: "none", borderRadius: 8, padding: "12px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
export const btnGhost = { background: "transparent", color: colors.navy, border: `1px solid ${colors.navy}`, borderRadius: 8, padding: "12px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer" };
export const btnLink = { background: "none", border: "none", color: colors.link, fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 };

export const tabActive = { padding: "10px 16px", borderBottom: `3px solid ${colors.red}`, fontWeight: "bold", cursor: "pointer", color: colors.navy };
export const tabInactive = { padding: "10px 16px", borderBottom: "3px solid transparent", cursor: "pointer", color: colors.muted };
