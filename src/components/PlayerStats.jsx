import { colors, fontDisplay, panel } from '../styles/theme';
import { pointsForRank } from '../lib/points';
import AvatarPicture from './AvatarPicture';
import { t, tx } from '../i18n';

const fmt = (n) => n.toLocaleString('en-US');

// Player card: avatar, rank, points, and progress to the next rank.
// stats: { playerRank, currentPoints, peakPoints, bonusPoints, levelCounts } (from src/lib/points.js).
// Rank and the next-rank bar use peak + spelling bonus (bonusPoints, from typing mode).
// avatar: the equipped avatar from gacha_status (null = the starter cat). wide: a bigger avatar.
// onOpenCollection: tapping the avatar opens the アバター図鑑.
// onOpenStats: tapping anywhere else on the card opens the stats page (学習の記録). The card is a
// div with role="button" (not a <button>), so the avatar button isn't a button inside a button.
export default function PlayerStats({ stats, avatar = null, wide = false, onOpenCollection, onOpenStats }) {
  // Keep the space while points are loading, so the page doesn't jump.
  if (!stats) return <div style={{ ...panel, minHeight: 190 }} aria-busy="true" />;

  // Rank comes from the peak plus the spelling bonus, so progress is measured with them too.
  const bonus = stats.bonusPoints ?? 0;
  const rankPoints = stats.peakPoints + bonus;
  const rank = stats.playerRank;
  const start = pointsForRank(rank);
  const next = pointsForRank(rank + 1);
  const toNext = next - rankPoints;
  const progress = Math.min(1, Math.max(0, (rankPoints - start) / (next - start)));

  // Enter / Space on the card itself (not on the avatar button inside it) opens the stats page.
  const onKeyDown = (e) => {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    onOpenStats();
  };
  const cardProps = onOpenStats
    ? { role: "button", tabIndex: 0, "aria-label": t("stats.open"), className: "stats-card-button", onClick: onOpenStats, onKeyDown }
    : {};

  return (
    <div {...cardProps} style={{ ...panel, display: "grid", gap: 14, cursor: onOpenStats ? "pointer" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenCollection?.(); }}
          aria-label={t("stats.openCollection")}
          className="avatar-button"
          style={{
            width: wide ? 128 : 104, height: wide ? 128 : 104, flexShrink: 0, borderRadius: 16, background: colors.surface2,
            display: "flex", alignItems: "center", justifyContent: "center", border: "none", padding: 0, cursor: "pointer",
          }}
        >
          <AvatarPicture avatar={avatar} size={wide ? 104 : 84} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: colors.muted }}>{t("stats.rankLabel")}</div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 46, lineHeight: 1.05, color: colors.accentText }}>{t("stats.rank", { n: rank })}</div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 22, lineHeight: 1.3, color: colors.gold }}>{t("stats.points", { n: fmt(stats.currentPoints) })}</div>
          {stats.peakPoints > stats.currentPoints && <div style={{ fontSize: 13, color: colors.muted }}>{t("stats.best", { n: fmt(stats.peakPoints) })}</div>}
          {bonus > 0 && <div style={{ fontSize: 13, color: colors.muted }}>{t("stats.spellingBonus", { n: fmt(bonus) })}</div>}
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 13 }}>
          <span style={{ color: colors.muted }}>{t("stats.toNextRank")}</span>
          <span style={{ color: colors.text }}>
            {tx("stats.toNextRankLeft", { value: <span style={{ fontFamily: fontDisplay, fontWeight: 700 }}>{t("stats.toNextRankValue", { n: fmt(toNext), rank: rank + 1 })}</span> })}
          </span>
        </div>
        <div
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
          style={{ height: 12, borderRadius: 6, background: colors.surface2, overflow: "hidden" }}
        >
          <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 6, background: colors.accent }} />
        </div>
      </div>

      {onOpenStats && (
        <div aria-hidden="true" style={{ justifySelf: "end", marginTop: -6, fontSize: 13, color: colors.muted }}>
          {t("stats.openHint")} ›
        </div>
      )}
    </div>
  );
}
