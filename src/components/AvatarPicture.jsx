import { colors, fontDisplay, mix, tintLight, tintDark } from '../styles/theme';
import { rarityInfo, sparkleLayout, specialColor } from '../lib/gacha';
import Avatar from './Avatar';
import LogoMark from './LogoMark';
import { t } from '../i18n';

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

// Placeholder for a Special Polyavatar with no picture yet: a low-poly plate in its metal
// (bronze, silver, gold, platinum, diamond), lit from the top left, with the Polyvo logo on it.
const METAL = [
  ["50,4 82,18 50,50", tintLight, 55],
  ["82,18 96,50 50,50", tintLight, 80],
  ["96,50 82,82 50,50", tintDark, 78],
  ["82,82 50,96 50,50", tintDark, 62],
  ["50,96 18,82 50,50", tintDark, 72],
  ["18,82 4,50 50,50", tintDark, 88],
  ["4,50 18,18 50,50", tintLight, 70],
  ["18,18 50,4 50,50", tintLight, 45],
];

function SpecialPlaceholder({ metal, size, hide, label }) {
  return (
    <span role="img" aria-label={label} style={{ position: "relative", display: "block", width: size, height: size, ...hide }}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: "block" }}>
        {METAL.map(([points, tint, pct]) => {
          const fill = mix(metal, tint, pct);
          return <polygon key={points} points={points} fill={fill} stroke={fill} strokeWidth="0.5" strokeLinejoin="round" />;
        })}
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LogoMark height={size * 0.46} />
      </span>
    </span>
  );
}

function Picture({ avatar, size, silhouette, label }) {
  const hide = silhouette ? { filter: "brightness(0)", opacity: 0.55 } : null;

  if (avatar?.image_url) {
    return (
      <img
        src={avatar.image_url} alt={silhouette ? "" : label ?? (avatar.name_en || "")} width={size} height={size}
        style={{ position: "relative", width: size, height: size, objectFit: "contain", borderRadius: size * 0.18, display: "block", ...hide }}
      />
    );
  }

  if (!avatar || avatar.slug === "cat") {
    return <span style={{ position: "relative", display: "flex", ...hide }}><Avatar size={size} /></span>;
  }

  const metal = specialColor(avatar);
  if (metal) {
    const name = silhouette ? t("collection.silhouetteLabel") : label ?? (avatar.name_en || t("gacha.avatarFallback"));
    return <SpecialPlaceholder metal={metal} size={size} hide={hide} label={name} />;
  }

  const tint = rarityInfo(avatar.rarity).color;
  const letter = silhouette ? "" : (Array.from(avatar.name_en || "")[0] || "").toUpperCase();
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100" style={{ position: "relative", display: "block", ...hide }}
      role="img" aria-label={silhouette ? t("collection.silhouetteLabel") : label ?? (avatar.name_en || t("gacha.avatarFallback"))}
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
// label: alt text instead of the English name (the class leaderboard gets no names: ポリアバター).
// Rare and up get twinkling sparkles (Super Rare and Secret also a soft glow), unless
// silhouette is set or sparkles={false}. Sparkles are decoration only: hidden from
// screen readers and never block taps.
export default function AvatarPicture({ avatar, size = 80, silhouette = false, sparkles = true, label = null }) {
  const rarity = avatar?.rarity;
  const stars = silhouette || !sparkles ? [] : sparkleLayout(rarity);
  const glow = stars.length > 0 ? GLOW[rarity] : null;
  const metal = specialColor(avatar);
  // A Special: no stars (its art has its own), only a soft still glow in its metal color.
  const metalGlow = metal && !silhouette && sparkles
    ? `radial-gradient(circle, color-mix(in srgb, ${metal} 30%, transparent) 0%, transparent 68%)` : null;
  const color = metal || rarityInfo(rarity).color;

  return (
    <span style={{ position: "relative", display: "block", width: size, height: size, flexShrink: 0 }}>
      {glow && (
        <span aria-hidden="true" className={glow} style={{ position: "absolute", inset: "-8%", borderRadius: "50%", pointerEvents: "none" }} />
      )}
      {metalGlow && (
        <span aria-hidden="true" data-special-glow="" style={{ position: "absolute", inset: "-8%", borderRadius: "50%", pointerEvents: "none", background: metalGlow }} />
      )}
      <Picture avatar={avatar} size={size} silhouette={silhouette} label={label ?? undefined} />
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
