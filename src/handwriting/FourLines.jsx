import { HW_COLORS } from "./config.js";
import { LETTER_GUIDES, letterMapper, lineMetrics, strokePath } from "./letterGuides.js";

// The English four lines (英語の4線) for a box width × height px: line 2 dashed, line 3 the red
// baseline (a little thicker). trace: a letter drawn faintly on the lines, to write over.
// Drawn as an SVG on top of the canvas (pointer-events none), so the model never sees it.
export default function FourLines({ width, height, trace = null }) {
  const { lines, gap } = lineMetrics(height);
  const guide = trace ? LETTER_GUIDES[trace] : null;
  const map = guide ? letterMapper(trace, width, height) : null;
  const ink = gap * 0.18;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", pointerEvents: "none" }} aria-hidden="true">
      {guide && guide.strokes.map((st, i) => (st.dot ? (
        <circle key={i} cx={map(st.start)[0]} cy={map(st.start)[1]} r={ink * 0.7} fill={HW_COLORS.trace} />
      ) : (
        <path key={i} d={strokePath(st, map)} fill="none" stroke={HW_COLORS.trace} strokeWidth={ink} strokeLinecap="round" strokeLinejoin="round" />
      )))}
      {lines.map((y, i) => (
        <line
          key={i} x1={0} x2={width} y1={y} y2={y}
          stroke={i === 2 ? HW_COLORS.guideBaseline : HW_COLORS.guide}
          strokeWidth={i === 2 ? 2 : 1}
          strokeDasharray={i === 1 ? "5 4" : undefined}
          opacity={i === 2 ? 0.8 : 0.9}
        />
      ))}
    </svg>
  );
}
