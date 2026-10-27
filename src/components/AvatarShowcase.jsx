import { colors, fontDisplay } from '../styles/theme';
import { rarityInfo, rarityGlow } from '../lib/gacha';
import AvatarPicture from './AvatarPicture';
import { t, getLang } from '../i18n';

// The big "revealed" look of one Polyavatar: rarity, the framed picture, ポリアバター and the names.
// Shared by the gacha reveal (isNew: NEW! badge) and the 図鑑's large view (AvatarViewer).
export default function AvatarShowcase({ avatar, isNew = false }) {
  const info = rarityInfo(avatar.rarity);
  return (
    <>
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
        {isNew && (
          <span
            style={{
              position: "absolute", top: -10, right: -10, padding: "2px 10px", borderRadius: 12,
              background: colors.danger, color: colors.dangerInk, fontFamily: fontDisplay, fontWeight: 700, fontSize: 14,
            }}
          >
            {t("gacha.new")}
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, color: colors.muted }}>{t("gacha.avatar")}</div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 28, lineHeight: 1.3 }}>{avatar.name_en}</div>
        {getLang() !== "en" && <div style={{ fontSize: 15, color: colors.muted }}>{avatar.name_ja}</div>}
      </div>
    </>
  );
}
