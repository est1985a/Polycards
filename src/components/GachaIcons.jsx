import { colors, mix } from '../styles/theme';
import { themes, themeVars } from '../themes';
import { pumpkinColor } from '../lib/gacha';

// Small gacha icons, drawn with the current text color (currentColor).

// Capsule: a pill split in two halves, the top half solid.
export function CapsuleIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 12a6 6 0 0 1 12 0z" fill="currentColor" />
      <path d="M6 12h12a6 6 0 0 1-12 0z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

// Ticket: a rectangle with a notch on each side.
export function TicketIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
      />
      <path d="M15 8v8" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
    </svg>
  );
}

// Pumpkin for the Halloween event (sign, odds, event mark). Always in Midnight colors, whatever
// the theme (like LogoMark): the body is Midnight's gold mixed with its danger (there is no orange
// role), the stem and leaf its accent. flexShrink 0 so a flex row never squashes it.
export function PumpkinIcon({ size = 22 }) {
  const body = pumpkinColor;
  const shade = mix(colors.gold, colors.danger, 50);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ ...themeVars(themes.midnight), flexShrink: 0 }}>
      <path d="M12 6.5c-1-1.8-1.2-3-.6-4.5l1.8.5c-.5 1.2-.3 2.3.3 3.6z" fill={colors.accent} />
      <path d="M13.2 5.5c1.6-1.6 3.6-1.8 5-1-1.2 1.6-3 2.2-5 1.6z" fill={colors.accent} />
      <ellipse cx="7.5" cy="14" rx="5.5" ry="7" fill={shade} />
      <ellipse cx="16.5" cy="14" rx="5.5" ry="7" fill={shade} />
      <ellipse cx="12" cy="14" rx="5" ry="7.5" fill={body} />
      <path d="M8 12.5l1.6-2 1.6 2zM12.8 12.5l1.6-2 1.6 2zM8.5 16c1.5 1.4 5.5 1.4 7 0l-1.2 1.6-1.1-.8-1.2 1-1.2-1-1.1.8z" fill={colors.bg} />
    </svg>
  );
}
