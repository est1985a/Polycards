import { colors, fontDisplay, panel } from '../styles/theme';
import { pointsForRank } from '../lib/points';
import AvatarPicture from './AvatarPicture';
import { t, tx } from '../i18n';

const fmt = (n) => n.toLocaleString('en-US');

// Player card: avatar, rank, points, and progress to the next rank.
// stats: { playerRank, currentPoints, peakPoints, bonusPoints, levelCounts } (from src/lib/points.js).
// Rank and the next-rank bar use peak + spelling bonus (bonusPoints, from typing mode).
// avatar: the equipped avatar from gacha_status (null = the starter cat). wide: a bigger avatar.
export default function PlayerStats({ stats, avatar = null, wide = false }) {
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

  return (
    <div style={{ ...panel, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: wide ? 128 : 104, height: wide ? 128 : 104, flexShrink: 0, borderRadius: 16, background: colors.surface2,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <AvatarPicture avatar={avatar} size={wide ? 104 : 84} />
        </div>
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
    </div>
  );
}
