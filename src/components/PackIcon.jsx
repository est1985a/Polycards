import { useId } from 'react';
import { colors, mix, tintLight } from '../styles/theme';
import { PACK_BODY, PACK_STRIP } from '../lib/packShape';
import { themes, themeVars } from '../themes';
import LogoMark from './LogoMark';

// Small emblems in the middle of the pack.
function Emblem({ kind }) {
  if (kind === "diamond") {
    return (
      <>
        <polygon points="60,72 74,88 60,104 46,88" fill={colors.gold} />
        <polygon points="60,72 74,88 60,88" fill={mix(colors.gold, colors.text, 75)} />
      </>
    );
  }
  if (kind === "book") {
    // An open book (light pages, a gold spine) on a small gold plate. Pages are mixed with white,
    // not a theme surface, so they read as paper in dark and light themes alike.
    return (
      <>
        <polygon points="30,66 90,66 96,92 90,118 30,118 24,92" fill={colors.gold} />
        <polygon points="30,66 90,66 60,92" fill={mix(colors.gold, colors.text, 75)} />
        <polygon points="34,78 60,84 60,110 34,104" fill={mix(tintLight, colors.gold, 92)} />
        <polygon points="60,84 86,78 86,104 60,110" fill={mix(tintLight, colors.gold, 72)} />
        <line x1="60" y1="84" x2="60" y2="110" stroke={mix(colors.gold, colors.text, 55)} strokeWidth="3" />
      </>
    );
  }
  if (kind === "logo") {
    // The Polycards logo on a dark plate. The plate and the logo are always in Midnight colors
    // (Midnight's variables are set on the group, like LogoMark does on its own svg), so the
    // mint / pink logo stands out on the gold pack in every theme.
    return (
      <g style={themeVars(themes.midnight)}>
        <polygon points="30,66 90,66 96,92 90,118 30,118 24,92" fill={colors.surface2} stroke={colors.gold} strokeWidth="3" strokeLinejoin="round" />
        <g transform="translate(37 72)"><LogoMark height={40} /></g>
      </g>
    );
  }
  return null;
}

// The foil pack: low-poly body in `tint`, a crimped strip at the top in `strip`, an emblem, and a
// shine stripe. Drawn on a 120 × 160 grid; width/height scale it.
// stripClass / shineClass: animation classes for the pack opening (strip tearing off, shine sweep).
export default function PackIcon({
  tint = colors.accent, strip = colors.gold, emblem = "diamond", width = 120, height = 160,
  stripClass, shineClass, style,
}) {
  const clip = useId();
  const body = [
    ["4,22 116,22 60,64", mix(tint, colors.surface, 75)],
    ["4,22 60,64 4,104", mix(tint, colors.surface, 55)],
    ["116,22 116,104 60,64", mix(tint, colors.surface, 90)],
    ["4,104 60,64 60,150", mix(tint, colors.bg, 70)],
    ["60,64 116,104 60,150", mix(tint, colors.surface, 65)],
    ["4,104 60,150 4,150", mix(tint, colors.bg, 50)],
    ["116,104 116,150 60,150", mix(tint, colors.bg, 80)],
  ];
  return (
    <svg viewBox="0 0 120 160" width={width} height={height} aria-hidden="true" style={{ overflow: "visible", display: "block", ...style }}>
      <defs>
        <clipPath id={clip}><polygon points={PACK_BODY} /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {body.map(([points, fill]) => <polygon key={points} points={points} fill={fill} stroke={fill} strokeWidth="0.5" />)}
        <Emblem kind={emblem} />
        <polygon className={shineClass} points="20,22 44,22 4,150 -20,150" fill={mix(colors.text, "transparent", 30)} />
      </g>
      <line x1="4" y1="22" x2="116" y2="22" stroke={colors.surface} strokeWidth="1.5" strokeDasharray="4 3" />
      <g className={stripClass}>
        <polygon points={PACK_STRIP} fill={mix(strip, colors.surface, 80)} />
      </g>
    </svg>
  );
}
