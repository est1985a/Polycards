import { colors, fontDisplay, cardStyle } from '../styles/theme';

const fmt = (n) => n.toLocaleString('en-US');

// Player level, points, and how many cards are at each level.
// stats: { playerLevel, currentPoints, peakPoints, levelCounts } (from src/lib/points.js)
export default function PlayerStats({ stats }) {
  if (!stats) return null;
  return (
    <div style={{ ...cardStyle, padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: colors.muted }}>プレイヤーレベル</div>
          <div style={{ fontFamily: fontDisplay, fontSize: 28, color: colors.gold }}>Lv. {stats.playerLevel}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: colors.muted }}>ポイント</div>
          <div style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: "bold", color: colors.gold }}>{fmt(stats.currentPoints)}</div>
          <div style={{ fontSize: 12, color: colors.muted }}>最高 {fmt(stats.peakPoints)}</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>レベル別カード数</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4 }}>
          {stats.levelCounts.map((count, level) => (
            <div key={level} style={{ border: `1px solid ${colors.line}`, borderRadius: 6, padding: "4px 0", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: colors.muted }}>Lv.{level}</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: "bold", color: count > 0 ? colors.level(level) : colors.muted }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
