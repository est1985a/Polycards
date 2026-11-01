import { useEffect, useRef, useState } from 'react';
import { colors, fontDisplay, btnPrimary, btnGhost } from '../styles/theme';
import { shouldCloseSheet } from '../lib/sheet';
import ThemePreview from './ThemePreview';
import AvatarPicture from './AvatarPicture';
import LogoMark from './LogoMark';
import { t, tx, getLang } from '../i18n';

const heading = { margin: 0, fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, color: colors.gold };
const actionBtn = { minHeight: 48, borderRadius: 14, fontSize: 16, fontWeight: 700, padding: "0 18px" };
const rewardBox = { display: "grid", gap: 10, justifyItems: "center", padding: 14, borderRadius: 16, background: colors.surface2, border: `2px solid ${colors.line}` };

// What this rank-up unlocked: the newest theme (with 今すぐ使う) and/or the newest Special Polyavatar
// (with つける).
function Unlocked({ view, rank, busy, onUseTheme, onEquip }) {
  const theme = view.newThemes[0];
  const special = view.newSpecials[0];
  return (
    <>
      {theme && (
        <div style={rewardBox} data-reward="theme">
          <h3 style={heading}>{t("rankUp.newTheme")}</h3>
          <div style={{ width: "100%", maxWidth: 260 }}>
            <ThemePreview theme={theme.theme} rank={rank} radius={12} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{t("rankUp.newThemeName", { name: theme.name })}</div>
          {view.newThemes.length > 1 && (
            <div style={{ fontSize: 13, color: colors.muted }}>{t("rankUp.moreThemes", { n: view.newThemes.length - 1 })}</div>
          )}
          <button onClick={() => onUseTheme(theme.key)} disabled={busy} style={{ ...btnPrimary, ...actionBtn, opacity: busy ? 0.7 : 1 }}>
            {t("themes.useNow")}
          </button>
        </div>
      )}
      {special && (
        <div style={rewardBox} data-reward="special">
          <h3 style={heading}>{t("rankUp.newSpecial")}</h3>
          <AvatarPicture avatar={special} size={112} />
          <div>
            <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20 }}>{special.name_en}</div>
            {getLang() !== "en" && special.name_ja && <div style={{ fontSize: 13, color: colors.muted }}>{special.name_ja}</div>}
          </div>
          <button onClick={() => onEquip(special.id)} disabled={busy} style={{ ...btnPrimary, ...actionBtn, opacity: busy ? 0.7 : 1 }}>
            {t("gacha.equip")}
          </button>
        </div>
      )}
    </>
  );
}

// The next reward: あと N ランクで次のごほうび + a small preview (the theme, or the Special
// Polyavatar in full color). After the last one: just a well-done line.
function NextReward({ next, rank }) {
  if (!next) {
    return <p data-reward="done" style={{ margin: 0, fontSize: 15, color: colors.muted }}>{t("rankUp.allDone")}</p>;
  }
  return (
    <div data-reward="next" style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>
        {tx("rankUp.nextReward", { n: <span style={{ fontFamily: fontDisplay, color: colors.gold, fontSize: 20 }}>{next.ranksToGo}</span>, count: next.ranksToGo })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {next.kind === "theme" ? (
          <div style={{ width: 120, flexShrink: 0 }}><ThemePreview theme={next.theme.theme} rank={rank} radius={8} /></div>
        ) : (
          <AvatarPicture avatar={next.avatar} size={64} />
        )}
        <div style={{ fontSize: 14, color: colors.muted, textAlign: "left" }}>
          {next.kind === "theme"
            ? t("rankUp.nextTheme", { name: next.theme.name, rank: next.unlockRank })
            : t("rankUp.nextSpecial", { rank: next.unlockRank })}
        </div>
      </div>
    </div>
  );
}

// The box itself, without the backdrop or key handling (tests render this).
export function RankUpBox({ view, busy = false, error = null, onUseTheme, onEquip, onClose, closeRef = null }) {
  const unlocked = view.newThemes.length > 0 || view.newSpecials.length > 0;
  return (
    <div
      className={unlocked ? "review-plan-sheet rankup-sheet rankup-wide" : "review-plan-sheet rankup-sheet"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rankup-title"
      style={{ background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, textAlign: "center" }}
    >
      <div className={unlocked ? "rankup-body rankup-two" : "rankup-body"}>
        <div style={{ display: "grid", gap: 8, justifyItems: "center", alignContent: "center" }}>
          <LogoMark height={40} />
          <h2 id="rankup-title" style={{ margin: 0, fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, color: colors.accentText }}>
            {t("rankUp.title")}
          </h2>
          <div className="rankup-rank" style={{ fontFamily: fontDisplay, fontWeight: 700, color: colors.gold, lineHeight: 1.1 }}>
            {t("stats.rank", { n: view.rank })}
          </div>
          <p style={{ margin: 0, fontSize: 15 }}>{t("rankUp.congrats")}</p>
          <div style={{ marginTop: 8, width: "100%" }}>
            <NextReward next={view.next} rank={view.rank} />
          </div>
        </div>
        {unlocked && (
          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <Unlocked view={view} rank={view.rank} busy={busy} onUseTheme={onUseTheme} onEquip={onEquip} />
          </div>
        )}
      </div>
      {error && <div role="alert" style={{ marginTop: 12, fontSize: 14, color: colors.danger }}>{error}</div>}
      <button
        ref={closeRef}
        onClick={onClose}
        disabled={busy}
        style={{ ...(unlocked ? btnGhost : btnPrimary), ...actionBtn, width: "100%", marginTop: 16 }}
      >
        {busy ? t("rankUp.saving") : t("gacha.close")}
      </button>
    </div>
  );
}

// The rank-up pop-up (view: rankUpView() in src/lib/rankUp.js). Shown once per rank-up on My Cards;
// it replaces the theme-unlock pop-up. onUseTheme(key) / onEquip(avatarId) may throw: the error then
// shows in the pop-up and it stays open; when they work, the pop-up closes. Closes with とじる, Escape
// or a tap on the backdrop.
export default function RankUpSheet({ view, onUseTheme, onEquip, onClose }) {
  const closeRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const latestClose = useRef(onClose);
  useEffect(() => { latestClose.current = onClose; });

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (shouldCloseSheet(e)) latestClose.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus?.({ preventScroll: true });
    };
  }, []);

  async function act(fn, arg) {
    setBusy(true);
    setError(null);
    try {
      await fn(arg);
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div
      className="review-plan-backdrop"
      onClick={(e) => { if (!busy && shouldCloseSheet(e)) onClose(); }}
      style={{ zIndex: 40, background: `color-mix(in srgb, ${colors.bg} 75%, transparent)` }}
    >
      <RankUpBox
        view={view} busy={busy} error={error} closeRef={closeRef} onClose={onClose}
        onUseTheme={(key) => act(onUseTheme, key)} onEquip={(id) => act(onEquip, id)}
      />
    </div>
  );
}
