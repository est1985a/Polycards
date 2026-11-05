import { useId } from 'react';
import { colors, fontDisplay, mix, panel } from '../styles/theme';
import { medal } from '../lib/classTab';
import { HANDWRITING_ENABLED } from '../handwriting/config.js';
import AvatarPicture from './AvatarPicture';
import { KeyboardIcon, PencilIcon } from './ReviewModeToggle';
import { t, tx } from '../i18n';

// Medal colors from theme roles only: gold, a silver between muted and text, a bronze between gold and danger.
const MEDAL = {
  gold: colors.gold,
  silver: mix(colors.muted, colors.text, 70),
  bronze: mix(colors.gold, colors.danger, 55),
};

// A row's number: `count` on the new boards, `reviews` on the old reviews board.
const rowCount = (row) => row.count ?? row.reviews ?? 0;

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

function YouBadge() {
  return (
    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: colors.accent, color: colors.accentInk }}>
      {t("leaderboard.you")}
    </span>
  );
}

// One row: rank, Polyavatar (picture only, no name), nickname, the count. My row has an accent border.
// unitKey: how the count reads (leaderboard.reviews {n}回 / leaderboard.words {n}語).
function BoardRow({ row, unitKey = "leaderboard.reviews" }) {
  const m = medal(row.rank);
  const n = rowCount(row);
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
        {row.is_me && <YouBadge />}
      </span>
      <span style={{ flexShrink: 0, fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: colors.gold, fontVariantNumeric: "tabular-nums" }}>
        {t(unitKey, { n, count: n })}
      </span>
    </li>
  );
}

// ＋N人 同点: tied students the board had no room for (the database shows at most 7 / 5 rows).
function TiedMore({ n }) {
  if (!n) return null;
  return <div data-tied-more="" style={{ fontSize: 14, fontWeight: 700, color: colors.muted, textAlign: "center" }}>{t("leaderboard.tiedMore", { n, count: n })}</div>;
}

const placeBox = {
  padding: "12px 14px", borderRadius: 14, border: `2px dashed ${colors.accent}`, fontSize: 16, fontWeight: 700,
  color: colors.text, textAlign: "center",
};

// Old reviews board: "あなたは 14位（32回）", or the encouraging line with 0 reviews. Never says how many are below.
export function MyPlace({ me }) {
  if (!me) return null;
  const ranked = me.rank != null && me.reviews > 0;
  return (
    <div role="status" style={placeBox}>
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

// Typing / handwriting board: "あなたは 3位（12語）", or how to get on it (the answer mode is off by default,
// so the zero line names the real switch: My Deck's 答え方 and the review's top-right toggle).
export function ModePlace({ me, kind }) {
  if (!me) return null;
  const ranked = me.rank != null && me.count > 0;
  return (
    <div style={{ ...placeBox, fontSize: ranked ? 16 : 14 }}>
      {ranked
        ? tx("leaderboard.myPlaceWords", {
          rank: <span style={{ fontFamily: fontDisplay, color: colors.accentText }}>{me.rank}</span>,
          n: <span style={{ fontFamily: fontDisplay, color: colors.gold }}>{me.count}</span>,
          count: me.count,
        })
        : t(kind === "handwriting" ? "leaderboard.myZeroHandwriting" : "leaderboard.myZeroTyping", {
          deck: t("tabs.myCards"),
          setting: t("answerMode.title"),
          mode: t(kind === "handwriting" ? "answerMode.handwriting" : "answerMode.typing"),
        })}
    </div>
  );
}

// 先週のトップ3: small avatars with a medal, the nickname and the count. Nothing when last week was empty.
export function LastWeek({ rows, unitKey = "leaderboard.reviews" }) {
  const id = useId();
  if (!rows?.length) return null;
  return (
    <section aria-labelledby={id} style={{ display: "grid", gap: 8 }}>
      <h4 id={id} style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.muted }}>{t("leaderboard.lastWeek")}</h4>
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
            <span style={{ fontSize: 12, color: colors.muted }}>{t(unitKey, { n: rowCount(r), count: rowCount(r) })}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const MODES = {
  typing: { title: "leaderboard.typingTitle", hint: "leaderboard.typingHint", Icon: KeyboardIcon },
  handwriting: { title: "leaderboard.handwritingTitle", hint: "leaderboard.handwritingHint", Icon: PencilIcon },
};

// One main board (タイピング or 手書き): correct spellings this week, top 5 (+ ties), my place, last week.
function ModeBoard({ kind, data, viewer }) {
  const id = useId();
  const { title, hint, Icon } = MODES[kind];
  return (
    <section data-board={kind} aria-labelledby={id} style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 0 }}>
      <div style={{ display: "grid", gap: 2 }}>
        <h4 id={id} style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, color: colors.text }}>
          <span style={{ color: colors.accentText, display: "inline-flex" }}><Icon /></span>
          {t(title)}
        </h4>
        <span style={{ fontSize: 13, color: colors.muted }}>{t(hint)}</span>
      </div>
      {data.top.length === 0 ? (
        <div style={{ fontSize: 15, color: colors.muted }}>{t("leaderboard.emptyMode")}</div>
      ) : (
        <ol aria-labelledby={id} style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
          {data.top.map((row) => <BoardRow key={`${row.rank}|${row.nickname}`} row={row} unitKey="leaderboard.words" />)}
        </ol>
      )}
      <TiedMore n={data.more} />
      {viewer === "student" && <ModePlace me={data.me} kind={kind} />}
      <LastWeek rows={data.last_week} unitKey="leaderboard.words" />
    </section>
  );
}

