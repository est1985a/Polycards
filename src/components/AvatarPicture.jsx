import { colors, fontDisplay } from '../styles/theme';
import { rarityInfo, sparkleLayout } from '../lib/gacha';
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

// 4-point star for the rarity sparkles (viewBox 0 0 20 20).
const STAR = "M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8 Z";
const GLOW = { super_rare: "rarity-glow-super", secret: "rarity-glow-secret" };

function Picture({ avatar, size, silhouette }) {
  const hide = silhouette ? { filter: "brightness(0)", opacity: 0.55 } : null;

  if (avatar?.image_url) {
    return (
      <img
        src={avatar.image_url} alt={silhouette ? "" : avatar.name_en || ""} width={size} height={size}
        style={{ position: "relative", width: size, height: size, objectFit: "contain", borderRadius: size * 0.18, display: "block", ...hide }}
      />
    );
  }

  if (!avatar || avatar.slug === "cat") {
    return <span style={{ position: "relative", display: "flex", ...hide }}><Avatar size={size} /></span>;
  }

  const tint = rarityInfo(avatar.rarity).color;
  const letter = silhouette ? "" : (Array.from(avatar.name_en || "")[0] || "").toUpperCase();
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100" style={{ position: "relative", display: "block", ...hide }}
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

// One avatar picture, used by PlayerStats, the gacha reveal and the collection.
// avatar: { slug, name_en, rarity, image_url } (null = the starter cat).
// silhouette: a dark shape with no letter, for avatars the student doesn't have yet.
// Rare and up get twinkling sparkles (Super Rare and Secret also a soft glow), unless
// silhouette is set or sparkles={false}. Sparkles are decoration only: hidden from
// screen readers and never block taps.
export default function AvatarPicture({ avatar, size = 80, silhouette = false, sparkles = true }) {
  const rarity = avatar?.rarity;
  const stars = silhouette || !sparkles ? [] : sparkleLayout(rarity);
  const glow = stars.length > 0 ? GLOW[rarity] : null;
  const color = rarityInfo(rarity).color;

  return (
    <span style={{ position: "relative", display: "block", width: size, height: size, flexShrink: 0 }}>
      {glow && (
        <span aria-hidden="true" className={glow} style={{ position: "absolute", inset: "-8%", borderRadius: "50%", pointerEvents: "none" }} />
      )}
      <Picture avatar={avatar} size={size} silhouette={silhouette} />
      {stars.map(([x, y, f, delay]) => (
        <span
          key={`${x},${y}`} aria-hidden="true" className="rarity-sparkle"
          style={{
            position: "absolute", left: `${x}%`, top: `${y}%`, width: size * f, height: size * f,
            transform: "translate(-50%, -50%)", color, pointerEvents: "none",
          }}
        >
          <svg viewBox="0 0 20 20" width="100%" height="100%" className="rarity-sparkle-star" style={{ animationDelay: `${delay}s` }}>
            <path d={STAR} fill="currentColor" />
          </svg>
        </span>
      ))}
    </span>
  );
}
