import { colors, fontBody, fontDisplay, panel, wideLayout, btnPrimary } from '../styles/theme';
import { DEFAULT_SESSION_SIZE, MASTERED, extraDueTotal } from '../lib/srs';
import PlayerStats from './PlayerStats';
import LevelChart from './LevelChart';
import StarIcon from './StarIcon';
import { t, tx } from '../i18n';

// Big "start review" button. The pill shows how many cards the session will have
// (all due cards, up to sessionSize, the student's 1回の枚数); a small line under the label shows the full total when there are more.
// When nothing is due, nextReview (from nextReviewSummary) adds the 次の復習 line; if that review is
// today or tomorrow, the button opens the review plan pop-up instead. wide: a taller button.
export function ReviewButton({ dueCount, loading, onReview, nextReview = null, onOpenPlan, sessionSize = DEFAULT_SESSION_SIZE, wide = false }) {
  const ready = dueCount > 0;
  const showsPlan = !ready && !!nextReview?.tappable;
  const total = extraDueTotal(dueCount, sessionSize);
  return (
    <button
      onClick={ready ? onReview : onOpenPlan}
      disabled={loading || !(ready || showsPlan)}
      aria-haspopup={showsPlan ? "dialog" : undefined}
      style={{
        width: "100%", minHeight: wide ? 76 : 64, borderRadius: 16, border: "none", padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: ready ? "space-between" : "center", gap: 12,
        background: ready ? colors.accent : colors.surface2, color: ready ? colors.accentInk : colors.muted,
        cursor: (ready || showsPlan) && !loading ? "pointer" : "default", opacity: loading ? 0.7 : 1,
      }}
    >
      {ready ? (
        <>
          <span style={{ minWidth: 0, display: "grid", gap: 2, textAlign: "left" }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{t("myCards.startReview")}</span>
            {total !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: `color-mix(in srgb, ${colors.accentInk} 75%, transparent)` }}>
                {tx("myCards.dueTotal", { n: <span style={{ fontFamily: fontDisplay }}>{total.toLocaleString('en-US')}</span>, count: total })}
              </span>
            )}
          </span>
          <span
            style={{
              flexShrink: 0, whiteSpace: "nowrap",
              fontFamily: fontDisplay, fontWeight: 700, fontSize: 16, padding: "4px 14px", borderRadius: 999,
              background: `color-mix(in srgb, ${colors.accentInk} 15%, transparent)`,
            }}
          >
            {t("myCards.sessionCount", { n: Math.min(dueCount, sessionSize) })}
          </span>
        </>
      ) : (
        <span style={{ display: "grid", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t("myCards.nothingDue")}</span>
          {nextReview && (
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
              {nextReview.text}
              {showsPlan && <span aria-hidden="true" style={{ marginLeft: 6, color: colors.muted }}>›</span>}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

// 答え方 switch: how Japanese → English cards are answered in reviews (saved on the device).
// なし (buttons) / タイピング / 手書き (Apple Pencil, only when handwritingEnabled). label / note are i18n keys.
const ANSWER_MODE_OPTIONS = [
  { mode: "off", label: "answerMode.off", note: "answerMode.off.note" },
  { mode: "typing", label: "answerMode.typing", note: "answerMode.typing.note" },
  { mode: "handwriting", label: "answerMode.handwriting", note: "answerMode.handwriting.note" },
];

export function AnswerModeSwitch({ mode = "off", onChange, handwritingEnabled = false, wide = false }) {
  const options = ANSWER_MODE_OPTIONS.filter((o) => o.mode !== "handwriting" || handwritingEnabled);
  const current = options.find((o) => o.mode === mode) ?? options[0];
  return (
    <div style={{ display: "grid", gap: 8, padding: "4px 4px" }}>
      <span style={{ fontSize: wide ? 16 : 15, fontWeight: 700, color: colors.text }}>{t("answerMode.title")}</span>
      <div
        role="group"
        aria-label={t("answerMode.label")}
        style={{
          display: "flex", gap: 4, padding: 4, borderRadius: 999,
          background: colors.surface, border: `2px solid ${colors.line}`,
        }}
      >
        {options.map((o) => {
          const selected = o.mode === current.mode;
          return (
            <button
              key={o.mode}
              onClick={() => onChange(o.mode)}
              aria-pressed={selected}
              style={{
                flex: 1, minWidth: 0, minHeight: 44, padding: "0 8px", borderRadius: 999, border: "none",
                background: selected ? colors.accent : "transparent", color: selected ? colors.accentInk : colors.muted,
                fontFamily: fontBody, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", cursor: "pointer",
              }}
            >
              {t(o.label)}
            </button>
          );
        })}
      </div>
      <span style={{ fontSize: 12, color: colors.muted }}>{t(current.note)}</span>
    </div>
  );
}

// Small pill at the top right of My Cards: opens the "What is Polycards?" pop-up (AboutSheet).
export function AboutButton({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      aria-label={t("about.buttonLabel")}
      aria-haspopup="dialog"
      style={{
        minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px",
        background: "transparent", border: `2px solid ${colors.accent}`, borderRadius: 999,
        color: colors.accentText, fontFamily: fontDisplay, fontSize: 14, fontWeight: 700, cursor: "pointer",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="0.6" fill="currentColor" />
      </svg>
      {t("about.button")}
    </button>
  );
}

// Opens the Mastered list. Shows how many cards are Mastered.
function MasteredButton({ count, loading, onOpen }) {
  return (
    <button
      onClick={onOpen}
      disabled={loading}
      style={{
        width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 16px",
        background: colors.surface, border: `2px solid ${colors.gold}`, borderRadius: 16,
        color: colors.text, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, textAlign: "left",
      }}
    >
      <StarIcon size={22} />
      <span style={{ flex: 1, fontFamily: fontDisplay, fontSize: 17, fontWeight: 700 }}>
        {tx("myCards.mastered", { n: <span style={{ color: colors.gold }}>{count.toLocaleString('en-US')}</span>, count })}
      </span>
      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1, color: colors.muted }}>›</span>
    </button>
  );
}

// One deck in マイデッキ. Tapping the row reviews this deck's due cards; × removes it.
function DeckRow({ deck, due, loading, removing, onReview, onRemove }) {
  const source = [deck.units?.textbooks?.name, deck.units?.name].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", alignItems: "stretch", minHeight: 44, background: colors.surface, border: `2px solid ${colors.line}`, borderRadius: 16 }}>
      <button
        onClick={() => onReview(deck)}
        disabled={loading || due === 0}
        style={{
          flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "14px 4px 14px 16px", background: "transparent", border: "none", borderRadius: 16,
          textAlign: "left", color: colors.text, cursor: due > 0 && !loading ? "pointer" : "default",
        }}
      >
        <span style={{ minWidth: 0 }}>
          {source && <span style={{ display: "block", fontSize: 12, color: colors.muted }}>{source}</span>}
          <span style={{ display: "block", fontSize: 17, fontWeight: 700 }}>{deck.name}</span>
        </span>
        {due > 0 ? (
          <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: colors.surface2, whiteSpace: "nowrap" }}>
            {tx("myCards.deckDue", { n: <span style={{ fontFamily: fontDisplay }}>{due}</span>, count: due })}
          </span>
        ) : (
          <span style={{ flexShrink: 0, fontSize: 12, color: colors.muted, whiteSpace: "nowrap" }}>{t("myCards.deckNothingDue")}</span>
        )}
      </button>
      <button
        onClick={() => onRemove(deck)}
        disabled={removing}
        aria-label={removing ? t("myCards.removing") : t("myCards.remove")}
        title={t("myCards.remove")}
        style={{
          width: 44, flexShrink: 0, marginRight: 4, background: "transparent", border: "none",
          color: colors.muted, fontSize: 22, lineHeight: 1, cursor: removing ? "default" : "pointer",
        }}
      >
        {removing ? "…" : "×"}
      </button>
    </div>
  );
}

// wide: two columns (player card, review button, chart, Mastered | マイデッキ in a 2-column grid).
export default function MyCardsTab({ decks, dueRows, nextReview, stats, avatar = null, answerMode = "off", onAnswerModeChange = () => {}, handwritingEnabled = false, sessionSize = DEFAULT_SESSION_SIZE, onReview, onOpenPlan, onOpenAbout = () => {}, onOpenCardSets = () => {}, onRemove, onOpenMastered, onOpenCollection, loading, removingDeckId, wide = false }) {
  // A word can be in several decks, so a due card counts toward each of them.
  const dueByDeck = {};
  dueRows.forEach((r) => {
    r.words?.deck_words?.forEach(({ deck_id: d }) => {
      dueByDeck[d] = (dueByDeck[d] || 0) + 1;
    });
  });

  const overview = (
    <>
      <PlayerStats stats={stats} avatar={avatar} wide={wide} onOpenCollection={onOpenCollection} />
      <ReviewButton dueCount={dueRows.length} loading={loading} onReview={() => onReview()} nextReview={nextReview} onOpenPlan={onOpenPlan} sessionSize={sessionSize} wide={wide} />
      <AnswerModeSwitch mode={answerMode} onChange={onAnswerModeChange} handwritingEnabled={handwritingEnabled} wide={wide} />
      {stats && <LevelChart counts={stats.levelCounts} />}
      {stats && <MasteredButton count={stats.levelCounts[MASTERED]} loading={loading} onOpen={onOpenMastered} />}
    </>
  );

  const myDecks = (
    <div style={{ display: "grid", gap: 10, alignContent: "start", gridTemplateColumns: wide ? "repeat(2, minmax(0, 1fr))" : undefined }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: wide ? 0 : "8px 0 0", color: colors.text, gridColumn: "1 / -1" }}>{t("myCards.myDecks")}</h2>
      {decks.length === 0 ? (
        <div style={{ ...panel, padding: 24, textAlign: "center", gridColumn: "1 / -1" }}>
          <h3 style={{ margin: "0 0 10px", color: colors.text }}>{t("myCards.empty.heading")}</h3>
          <p style={{ fontSize: 14, color: colors.text }}>{t("myCards.empty.body")}</p>
          <button onClick={onOpenCardSets} style={{ ...btnPrimary, minHeight: 48, padding: "0 20px", fontSize: 16 }}>
            {t("myCards.empty.button")}
          </button>
        </div>
      ) : (
        decks.map((deck) => (
          <DeckRow
            key={deck.id}
            deck={deck}
            due={dueByDeck[deck.id] || 0}
            loading={loading}
            removing={removingDeckId === deck.id}
            onReview={onReview}
            onRemove={onRemove}
          />
        ))
      )}
    </div>
  );

  const about = (
    <div style={{ display: "flex", justifyContent: "flex-end", gridColumn: "1 / -1" }}>
      <AboutButton onOpen={onOpenAbout} />
    </div>
  );

  if (!wide) {
    return (
      <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
        {about}
        {overview}
        {myDecks}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${wideLayout.leftColumn}px minmax(0, 1fr)`, gap: 32, rowGap: 16, alignItems: "start", textAlign: "left" }}>
      {about}
      <div style={{ display: "grid", gap: 16 }}>{overview}</div>
      {myDecks}
    </div>
  );
}