// 復習回数: kept small on purpose (reviews are easy to pile up by tapping). Top 3 (+ ties), my place in one line.
// strip: wide screen with both boards: a full-width strip under them, the rows side by side.
function ReviewsSide({ data, viewer, strip = false }) {
  const id = useId();
  const me = data.me;
  return (
    <section
      data-board="reviews"
      aria-labelledby={id}
      style={{
        display: "grid", gap: 8, alignContent: "start", padding: 12, borderRadius: 14, border: `2px solid ${colors.line}`, minWidth: 0,
        ...(strip ? { gridColumn: "1 / -1" } : null),
      }}
    >
      <h4 id={id} style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.muted }}>{t("leaderboard.reviewsTitle")}</h4>
      {data.top.length === 0 ? (
        <div style={{ fontSize: 13, color: colors.muted }}>{t("leaderboard.emptyReviews")}</div>
      ) : (
        <ol
          aria-labelledby={id}
          style={{
            listStyle: "none", margin: 0, padding: 0, display: "grid", gap: strip ? "6px 20px" : 6,
            gridTemplateColumns: strip ? "repeat(auto-fill, minmax(190px, 1fr))" : "minmax(0, 1fr)",
          }}
        >
          {data.top.map((r) => (
            <li key={`${r.rank}|${r.nickname}`} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, fontSize: 14 }}>
              <RankBadge rank={r.rank} size={24} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 700, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nickname}</span>
                {r.is_me && <YouBadge />}
              </span>
              <span style={{ flexShrink: 0, color: colors.muted, fontVariantNumeric: "tabular-nums" }}>
                {t("leaderboard.reviews", { n: rowCount(r), count: rowCount(r) })}
              </span>
            </li>
          ))}
        </ol>
      )}
      <TiedMore n={data.more} />
      {viewer === "student" && me && (
        <div style={{ fontSize: 13, color: colors.muted }}>
          {me.rank != null && me.count > 0
            ? t("leaderboard.myPlaceShort", { rank: me.rank, n: me.count, count: me.count })
            : t("leaderboard.myZeroShort")}
        </div>
      )}
    </section>
  );
}

function BoardHeader() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
      <h3 id="leaderboard-title" style={{ margin: 0, fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, color: colors.text }}>
        {t("leaderboard.title")}
      </h3>
      <span style={{ fontSize: 13, color: colors.muted }}>{t("leaderboard.resets")}</span>
    </div>
  );
}

// The old board (reviews, top 10): only while polycards-class-ranking-modes.sql hasn't been run.
function ReviewsBoard({ board, viewer, wide }) {
  const top = board?.top ?? [];
  return (
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
  );
}

// The weekly class leaderboard (クラス tab and the teacher's ランキング view).
// board: fetchClassLeaderboard(). viewer: 'student' | 'teacher' (no "my place").
// Main attention on effort: correct spellings typed and handwritten (two boards); reviews only small,
// because a few students won the old reviews board by tapping through cards. Never accuracy, levels or EXP.
// Wide: the two boards side by side with the reviews panel as a strip under them (or, with handwriting
// off, the typing board and the reviews panel as a narrow column beside it); phone: stacked.
export default function ClassLeaderboard({ board, viewer = "student", wide = false, handwritingEnabled = HANDWRITING_ENABLED }) {
  const boards = board?.boards;
  const modes = boards ? ["typing", ...(handwritingEnabled ? ["handwriting"] : [])] : [];
  const strip = wide && modes.length === 2;
  const columns = !wide ? "minmax(0, 1fr)" : strip ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr) 220px";
  return (
    <section style={{ ...panel, display: "grid", gap: 14, alignContent: "start" }} aria-labelledby="leaderboard-title">
      <BoardHeader />
      {boards ? (
        <div data-board-grid="" style={{ display: "grid", gap: wide ? 20 : 24, gridTemplateColumns: columns, alignItems: "start" }}>
          {modes.map((kind) => <ModeBoard key={kind} kind={kind} data={boards[kind]} viewer={viewer} />)}
          <ReviewsSide data={boards.reviews} viewer={viewer} strip={strip} />
        </div>
      ) : (
        <ReviewsBoard board={board} viewer={viewer} wide={wide} />
      )}
    </section>
  );
}
