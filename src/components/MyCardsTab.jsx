import { colors, fontDisplay, cardStyle, btnGhost, btnLink } from '../styles/theme';
import { SESSION_SIZE } from '../lib/srs';
import PlayerStats from './PlayerStats';
import LevelChart from './LevelChart';

// Big "start review" button. The pill shows how many cards the session will have
// (all due cards, up to SESSION_SIZE).
function ReviewButton({ dueCount, loading, onReview }) {
  const ready = dueCount > 0;
  return (
    <button
      onClick={onReview}
      disabled={loading || !ready}
      style={{
        width: "100%", height: 64, borderRadius: 16, border: "none", padding: "0 20px",
        display: "flex", alignItems: "center", justifyContent: ready ? "space-between" : "center", gap: 12,
        background: ready ? colors.accent : colors.surface2, color: ready ? colors.accentInk : colors.muted,
        cursor: ready && !loading ? "pointer" : "default", opacity: loading ? 0.7 : 1,
      }}
    >
      {ready ? (
        <>
          <span style={{ fontSize: 20, fontWeight: 700 }}>復習を始める</span>
          <span
            style={{
              fontFamily: fontDisplay, fontWeight: 700, fontSize: 16, padding: "4px 14px", borderRadius: 999,
              background: `color-mix(in srgb, ${colors.accentInk} 15%, transparent)`,
            }}
          >
            {Math.min(dueCount, SESSION_SIZE)}枚
          </span>
        </>
      ) : (
        <span style={{ fontSize: 16, fontWeight: 700 }}>復習するカードはありません</span>
      )}
    </button>
  );
}

export default function MyCardsTab({ decks, dueRows, stats, onReview, onRemove, loading, removingDeckId }) {
  if (decks.length === 0) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <PlayerStats stats={stats} />
        <div style={{ ...cardStyle, padding: 30, textAlign: "center" }}>
          <h3 style={{ margin: "0 0 10px", color: colors.text }}>Your Personal Rotation</h3>
          <p style={{ fontSize: 14, color: colors.text }}>
            You haven't saved any sets yet! Go to the <strong>Card Sets</strong> tab to find vocabulary lists and add them to your SRS schedule.
          </p>
        </div>
      </div>
    );
  }

  // A word can be in several decks, so a due card counts toward each of them.
  const dueByDeck = {};
  dueRows.forEach((r) => {
    r.words?.deck_words?.forEach(({ deck_id: d }) => {
      dueByDeck[d] = (dueByDeck[d] || 0) + 1;
    });
  });

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <PlayerStats stats={stats} />
      <ReviewButton dueCount={dueRows.length} loading={loading} onReview={() => onReview()} />
      {stats && <LevelChart counts={stats.levelCounts} />}

      {decks.map((deck) => {
        const due = dueByDeck[deck.id] || 0;
        return (
          <div key={deck.id} style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: colors.muted }}>
                {deck.units?.textbooks?.name} ・ {deck.units?.name}
              </div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: colors.text }}>{deck.name}</div>
              <div style={{ fontSize: 12, color: due > 0 ? colors.gold : colors.muted }}>
                {due > 0 ? `${due} 枚 復習できます` : "今は復習なし"}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => onReview(deck)}
                disabled={loading || due === 0}
                style={{ ...btnGhost, fontSize: 13, padding: "8px 12px", opacity: due === 0 ? 0.4 : 1 }}
              >
                復習<br />Review
              </button>
              <button
                onClick={() => onRemove(deck)}
                disabled={removingDeckId === deck.id}
                style={{ ...btnLink, fontSize: 12 }}
              >
                {removingDeckId === deck.id ? "削除中..." : "削除 (Remove)"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
