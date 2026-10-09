import { useState } from 'react';
import { colors, fontDisplay, fontBody, gutter, headerBand, btnGhost } from '../styles/theme';

// Mix of two theme colors, so the shades follow the theme without hard-coded colors.
const mix = (a, b, pct) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

// Low-poly background: 14 triangles on a 390 × 230 grid, stretched to the band's width.
const TRIANGLES = [
  // upper row
  ["0,0 130,0 70,95", mix(colors.surface2, colors.bg, 90)],
  ["0,0 70,95 0,110", mix(colors.surface, colors.bg, 70)],
  ["130,0 200,120 70,95", mix(colors.surface2, colors.surface, 45)],
  ["130,0 260,0 200,120", mix(colors.surface, colors.bg, 45)],
  ["260,0 320,90 200,120", colors.surface2],
  ["260,0 390,0 320,90", mix(colors.surface, colors.bg, 85)],
  ["390,0 390,115 320,90", mix(colors.surface2, colors.bg, 60)],
  // lower row
  ["0,110 70,95 0,230", mix(colors.surface2, colors.bg, 55)],
  ["70,95 130,230 0,230", mix(colors.surface, colors.bg, 35)],
  ["70,95 200,120 130,230", mix(colors.surface2, colors.bg, 75)],
  ["200,120 260,230 130,230", mix(colors.surface, colors.bg, 55)],
  ["200,120 320,90 260,230", mix(colors.surface2, colors.surface, 70)],
  ["320,90 390,230 260,230", mix(colors.surface, colors.bg, 30)],
  ["320,90 390,115 390,230", mix(colors.surface2, colors.bg, 40)],
];

// The logo is also the "home" button: it goes back to the My Cards dashboard.
function Logo({ onHome }) {
  return (
    <h1 style={{ margin: 0, lineHeight: 1 }}>
      <button
        onClick={onHome}
        aria-label="My Cards"
        style={{
          display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 4px", margin: "0 -4px",
          background: "transparent", border: "none", borderRadius: 12, cursor: "pointer",
          fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, letterSpacing: 0, lineHeight: 1, color: colors.text,
        }}
      >
        <svg width="24" height="22" viewBox="0 0 24 22" aria-hidden="true">
          <polygon points="12,0 24,22 12,16" fill={colors.accent} />
          <polygon points="12,0 12,16 0,22" fill={mix(colors.accent, colors.bg, 65)} />
        </svg>
        Polycards
      </button>
    </h1>
  );
}

// Round button with the user's initial; opens a small menu with Sign Out.
function AccountButton({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "?";
  const initial = (Array.from(name.trim())[0] || "?").toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="アカウント (Account)"
        aria-expanded={open}
        style={{
          width: 44, height: 44, borderRadius: "50%", padding: 0, cursor: "pointer",
          background: colors.surface2, border: `2px solid ${colors.line}`, color: colors.text,
          fontFamily: fontDisplay, fontWeight: 700, fontSize: 18,
        }}
      >
        {initial}
      </button>
      {open && (
        <>
          {/* Invisible layer: tapping anywhere outside the menu closes it. */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          <div
            style={{
              position: "absolute", right: 0, top: 52, zIndex: 21, minWidth: 220,
              background: colors.surface, border: `2px solid ${colors.line}`, borderRadius: 16,
              padding: 12, display: "grid", gap: 10, textAlign: "left",
            }}
          >
            {user.email && (
              <div style={{ fontFamily: fontBody, fontSize: 13, color: colors.muted, overflowWrap: "anywhere" }}>{user.email}</div>
            )}
            <button onClick={() => { setOpen(false); onSignOut(); }} style={{ ...btnGhost, minHeight: 44, width: "100%" }}>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// variant "band": tall low-poly background (My Cards). "compact": just the top row (other screens).
// user: the Supabase user, or null when signed out (then no account button).
// onHome: called when the logo is tapped.
export default function Header({ variant = "compact", user, onSignOut, onHome }) {
  const row = (
    <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `16px ${gutter}px` }}>
      <Logo onHome={onHome} />
      {user && <AccountButton user={user} onSignOut={onSignOut} />}
    </div>
  );

  if (variant !== "band") return <div style={{ marginBottom: 8 }}>{row}</div>;

  return (
    <div style={{ position: "relative", height: headerBand.height }}>
      <svg
        viewBox="0 0 390 230" preserveAspectRatio="none" aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        {TRIANGLES.map(([points, fill]) => (
          <polygon key={points} points={points} fill={fill} stroke={fill} strokeWidth="0.5" />
        ))}
      </svg>
      {/* Fade the bottom edge into the page background. */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110, background: `linear-gradient(to bottom, transparent, ${colors.bg})` }} />
      {row}
    </div>
  );
}
