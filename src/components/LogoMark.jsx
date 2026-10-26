import { colors, mix, tintLight, tintDark } from '../styles/theme';
import { themes, themeVars } from '../themes';

// Polycards logo: two low-poly landscape cards. Front card = accent, back card = danger.
// Always in Midnight colors (mint + pink), whatever the theme: Midnight's CSS variables are set on
// the svg itself (like ThemePreview's box). 16 facets, light from the top left. Same picture as public/favicon.svg.
const FACETS = [
  ["52.7,23.5 16.1,10.7 71.3,1.0", mix(colors.danger, tintLight, 81)],
  ["52.7,23.5 71.3,1.0 77.1,5.0", mix(colors.danger, tintDark, 94)],
  ["52.7,23.5 77.1,5.0 83.3,40.5", mix(colors.danger, tintDark, 78)],
  ["52.7,23.5 83.3,40.5 79.3,46.3", mix(colors.danger, tintDark, 70)],
  ["52.7,23.5 79.3,46.3 24.1,56.0", mix(colors.danger, tintDark, 78)],
  ["52.7,23.5 24.1,56.0 18.3,52.0", mix(colors.danger, tintDark, 95)],
  ["52.7,23.5 18.3,52.0 12.1,16.5", mix(colors.danger, tintLight, 93)],
  ["52.7,23.5 12.1,16.5 16.1,10.7", mix(colors.danger, tintLight, 84)],
  ["25.5,38.3 10.3,20.6 67.9,26.7", mix(colors.accent, tintLight, 99)],
  ["25.5,38.3 67.9,26.7 72.4,32.2", mix(colors.accent, tintDark, 79)],
  ["25.5,38.3 72.4,32.2 68.6,68.0", mix(colors.accent, tintDark, 67)],
  ["25.5,38.3 68.6,68.0 63.1,72.4", mix(colors.accent, tintDark, 62)],
  ["25.5,38.3 63.1,72.4 5.5,66.3", mix(colors.accent, tintDark, 67)],
  ["25.5,38.3 5.5,66.3 1.0,60.8", mix(colors.accent, tintDark, 98)],
  ["25.5,38.3 1.0,60.8 4.8,25.0", mix(colors.accent, tintLight, 79)],
  ["25.5,38.3 4.8,25.0 10.3,20.6", mix(colors.accent, tintLight, 62)],
];

// style: extra CSS, e.g. a width/height in other units (CSS sizes win over the height attribute).
export default function LogoMark({ height = 24, style }) {
  return (
    <svg height={height} width={Math.round(height * 84.3 / 73.4)} viewBox="0 0 84.3 73.4" aria-hidden="true" style={{ ...themeVars(themes.midnight), flexShrink: 0, ...style }}>
      {FACETS.map(([points, fill], i) => (
        <polygon key={i} points={points} fill={fill} stroke={fill} strokeWidth="0.5" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
