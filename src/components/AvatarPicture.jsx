import { colors, fontDisplay } from '../styles/theme';
import { rarityInfo } from '../lib/gacha';
import Avatar from './Avatar';

// Placeholder blob: a low-poly round shape tinted with the rarity color.
const shade = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, ${colors.surface2})`;
const BLOB = [
  ["50,10 78,22 50,50", 95],
  ["78,22 90,50 50,50", 75],
  ["90,50 78,78 50,50", 60],
  ["78,78 50,90 50,50", 80],
  ["50,90 22,78 50,50", 65],
  ["22,78 10,50 50,50", 85],
  ["10,50 22,22 50,50", 70],
  ["22,22 50,10 50,50", 55],
];

// One avatar picture, used by PlayerStats, the gacha reveal and the collection.
// avatar: { slug, name_en, rarity, image_url } (null = the starter cat).
// silhouette: a dark shape with no letter, for avatars the student doesn't have yet.
export default function AvatarPicture({ avatar, size = 80, silhouette = false }) {
  const hide = silhouette ? { filter: "brightness(0)", opacity: 0.55 } : null;

  if (avatar?.image_url) {
    return (
      <img
        src={avatar.image_url} alt={silhouette ? "" : avatar.name_en || ""} width={size} height={size}
        style={{ width: size, height: size, objectFit: "contain", borderRadius: size * 0.18, display: "block", ...hide }}
      />
    );
  }

  if (!avatar || avatar.slug === "cat") {
    return <span style={{ display: "flex", ...hide }}><Avatar size={size} /></span>;
  }

  const tint = rarityInfo(avatar.rarity).color;
  const letter = silhouette ? "" : (Array.from(avatar.name_en || "")[0] || "").toUpperCase();
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", ...hide }}
      role="img" aria-label={silhouette ? "？" : avatar.name_en || "アバター"}
    >
      {BLOB.map(([points, pct]) => (
        <polygon key={points} points={points} fill={shade(tint, pct)} stroke={shade(tint, pct)} strokeWidth="0.5" strokeLinejoin="round" />
      ))}
      {letter && (
        <text
          x="50" y="52" textAnchor="middle" dominantBaseline="central"
          fontFamily={fontDisplay} fontWeight="700" fontSize="34" fill={colors.text}
        >
          {letter}
        </text>
      )}
    </svg>
  );
}
