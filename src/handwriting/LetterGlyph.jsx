import { LETTER_GUIDES, letterMapper, lineMetrics, strokePath } from "./letterGuides.js";
import { colors } from "../styles/theme.js";

// One letter drawn from its stroke data (the same forms as the stroke-order guide: single-story a and
// g, etc.) on faint four lines. Static: no animation, no numbers. Follows the theme.
export default function LetterGlyph({ letter, width = 56, height = 80 }) {
  const guide = LETTER_GUIDES[letter];
  if (!guide) return null;
  const map = letterMapper(letter, width, height);
  const { lines, gap } = lineMetrics(height);
  const ink = gap * 0.2;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ display: "block" }}>
      {lines.map((y, i) => (
        <line key={i} x1={0} x2={width} y1={y} y2={y}
          stroke={i === 2 ? colors.danger : colors.line} strokeWidth={i === 2 ? 1.5 : 1}
          strokeDasharray={i === 1 ? "4 3" : undefined} opacity={i === 2 ? 0.6 : 1} />
      ))}
      {guide.strokes.map((st, i) => (st.dot ? (
        <circle key={i} cx={map(st.start)[0]} cy={map(st.start)[1]} r={ink * 0.75} fill={colors.text} />
      ) : (
        <path key={i} d={strokePath(st, map)} fill="none" stroke={colors.text} strokeWidth={ink} strokeLinecap="round" strokeLinejoin="round" />
      )))}
    </svg>
  );
}
