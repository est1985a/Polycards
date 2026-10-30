import { colors, fontDisplay, mix, panel } from '../styles/theme';
import { medal } from '../lib/classTab';
import AvatarPicture from './AvatarPicture';
import { t, tx } from '../i18n';

// Medal colors from theme roles only: gold, a silver between muted and text, a bronze between gold and danger.
const MEDAL = {
  gold: colors.gold,
  silver: mix(colors.muted, colors.text, 70),
  bronze: mix(colors.gold, colors.danger, 55),
};

// The rank as a round badge: filled with the medal color for 1st–3rd, plain for the rest.
function RankBadge({ rank, size = 36 }) {
  const m = medal(rank);
  return (
    <span
      aria-label={t("leaderboard.rank", { n: rank })}
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center",
        boxSizing: "border-box", fontFamily: fontDisplay, fontWeight: 700, fontSize: size * 0.45,
        fontVariantNumeric: "tabular-nums",
        background: m ? MEDAL[m] : colors.surface2, color: m ? colors.bg : colors.muted,
        border: m ? "none" : `2px solid ${colors.line}`,
      }}
    >
      {rank}
    </span>
  );
}

// One row: rank, Polyavatar (picture only, no name), nickname, reviews. My row has an accent border.
function BoardRow({ row }) {
  const m = medal(row.rank);
  return (
    <li
      data-board-row=""
      style={{
        display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "6px 12px", borderRadius: 14,
        background: colors.surface2, boxSizing: "border-box",
        border: `2px solid ${row.is_me ? colors.accent : m ? MEDAL[m] : "transparent"}`,
      }}
    >
      <RankBadge rank={row.rank} />
      <AvatarPicture avatar={row.avatar} size={40} label={t("leaderboard.avatarAlt")} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.nickname}
        </span>
        {row.is_me && (
          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: colors.accent, color: colors.accentInk }}>
            {t("leaderboard.you")}
          </span>
        )}
      </span>
      <span style={{ flexShrink: 0, fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: colors.gold, fontVariantNumeric: "tabular-nums" }}>
        {t("leaderboard.reviews", { n: row.reviews })}
      </span>
    </li>
  );
}

// "あなたは 14位（32回）", or the encouraging line with 0 reviews. Never says how many are below.
export function MyPlace({ me }) {
  if (!me) return null;
  const ranked = me.rank != null && me.reviews > 0;
  return (
    <div
      role="status"
      style={{
        padding: "12px 14px", borderRadius: 14, border: `2px dashed ${colors.accent}`, fontSize: 16, fontWeight: 700,
        color: colors.text, textAlign: "center",
      }}
    >
      {ranked
        ? tx("leaderboard.myPlace", {
          rank: <span style={{ fontFamily: fontDisplay, color: colors.accentText }}>{me.rank}</span>,
          n: <span style={{ fontFamily: fontDisplay, color: colors.gold }}>{me.reviews}</span>,
          count: me.reviews,
        })
        : t("leaderboard.myZero")}
    </div>
  );
}

// 先週のトップ3: small avatars with a medal, the nickname and the reviews. Nothing when last week was empty.
export function LastWeek({ rows }) {
  if (!rows?.length) return null;
  return (
    <section aria-labelledby="leaderboard-last-week" style={{ display: "grid", gap: 8 }}>
      <h4 id="leaderboard-last-week" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.muted }}>{t("leaderboard.lastWeek")}</h4>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {rows.map((r) => (
          <li
            key={`${r.rank}|${r.nickname}`}
            style={{
              display: "grid", justifyItems: "center", gap: 4, padding: "8px 4px", borderRadius: 12, background: colors.surface2,
              minWidth: 0, textAlign: "center",
            }}
          >
            <span style={{ position: "relative" }}>
              <AvatarPicture avatar={r.avatar} size={36} sparkles={false} label={t("leaderboard.avatarAlt")} />
              <span style={{ position: "absolute", right: -10, bottom: -6 }}><RankBadge rank={r.rank} size={22} /></span>
            </span>
            <span style={{ maxWidth: "100%", fontSize: 13, fontWeight: 700, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.nickname}
            </span>
            <span style={{ fontSize: 12, color: colors.muted }}>{t("leaderboard.reviews", { n: r.reviews })}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// The weekly class leaderboard (クラス tab and the teacher's ランキング view).
// board: class_leaderboard() ({ top, me, last_week }). viewer: 'student' | 'teacher' (no "my place").
// Effort only: reviews this week, never accuracy, levels or EXP.
export default function ClassLeaderboard({ board, viewer = "student", wide = false }) {
  const top = board?.top ?? [];
  return (
    <section style={{ ...panel, display: "grid", gap: 14, alignContent: "start" }} aria-labelledby="leaderboard-title">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 id="leaderboard-title" style={{ margin: 0, fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, color: colors.text }}>
          {t("leaderboard.title")}
        </h3>
        <span style={{ fontSize: 13, color: colors.muted }}>{t("leaderboard.resets")}</span>
      </div>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: wide ? "minmax(0, 1fr) 260px" : "minmax(0, 1fr)", alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          {top.length === 0 ? (
            <div style={{ fontSize: 15, color: colors.muted }}>{t("leaderboard.empty")}</div>
          ) : (
            <ol aria-label={t("leaderboard.title")} style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
              {top.map((row) => <BoardRow key={`${row.rank}|${row.nickname}`} row={row} />)}
            </ol>
          )}
          {viewer === "student" && <MyPlace me={board?.me} />}
        </div>
        <LastWeek rows={board?.last_week} />
      </div>
    </section>
  );
}
