import { useState } from 'react';
import { colors, fontDisplay, fontBody, gutter, headerBand, btnGhost, btnDanger, wideLayout } from '../styles/theme';
import { CapsuleIcon } from './GachaIcons';
import LogoMark from './LogoMark';
import { accountName } from '../lib/login';

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
        <LogoMark height={24} />
        Polycards
      </button>
    </h1>
  );
}

const menuItem = {
  width: "100%", minHeight: 44, padding: "0 12px", borderRadius: 10, border: "none", background: "transparent",
  textAlign: "left", fontFamily: fontBody, fontSize: 16, fontWeight: 700, color: colors.text, cursor: "pointer",
};

// The menu under the account button: name and rank, 設定, 使い方, then ログアウト (asks first,
// inside the menu). confirming: the ログアウトしますか？ step is showing.
export function AccountMenu({ user, rank = null, confirming = false, onSettings, onHelp, onAskSignOut, onSignOut, onCancelSignOut }) {
  return (
    <div
      role="menu"
      aria-label="アカウント (Account)"
      style={{
        position: "absolute", right: 0, top: 52, zIndex: 21, minWidth: 230, maxWidth: "calc(100vw - 32px)", boxSizing: "border-box",
        background: colors.surface, border: `2px solid ${colors.line}`, borderRadius: 16,
        padding: 8, display: "grid", gap: 2, textAlign: "left",
        boxShadow: `0 8px 24px color-mix(in srgb, ${colors.text} 14%, transparent)`,
      }}
    >
      <div style={{ padding: "6px 12px 10px" }}>
        <div style={{ fontFamily: fontBody, fontSize: 16, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{accountName(user)}</div>
        {rank != null && (
          <div style={{ fontSize: 13, color: colors.muted }}>
            ランク <span style={{ fontFamily: fontDisplay, fontWeight: 700, color: colors.accentText }}>{rank}</span>
          </div>
        )}
      </div>
      {confirming ? (
        <div role="alertdialog" aria-label="ログアウトしますか？" style={{ display: "grid", gap: 8, padding: "4px 4px 4px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, padding: "0 8px" }}>ログアウトしますか？</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onSignOut} style={{ ...btnDanger, flex: 1, minHeight: 44, padding: "0 12px" }}>ログアウト</button>
            <button onClick={onCancelSignOut} style={{ ...btnGhost, flex: 1, minHeight: 44, padding: "0 12px" }}>キャンセル</button>
          </div>
        </div>
      ) : (
        <>
          <button role="menuitem" onClick={onSettings} style={menuItem}>設定</button>
          <button role="menuitem" onClick={onHelp} style={menuItem}>使い方</button>
          <div aria-hidden="true" style={{ height: 2, background: colors.line, margin: "4px 4px" }} />
          <button role="menuitem" onClick={onAskSignOut} style={{ ...menuItem, color: colors.danger }}>ログアウト</button>
        </>
      )}
    </div>
  );
}

// Round button with the user's initial; opens the account menu.
// dot: a small accent dot when a newly unlocked theme hasn't been seen in settings yet.
export function AccountButton({ user, rank = null, dot = false, onSignOut, onOpenSettings, onOpenHelp }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "?";
  const initial = (Array.from(name.trim())[0] || "?").toUpperCase();
  const close = () => { setOpen(false); setConfirming(false); };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={dot ? "アカウント (Account) 新しいテーマがあります" : "アカウント (Account)"}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          position: "relative", width: 44, height: 44, borderRadius: "50%", padding: 0, cursor: "pointer",
          background: colors.surface2, border: `2px solid ${colors.line}`, color: colors.text,
          fontFamily: fontDisplay, fontWeight: 700, fontSize: 18,
        }}
      >
        {initial}
        {dot && (
          <span
            data-dot=""
            aria-hidden="true"
            style={{
              position: "absolute", top: -1, right: -1, width: 12, height: 12, borderRadius: "50%",
              background: colors.accent, border: `2px solid ${colors.bg}`,
            }}
          />
        )}
      </button>
      {open && (
        <>
          {/* Invisible layer: tapping anywhere outside the menu closes it. */}
          <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          <AccountMenu
            user={user}
            rank={rank}
            confirming={confirming}
            onSettings={() => { close(); onOpenSettings?.(); }}
            onHelp={() => { close(); onOpenHelp?.(); }}
            onAskSignOut={() => setConfirming(true)}
            onCancelSignOut={() => setConfirming(false)}
            onSignOut={() => { close(); onSignOut(); }}
          />
        </>
      )}
    </div>
  );
}

// Round gacha button next to the account button. With tickets waiting it turns gold and shows
// a badge with the number; pulse: one gentle pulse (when the app opens with tickets waiting).
export function GachaButton({ tickets = 0, pulse = false, onOpen }) {
  const has = tickets > 0;
  const tone = has ? colors.gold : colors.accent;
  return (
    <button
      onClick={onOpen}
      className={pulse && has ? "gacha-pulse" : undefined}
      aria-label={has ? `ガチャ (券 ${tickets}枚)` : "ガチャ"}
      style={{
        position: "relative", width: 44, height: 44, borderRadius: "50%", padding: 0, cursor: "pointer",
        background: colors.surface2, border: `2px solid ${tone}`, color: tone,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <CapsuleIcon />
      {has && (
        <span
          data-badge=""
          style={{
            position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, padding: "0 5px", boxSizing: "border-box",
            borderRadius: 10, background: colors.danger, color: colors.dangerInk,
            fontFamily: fontDisplay, fontWeight: 700, fontSize: 12, lineHeight: "20px", textAlign: "center",
          }}
        >
          {tickets > 99 ? "99+" : tickets}
        </span>
      )}
    </button>
  );
}

// variant "band": tall low-poly background (My Cards). "compact": just the top row (other screens).
// user: the Supabase user, or null when signed out (then no account button).
// onHome: called when the logo is tapped. wide: wide-screen side padding.
// gacha: the gacha status (null while loading); pulseGacha / onOpenGacha: for the gacha button.
// rank, newTheme (the dot), onOpenSettings, onOpenHelp: for the account menu.
export default function Header({
  variant = "compact", user, onSignOut, onHome, wide = false, gacha = null, pulseGacha = false, onOpenGacha,
  rank = null, newTheme = false, onOpenSettings, onOpenHelp,
}) {
  const side = wide ? wideLayout.gutter : gutter;
  const row = (
    <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `16px ${side}px` }}>
      <Logo onHome={onHome} />
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GachaButton tickets={gacha?.tickets ?? 0} pulse={pulseGacha} onOpen={onOpenGacha} />
          <AccountButton user={user} rank={rank} dot={newTheme} onSignOut={onSignOut} onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} />
        </div>
      )}
    </div>
  );

  if (variant !== "band") return <div style={{ marginBottom: 8 }}>{row}</div>;

  return (
    <div style={{ position: "relative", height: headerBand.height }}>
      {/* The triangles fade out at the bottom (mask in src/index.css), so the theme's backdrop
          shows through instead of a solid bg. */}
      <svg
        viewBox="0 0 390 230" preserveAspectRatio="none" aria-hidden="true" className="header-band-art"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        {TRIANGLES.map(([points, fill]) => (
          <polygon key={points} points={points} fill={fill} stroke={fill} strokeWidth="0.5" />
        ))}
      </svg>
      {row}
    </div>
  );
}
