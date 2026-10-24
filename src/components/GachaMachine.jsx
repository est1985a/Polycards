import { colors } from '../styles/theme';
import { themes, themeVars } from '../themes';

const mix = (a, b, pct) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

// Glass dome: a ring of triangles around the center, lighter on the upper left.
const DOME = [
  ["100,20 141,37 100,100", mix(colors.surface2, colors.text, 82)],
  ["141,37 158,78 100,100", mix(colors.surface2, colors.bg, 80)],
  ["158,78 150,122 100,100", mix(colors.surface2, colors.bg, 55)],
  ["150,122 100,140 100,100", mix(colors.surface, colors.bg, 60)],
  ["100,140 50,122 100,100", mix(colors.surface2, colors.bg, 65)],
  ["50,122 42,78 100,100", mix(colors.surface2, colors.bg, 90)],
  ["42,78 59,37 100,100", mix(colors.surface2, colors.text, 75)],
  ["59,37 100,20 100,100", mix(colors.surface2, colors.text, 70)],
];

// Capsules inside the dome: [x, y, color].
const CAPSULES = [
  [76, 104, colors.accent], [104, 112, colors.gold], [130, 100, colors.danger],
  [88, 82, colors.level(2)], [118, 78, colors.accent], [70, 70, colors.gold], [100, 56, colors.level(1)],
];

// Body: two-tone triangles in the accent color.
const BODY = [
  ["44,140 156,140 100,180", mix(colors.accent, colors.bg, 85)],
  ["44,140 100,180 44,236", mix(colors.accent, colors.bg, 65)],
  ["156,140 156,236 100,180", mix(colors.accent, colors.bg, 50)],
  ["44,236 100,180 156,236", mix(colors.accent, colors.bg, 40)],
];

function Capsule({ x, y, color }) {
  return (
    <g>
      <path d={`M${x - 10} ${y}a10 10 0 0 1 20 0z`} fill={color} />
      <path d={`M${x - 10} ${y}h20a10 10 0 0 1-20 0z`} fill={mix(colors.text, colors.surface2, 80)} />
    </g>
  );
}

// Low-poly capsule toy machine (decoration only). Always in Midnight colors, whatever the theme:
// Midnight's CSS variables are set on the svg itself (like ThemePreview's box).
export default function GachaMachine({ size = 220 }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 200 260" aria-hidden="true" style={{ ...themeVars(themes.midnight), display: "block", margin: "0 auto", maxWidth: "100%" }}>
      {/* shadow */}
      <ellipse cx="100" cy="246" rx="70" ry="8" fill={mix(colors.bg, colors.text, 85)} />
      {DOME.map(([points, fill]) => (
        <polygon key={points} points={points} fill={fill} stroke={fill} strokeWidth="0.5" />
      ))}
      {CAPSULES.map(([x, y, c]) => <Capsule key={`${x},${y}`} x={x} y={y} color={c} />)}
      {/* shine on the glass */}
      <polygon points="64,50 80,36 72,64" fill={colors.text} opacity="0.35" />
      {/* lid */}
      <polygon points="88,12 112,12 116,22 84,22" fill={colors.gold} />
      {/* collar */}
      <polygon points="38,134 162,134 156,146 44,146" fill={mix(colors.accent, colors.text, 75)} />
      {BODY.map(([points, fill]) => (
        <polygon key={points} points={points} fill={fill} stroke={fill} strokeWidth="0.5" />
      ))}
      {/* crank */}
      <circle cx="100" cy="174" r="16" fill={colors.gold} />
      <polygon points="96,160 104,160 104,188 96,188" fill={mix(colors.gold, colors.bg, 60)} />
      {/* chute */}
      <polygon points="80,206 120,206 116,228 84,228" fill={colors.bg} />
      <path d="M90 228a10 10 0 0 1 20 0z" fill={colors.danger} />
    </svg>
  );
}
