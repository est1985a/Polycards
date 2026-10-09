import { colors, fontDisplay } from '../styles/theme';

// Mix of two theme colors, so the shades follow the theme without hard-coded colors.
const mix = (a, b, pct) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

// Low-poly decoration on the right of a hub card, on a 140 × 200 grid.
// tint: the card's accent (accent or gold), mixed with the card's surface.
function PolyDecoration({ tint }) {
  const triangles = [
    ["40,0 140,0 95,70", mix(tint, colors.surface, 35)],
    ["40,0 95,70 0,95", mix(tint, colors.surface, 15)],
    ["140,0 140,110 95,70", mix(tint, colors.surface, 60)],
    ["0,95 95,70 70,200", mix(tint, colors.surface, 45)],
    ["95,70 140,110 70,200", mix(tint, colors.surface, 80)],
    ["140,110 140,200 70,200", mix(tint, colors.bg, 55)],
  ];
  return (
    <svg
      viewBox="0 0 140 200" preserveAspectRatio="none" aria-hidden="true"
      style={{ position: "absolute", top: 0, right: 0, width: 140, height: "100%", display: "block" }}
    >
      {triangles.map(([points, fill]) => (
        <polygon key={points} points={points} fill={fill} stroke={fill} strokeWidth="0.5" />
      ))}
    </svg>
  );
}

// One big tappable card. tint is a fill color (accent or gold), labelColor the readable
// text version of it (accent can't be used as text, see CLAUDE.md).
function HubCard({ title, label, note, tint, labelColor, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative", overflow: "hidden", width: "100%", minHeight: 200, boxSizing: "border-box",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 6,
        padding: "20px 150px 20px 24px", textAlign: "left", cursor: "pointer",
        background: colors.surface, border: `2px solid ${colors.line}`, borderRadius: 24, color: colors.text,
      }}
    >
      <PolyDecoration tint={tint} />
      {/* Colored strip on the left edge */}
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 24, bottom: 24, width: 6, borderRadius: "0 6px 6px 0", background: tint }} />
      <span style={{ position: "relative", fontFamily: fontDisplay, fontWeight: 700, fontSize: 26, lineHeight: 1.1 }}>{title}</span>
      <span style={{ position: "relative", fontSize: 16, fontWeight: 700, color: labelColor }}>{label}</span>
      <span style={{ position: "relative", fontSize: 13, lineHeight: 1.5, color: colors.muted }}>{note}</span>
    </button>
  );
}

// Card Sets start screen: Textbooks or Tests & Themes.
export default function CardSetsHub({ onOpenTextbooks, onOpenTests }) {
  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 28, margin: 0, color: colors.text }}>Card Sets</h2>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted }}>カードセット</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: colors.muted }}>学びたいセットをえらんで、マイカードに追加しよう。</p>
      </div>
      <HubCard
        title="Textbooks"
        label="教科書から探す"
        note="New Horizon や Power On の ユニット・パートごとのセット"
        tint={colors.accent}
        labelColor={colors.accentText}
        onClick={onOpenTextbooks}
      />
      <HubCard
        title="Tests & Themes"
        label="テスト・テーマ別"
        note="英検などのテスト対策や、テーマ別の単語セット"
        tint={colors.gold}
        labelColor={colors.gold}
        onClick={onOpenTests}
      />
    </div>
  );
}
