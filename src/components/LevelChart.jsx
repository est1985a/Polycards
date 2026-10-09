import { colors, fontDisplay, panel } from '../styles/theme';
import { MASTERED } from '../lib/srs';
import StarIcon from './StarIcon';

const CHART_HEIGHT = 150; // whole chart area, count labels included
const LABEL_SPACE = 20;   // room for the count above the tallest bar
const MIN_BAR = 8;        // a level with at least one card is never thinner than this

// Visually hidden but read by screen readers.
const srOnly = { position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" };

const fmt = (n) => n.toLocaleString('en-US');

// Bar chart of how many cards are at each level (Lv0 to Lv7, in the level colors), plus a gold
// Mastered bar marked with a star.
// counts: [Lv0 count, ..., Lv7 count, Mastered count] (levelCounts in src/lib/points.js)
export default function LevelChart({ counts }) {
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts, 1);
  const maxBar = CHART_HEIGHT - LABEL_SPACE;

  return (
    <div style={{ ...panel, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: colors.text }}>レベル別カード数</h2>
        <span style={{ fontSize: 13, color: colors.muted }}>
          全部で <span style={{ fontFamily: fontDisplay, fontWeight: 700, color: colors.text }}>{fmt(total)}</span>枚
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: CHART_HEIGHT }}>
        {counts.map((count, level) => {
          const height = count > 0 ? Math.max(MIN_BAR, Math.round((count / max) * maxBar)) : 0;
          const mastered = level === MASTERED;
          // Midnight's Lv7 color is also gold, so the Mastered bar glows to stand apart.
          const glow = mastered && count > 0 ? `0 0 10px color-mix(in srgb, ${colors.gold} 70%, transparent)` : "none";
          return (
            <div key={level} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontFamily: fontDisplay, fontSize: 12, lineHeight: 1, color: count > 0 ? colors.text : colors.muted }}>{count}</span>
              <div
                data-level={level}
                style={{
                  width: "72%", maxWidth: 32, height, borderRadius: "6px 6px 0 0",
                  background: mastered ? colors.gold : colors.level(level), boxShadow: glow,
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: -6, borderTop: `2px solid ${colors.line}`, paddingTop: 6 }}>
        {counts.map((_, level) => level === MASTERED ? (
          <span key={level} title="Mastered" style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <StarIcon size={14} />
            <span style={srOnly}>Mastered</span>
          </span>
        ) : (
          <span key={level} style={{ flex: 1, textAlign: "center", fontSize: 11, color: colors.muted }}>Lv{level}</span>
        ))}
      </div>

      <p style={{ fontSize: 12, color: colors.muted, margin: 0 }}>Lv7 のカードは約4か月後に復習。正解するとマスター！</p>
    </div>
  );
}
