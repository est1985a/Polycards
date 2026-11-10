import { useState } from 'react';
import { colors, mix, fontDisplay, fontBody, gutter, headerBand, btnGhost, btnDanger, wideLayout } from '../styles/theme';
import { CapsuleIcon } from './GachaIcons';
import LogoMark from './LogoMark';
import { accountName } from '../lib/login';
import { t, tx } from '../i18n';

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

// The app name: "Poly" in the theme's accentText + "vo" in its text color, so it reads on every theme
// (mint + white in Midnight). The logo mark next to it stays in Midnight colors (LogoMark).
// Also used by ThemePreview's mini header.
export function Wordmark() {
  return (
    <span>
      <span style={{ color: colors.accentText }}>Poly</span>
      <span style={{ color: colors.text }}>vo</span>
    </span>
  );
}

// The logo is also the "home" button: it goes back to the My Cards dashboard.
function Logo({ onHome }) {
  return (
    <h1 style={{ margin: 0, lineHeight: 1 }}>
      <button
        onClick={onHome}
        aria-label={t("header.home")}
        style={{
          display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 4px", margin: "0 -4px",
          background: "transparent", border: "none", borderRadius: 12, cursor: "pointer",
          fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, letterSpacing: 0, lineHeight: 1, color: colors.text,
        }}
      >
        <LogoMark height={24} />
        <Wordmark />
      </button>
    </h1>
  );
}

const menuItem = {
  width: "100%", minHeight: 44, padding: "0 12px", borderRadius: 10, border: "none", background: "transparent",
  textAlign: "left", fontFamily: fontBody, fontSize: 16, fontWeight: 700, color: colors.text, cursor: "pointer",
};

// ログアウト / キャンセル buttons. nowrap: the menu is only as wide as its narrowest layout (it hangs off the
// 44 px account button), so without it ログアウト broke after ウ and キャンセル after セ.
const confirmBtn = { flex: 1, minHeight: 44, padding: "0 12px", whiteSpace: "nowrap" };

