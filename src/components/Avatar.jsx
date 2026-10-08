import { colors } from '../styles/theme';

// Shade of the theme's "again" (danger) color, mixed toward surface2.
const shade = (pct) => `color-mix(in srgb, ${colors.danger} ${pct}%, ${colors.surface2})`;

// PLACEHOLDER: low-poly cat head. It will be replaced by unlockable poly models later,
// so keep the props simple (size in px; a `model` prop can be added then).
const TRIANGLES = [
  ["14,8 40,34 18,48", shade(100)],  // left ear
  ["21,20 35,35 22,42", shade(45)],  // left ear, inside
  ["86,8 82,48 60,34", shade(100)],  // right ear
  ["79,20 78,42 65,35", shade(45)],  // right ear, inside
  ["18,48 40,34 50,60", shade(80)],  // forehead, left
  ["40,34 60,34 50,60", shade(92)],  // forehead, middle
  ["60,34 82,48 50,60", shade(68)],  // forehead, right
  ["18,48 50,60 32,86", shade(62)],  // left cheek
  ["82,48 68,86 50,60", shade(52)],  // right cheek
  ["32,86 50,60 68,86", shade(76)],  // muzzle
];

export default function Avatar({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="アバター (Avatar)">
      {TRIANGLES.map(([points, fill]) => (
        <polygon key={points} points={points} fill={fill} stroke={fill} strokeWidth="0.5" strokeLinejoin="round" />
      ))}
      {/* eyes and nose */}
      <polygon points="33,52 42,55 35,59" fill={colors.dangerInk} />
      <polygon points="67,52 65,59 58,55" fill={colors.dangerInk} />
      <polygon points="46,68 54,68 50,73" fill={colors.dangerInk} />
    </svg>
  );
}
