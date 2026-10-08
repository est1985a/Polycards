import { colors, fontDisplay, panel } from '../styles/theme';
import { pointsForLevel } from '../lib/points';
import Avatar from './Avatar';

const fmt = (n) => n.toLocaleString('en-US');

// Player card: avatar, player level, points, and progress to the next level.
// stats: { playerLevel, currentPoints, peakPoints, levelCounts } (from src/lib/points.js)
export default function PlayerStats({ stats }) {
  // Keep the space while points are loading, so the page doesn't jump.
  if (!stats) return <div style={{ ...panel, minHeight: 190 }} aria-busy="true" />;

  // Player level comes from the peak, so progress is measured with the peak too.
  const level = stats.playerLevel;
  const start = pointsForLevel(level);
  const next = pointsForLevel(level + 1);
  const toNext = next - stats.peakPoints;
  const progress = Math.min(1, Math.max(0, (stats.peakPoints - start) / (next - start)));

  return (
    <div style={{ ...panel, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 104, height: 104, flexShrink: 0, borderRadius: 16, background: colors.surface2,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Avatar size={84} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: colors.muted }}>プレイヤーレベル</div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 46, lineHeight: 1.05, color: colors.accentText }}>Lv {level}</div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 22, lineHeight: 1.3, color: colors.gold }}>{fmt(stats.currentPoints)} pt</div>
          <div style={{ fontSize: 13, color: colors.muted }}>ベスト {fmt(stats.peakPoints)} pt</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 13 }}>
          <span style={{ color: colors.muted }}>次のレベルまで</span>
          <span style={{ color: colors.text }}>
            あと<span style={{ fontFamily: fontDisplay, fontWeight: 700 }}>{fmt(toNext)} pt → Lv {level + 1}</span>
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
