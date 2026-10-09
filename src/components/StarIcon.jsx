import { colors } from '../styles/theme';

// Gold star for Mastered cards (inline SVG, decorative: the text next to it says "Mastered").
export default function StarIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
        fill={colors.gold}
        stroke={colors.gold}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