// The menu under the account button: name and rank, 学習の記録, クラスに参加, (先生として登録 / 承認待ち),
// 設定, 使い方, (Polyvo管理), then ログアウト (asks first, inside the menu). confirming: the
// ログアウトしますか？ step is showing.
// school (schools, supabase/polyvo-schools-phase1.sql), or null: { state ('register' | 'pending' |
//   'teacher' | 'hidden', schoolMenuState()), pendingName, isPlatformAdmin }.
// cancelConfirming: the リクエストを取り消しますか？ step is showing; cancelBusy / cancelError for it.
export function AccountMenu({
  user, rank = null, confirming = false, onStats, onJoinClass, onSettings, onHelp, onAskSignOut, onSignOut, onCancelSignOut,
  school = null, cancelConfirming = false, cancelBusy = false, cancelError = null,
  onRegisterTeacher, onAskCancelRequest, onCancelRequest, onBackFromCancel, onAdmin,
}) {
  return (
    <div
      role="menu"
      aria-label={t("menu.account")}
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
            {tx("menu.rank", { n: <span style={{ fontFamily: fontDisplay, fontWeight: 700, color: colors.accentText }}>{rank}</span>, count: rank })}
          </div>
        )}
      </div>
      {confirming ? (
        <div role="alertdialog" aria-label={t("menu.signOutConfirm")} style={{ display: "grid", gap: 8, padding: "4px 4px 4px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, padding: "0 8px" }}>{t("menu.signOutConfirm")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onSignOut} style={{ ...btnDanger, ...confirmBtn }}>{t("menu.signOut")}</button>
            <button onClick={onCancelSignOut} style={{ ...btnGhost, ...confirmBtn }}>{t("common.cancel")}</button>
          </div>
        </div>
      ) : cancelConfirming ? (
        <div role="alertdialog" aria-label={t("menu.cancelRequestConfirm")} style={{ display: "grid", gap: 8, padding: "4px 4px 4px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, padding: "0 8px" }}>{t("menu.cancelRequestConfirm")}</div>
          {cancelError && <div role="alert" style={{ fontSize: 14, color: colors.danger, padding: "0 8px" }}>{cancelError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCancelRequest} disabled={cancelBusy} style={{ ...btnDanger, ...confirmBtn, opacity: cancelBusy ? 0.6 : 1 }}>
              {cancelBusy ? "…" : t("menu.cancelRequestYes")}
            </button>
            <button onClick={onBackFromCancel} disabled={cancelBusy} style={{ ...btnGhost, ...confirmBtn }}>{t("menu.back")}</button>
          </div>
        </div>
      ) : (
        <>
          <button role="menuitem" onClick={onStats} style={menuItem}>{t("menu.stats")}</button>
          <button role="menuitem" onClick={onJoinClass} style={menuItem}>{t("menu.joinClass")}</button>
          {school?.state === "register" && (
            <button role="menuitem" onClick={onRegisterTeacher} style={menuItem}>{t("menu.registerTeacher")}</button>
          )}
          {school?.state === "pending" && (
            <div data-school-pending="" style={{ display: "grid", gap: 6, padding: "6px 4px 6px 12px" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted, overflowWrap: "anywhere" }}>
                {t("menu.pendingSchool", { name: school.pendingName ?? "" })}
              </span>
              <button role="menuitem" onClick={onAskCancelRequest} style={{ ...btnGhost, justifySelf: "start", minHeight: 44, padding: "0 14px", fontSize: 14, whiteSpace: "nowrap" }}>
                {t("menu.cancelRequest")}
              </button>
            </div>
          )}
          <button role="menuitem" onClick={onSettings} style={menuItem}>{t("menu.settings")}</button>
          <button role="menuitem" onClick={onHelp} style={menuItem}>{t("menu.help")}</button>
          {school?.isPlatformAdmin && (
            <button role="menuitem" onClick={onAdmin} style={menuItem}>{t("menu.admin")}</button>
          )}
          <div aria-hidden="true" style={{ height: 2, background: colors.line, margin: "4px 4px" }} />
          <button role="menuitem" onClick={onAskSignOut} style={{ ...menuItem, color: colors.danger }}>{t("menu.signOut")}</button>
        </>
      )}
    </div>
  );
}

// Round button with the user's initial; opens the account menu.
// dot: a small accent dot when a newly unlocked theme hasn't been seen in settings yet.
// school: see AccountMenu, plus onRegister(), onCancel() (a promise) and onAdmin().
export function AccountButton({ user, rank = null, dot = false, onSignOut, onOpenStats, onOpenSettings, onOpenHelp, onOpenJoinClass, school = null }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelConfirming, setCancelConfirming] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "?";
  const initial = (Array.from(name.trim())[0] || "?").toUpperCase();
  const close = () => { setOpen(false); setConfirming(false); setCancelConfirming(false); setCancelError(null); };
  async function cancelRequest() {
    setCancelBusy(true); setCancelError(null);
    try {
      await school?.onCancel?.();
      close();
    } catch (e) {
      setCancelError(e.message);
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={dot ? t("menu.accountNewTheme") : t("menu.account")}
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
            onStats={() => { close(); onOpenStats?.(); }}
            onSettings={() => { close(); onOpenSettings?.(); }}
            onJoinClass={() => { close(); onOpenJoinClass?.(); }}
            onHelp={() => { close(); onOpenHelp?.(); }}
            school={school}
            cancelConfirming={cancelConfirming}
            cancelBusy={cancelBusy}
            cancelError={cancelError}
            onRegisterTeacher={() => { close(); school?.onRegister?.(); }}
            onAskCancelRequest={() => setCancelConfirming(true)}
            onCancelRequest={cancelRequest}
            onBackFromCancel={() => { setCancelConfirming(false); setCancelError(null); }}
            onAdmin={() => { close(); school?.onAdmin?.(); }}
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
      aria-label={has ? t("header.gachaTickets", { n: tickets }) : t("header.gacha")}
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
// rank, newTheme (the dot), onOpenStats, onOpenSettings, onOpenHelp, onOpenJoinClass: for the account menu.
// tight: the review on a short screen (landscape iPad): less space above and below the row.
// school: the account menu's school items (see AccountButton), or null.
// search: the dictionary search (DictionarySearch), signed in only: between the logo and the buttons
// on wide screens, a magnifier before the gacha button on phones (its box drops down under the row).
export default function Header({
  variant = "compact", user, onSignOut, onHome, wide = false, gacha = null, pulseGacha = false, onOpenGacha,
  rank = null, newTheme = false, onOpenStats, onOpenSettings, onOpenHelp, onOpenJoinClass, tight = false,
  search = null, school = null,
}) {
  const side = wide ? wideLayout.gutter : gutter;
  // zIndex 25: above everything sticky or fixed on the page (word list bar 5, drill button and tabs 10),
  // so the account menu and its close-on-tap-outside layer cover them; below the pop-ups (30, 40).
  const row = (
    <div style={{ position: "relative", zIndex: 25, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: `${tight ? 6 : 16}px ${side}px`, "--dictionary-gutter": `${side}px` }}>
      <Logo onHome={onHome} />
      {user && search && wide && (
        <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center", padding: "0 12px" }}>{search}</div>
      )}
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {search && !wide && search}
          <GachaButton tickets={gacha?.tickets ?? 0} pulse={pulseGacha} onOpen={onOpenGacha} />
          <AccountButton user={user} rank={rank} dot={newTheme} onSignOut={onSignOut} onOpenStats={onOpenStats} onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenJoinClass={onOpenJoinClass} school={school} />
        </div>
      )}
    </div>
  );

  if (variant !== "band") return <div style={{ marginBottom: tight ? 0 : 8 }}>{row}</div>;

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
