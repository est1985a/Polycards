import { useState, useEffect } from 'react';
import { colors, fontDisplay, fontBody, btnGhost } from '../styles/theme';
import { rarityInfo, rarityGlow } from '../lib/gacha';
import AvatarPicture from './AvatarPicture';

const ANIMATION_MS = 2000;

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The capsule drops, wobbles and pops open in the rarity color (classes in src/index.css).
function CapsuleDrop({ color }) {
  return (
    <div style={{ position: "relative", width: 160, height: 160 }} aria-hidden="true">
      <div className="gacha-burst" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }} />
      <div className="gacha-capsule" style={{ position: "absolute", inset: 0 }}>
        <svg viewBox="0 0 100 100" width="160" height="160" style={{ overflow: "visible" }}>
          <g className="gacha-half-top">
            <path d="M18 50a32 32 0 0 1 64 0z" fill={color} />
            <polygon points="30,30 46,22 38,44" fill={colors.text} opacity="0.3" />
          </g>
          <g className="gacha-half-bottom">
            <path d="M18 50h64a32 32 0 0 1-64 0z" fill={`color-mix(in srgb, ${colors.text} 85%, ${colors.surface2})`} />
          </g>
        </svg>
      </div>
    </div>
  );
}

// Full-screen reveal after a pull: a short capsule animation (tap to skip), then the new avatar.
// result: { avatar, tickets_left } from gacha_pull. equipped: this avatar is already worn.
export default function GachaReveal({ result, equipped, equipping, pulling, onEquip, onAgain, onClose }) {
  const { avatar, tickets_left: ticketsLeft } = result;
  const info = rarityInfo(avatar.rarity);
  const [showCard, setShowCard] = useState(reducedMotion);

  useEffect(() => {
    if (showCard) return;
    const timer = setTimeout(() => setShowCard(true), ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [showCard]);

  return (
    <div
      role="dialog" aria-modal="true" aria-label="ガチャの結果"
      onClick={showCard ? undefined : () => setShowCard(true)}
      style={{
        position: "fixed", inset: 0, zIndex: 40, overflowY: "auto",
        background: `color-mix(in srgb, ${colors.bg} 94%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box",
        fontFamily: fontBody, color: colors.text,
      }}
    >
      {!showCard ? (
        <div style={{ display: "grid", justifyItems: "center", gap: 24, cursor: "pointer" }}>
          <CapsuleDrop color={info.color} />
          <div style={{ fontSize: 13, color: colors.muted }}>タップでスキップ</div>
        </div>
      ) : (
        <div
          className="gacha-reveal-in"
          style={{
            width: "100%", maxWidth: 380, boxSizing: "border-box", textAlign: "center",
            background: colors.surface, border: `2px solid ${info.color}`, borderRadius: 24, padding: 24,
            boxShadow: rarityGlow(avatar.rarity), display: "grid", gap: 14,
          }}
        >
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.text }}>
            {info.stars && <span style={{ color: info.color, marginRight: 6 }}>{info.stars}</span>}
            {info.label}
          </div>

          <div
            style={{
              position: "relative", justifySelf: "center", width: 200, height: 200, borderRadius: 28,
              background: colors.surface2, border: `2px solid ${info.color}`, boxShadow: rarityGlow(avatar.rarity),
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <AvatarPicture avatar={avatar} size={160} />
            <span
              style={{
                position: "absolute", top: -10, right: -10, padding: "2px 10px", borderRadius: 12,
                background: colors.danger, color: colors.dangerInk, fontFamily: fontDisplay, fontWeight: 700, fontSize: 14,
              }}
            >
              NEW!
            </span>
          </div>

          <div>
            <div style={{ fontSize: 12, color: colors.muted }}>アバター</div>
            <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 28, lineHeight: 1.3 }}>{avatar.name_en}</div>
            <div style={{ fontSize: 15, color: colors.muted }}>{avatar.name_ja}</div>
          </div>

          <button
            onClick={() => onEquip(avatar.id)}
            disabled={equipped || equipping}
            style={{
              minHeight: 48, borderRadius: 14, border: "none", cursor: equipped ? "default" : "pointer",
              background: equipped ? colors.surface2 : colors.accent, color: equipped ? colors.muted : colors.accentInk,
              fontWeight: 700, fontSize: 17,
            }}
          >
            {equipped ? "つけ中" : equipping ? "つけています…" : "つける"}
          </button>
          {ticketsLeft > 0 && (
            <button
              onClick={onAgain}
              disabled={pulling}
              style={{
                minHeight: 48, borderRadius: 14, border: "none", cursor: "pointer",
                background: colors.gold, color: colors.bg, fontWeight: 700, fontSize: 17,
              }}
            >
              もう一回 <span style={{ fontSize: 13 }}>(のこり 券 {ticketsLeft}枚)</span>
            </button>
          )}
          <button onClick={onClose} style={{ ...btnGhost, minHeight: 44 }}>とじる</button>
        </div>
      )}
    </div>
  );
}
