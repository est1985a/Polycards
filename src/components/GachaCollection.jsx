import { useRef, useState } from 'react';
import { colors, fontDisplay, panel } from '../styles/theme';
import BackButton from './BackButton';
import { rarityInfo, rarityGlow, groupCollection, rarityCounts, tileState } from '../lib/gacha';
import AvatarPicture from './AvatarPicture';
import AvatarViewer from './AvatarViewer';
import { t } from '../i18n';

const tileBase = {
  position: "relative", boxSizing: "border-box", minHeight: 124, padding: "10px 6px", borderRadius: 16,
  background: colors.surface2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
};

// One avatar in the collection.
// Owned: picture and name, tap to wear it. Not owned: a dark silhouette with no name.
// Secret not owned: a locked ??? tile (the database sends no picture for these).
export function CollectionTile({ avatar, equipping = false, onEquip }) {
  const state = tileState(avatar);
  const info = rarityInfo(avatar.rarity);

  if (state === "secret") {
    return (
      <div data-tile="secret" style={{ ...tileBase, border: `2px dashed ${colors.line}` }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 30, color: colors.muted }}>???</div>
      </div>
    );
  }

  if (state === "silhouette") {
    return (
      <div data-tile="silhouette" aria-label={t("collection.notOwned")} style={{ ...tileBase, border: `2px solid ${colors.line}` }}>
        <AvatarPicture avatar={avatar} size={64} silhouette />
      </div>
    );
  }

  const worn = avatar.equipped;
  return (
    <button
      data-tile="owned"
      onClick={() => !worn && onEquip(avatar.id)}
      disabled={equipping}
      aria-pressed={worn}
      aria-label={t(worn ? "collection.wornLabel" : "collection.equipLabel", { nameJa: avatar.name_ja, nameEn: avatar.name_en })}
      style={{
        ...tileBase, cursor: worn ? "default" : "pointer", fontFamily: "inherit", color: colors.text,
        border: `2px solid ${worn ? colors.accent : info.color}`,
        boxShadow: avatar.rarity === "secret" ? rarityGlow("secret") : "none",
      }}
    >
      {worn && (
        <span
          style={{
            position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap",
            padding: "1px 8px", borderRadius: 10, background: colors.accent, color: colors.accentInk, fontSize: 11, fontWeight: 700,
          }}
        >
          {t("gacha.wearing")}
        </span>
      )}
      <AvatarPicture avatar={avatar} size={64} />
      <div style={{ fontSize: 13, lineHeight: 1.25 }}>{avatar.name_en}</div>
    </button>
  );
}

const avatarBox = {
  justifySelf: "center", boxSizing: "content-box", width: 150, height: 150, borderRadius: 24, background: colors.surface2,
  display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${colors.line}`,
};

// Small magnifier in the corner of the worn Polyavatar: "tap to see it large".
function MagnifierBadge() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute", right: -8, bottom: -8, width: 32, height: 32, borderRadius: "50%",
        background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <line x1="15.5" y1="15.5" x2="21" y2="21" />
      </svg>
    </span>
  );
}

// Left panel: the avatar being worn (tap it to see it large), then owned / total per rarity (Secret total is "?").
function SummaryPanel({ rows, equipped, onView, avatarRef }) {
  const info = equipped ? rarityInfo(equipped.rarity) : null;
  return (
    <div style={{ ...panel, display: "grid", gap: 14, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: colors.muted }}>{t("collection.wornAvatar")}</div>
      {equipped ? (
        <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
          <button
            ref={avatarRef}
            onClick={onView}
            aria-label={t("collection.viewLarge", { nameJa: equipped.name_ja, nameEn: equipped.name_en })}
            className="avatar-button"
            style={{ ...avatarBox, borderColor: info.color, position: "relative", padding: 0, cursor: "pointer", fontFamily: "inherit" }}
          >
            <AvatarPicture avatar={equipped} size={120} />
            <MagnifierBadge />
          </button>
          <div aria-hidden="true" style={{ fontSize: 12, color: colors.muted }}>{t("collection.tapToEnlarge")}</div>
        </div>
      ) : (
        <div style={avatarBox}>
          <AvatarPicture avatar={null} size={120} />
        </div>
      )}
      {equipped && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{equipped.name_en}</div>
          <div style={{ fontSize: 13, color: colors.muted }}>
            {info.stars && <span style={{ color: info.color, marginRight: 4 }}>{info.stars}</span>}
            {info.label}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 6, textAlign: "left" }}>
        {rarityCounts(rows).map(({ rarity, owned, total }) => {
          const r = rarityInfo(rarity);
          return (
            <div key={rarity} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>
                {r.stars && <span style={{ color: r.color, marginRight: 4 }}>{r.stars}</span>}
                {r.label}
              </span>
              <span style={{ fontFamily: fontDisplay, fontWeight: 700 }}>{owned} / {total ?? "?"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ポリアバター図鑑. rows: from gacha_collection (null while loading).
// wide: summary panel on the left, avatars on the right.
// from: where it was opened ("gacha" → ← ガチャ, "dashboard" → ← 戻る); onBack goes back there.
export default function GachaCollection({ rows, equippingId, onEquip, onBack, from = "gacha", wide = false }) {
  const owned = (rows || []).filter((r) => r.owned).length;
  const equipped = (rows || []).find((r) => r.equipped) || null;
  const [viewing, setViewing] = useState(false);
  const avatarRef = useRef(null);
  const closeViewer = () => { setViewing(false); avatarRef.current?.focus({ preventScroll: true }); };
  const summary = <SummaryPanel rows={rows} equipped={equipped} onView={() => setViewing(true)} avatarRef={avatarRef} />;

  const groups = (
    <div style={{ display: "grid", gap: 20, textAlign: "left" }}>
      {groupCollection(rows).map((s) => (
        <section key={s.series} style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{s.series}</h3>
          {s.groups.map((g) => {
              const r = rarityInfo(g.rarity);
              return (
                <div key={g.rarity} style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {r.stars && <span style={{ color: r.color, marginRight: 4 }}>{r.stars}</span>}
                    {r.label}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10, paddingTop: 6 }}>
                    {g.avatars.map((a) => (
                      <CollectionTile key={a.id} avatar={a} equipping={equippingId != null} onEquip={onEquip} />
                    ))}
                  </div>
                </div>
              );
            })}
        </section>
      ))}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <div>
        <BackButton label={t(from === "dashboard" ? "collection.backToDashboard" : "collection.back")} onClick={onBack} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 28 }}>{t("collection.title")}</h2>
        {rows && (
          <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: colors.gold }}>
            {owned} / {rows.length}
          </span>
        )}
      </div>
      {!rows ? (
        <div style={{ ...panel, color: colors.muted }}>{t("common.loading")}</div>
      ) : wide ? (
        <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 32, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 16 }}>{summary}</div>
          {groups}
        </div>
      ) : (
        <>
          {summary}
          {groups}
        </>
      )}
      {viewing && equipped && <AvatarViewer avatar={equipped} onClose={closeViewer} />}
    </div>
  );
}
