import { colors, fontDisplay, fontBody, panel, btnGhost } from '../styles/theme';
import { directionLabel } from '../lib/drill';
import StarIcon from './StarIcon';

// One Mastered card: direction (in English), the English word and the Japanese, and a button
// that puts it back into reviews.
function MasteredRow({ card, restoring, onRestore }) {
  return (
    <li
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 12px 16px",
        background: colors.surface, border: `2px solid ${colors.gold}`, borderRadius: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: colors.muted }}>{directionLabel(card.direction)}</div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.text, overflowWrap: "anywhere" }}>{card.en}</div>
        <div style={{ fontFamily: fontBody, fontSize: 15, color: colors.text, overflowWrap: "anywhere" }}>{card.jp}</div>
      </div>
      <button
        onClick={() => onRestore(card)}
        disabled={restoring}
        style={{ ...btnGhost, flexShrink: 0, minHeight: 44, padding: "8px 12px", fontSize: 14, whiteSpace: "nowrap", opacity: restoring ? 0.6 : 1 }}
      >
        {restoring ? "…" : "復習に戻す"}
      </button>
    </li>
  );
}

// List of the student's Mastered cards, newest first (fetchMasteredCards in src/lib/api.js).
// cards: [{ id, wordId, direction, en, jp }]; restoringId: the card being put back, if any.
export default function MasteredList({ cards, restoringId, onRestore }) {
  return (
    <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontFamily: fontDisplay, fontSize: 22, color: colors.text }}>
        <StarIcon size={24} />
        Mastered
        <span style={{ fontSize: 16, color: colors.gold }}>{cards.length.toLocaleString('en-US')}</span>
      </h2>
      {cards.length === 0 ? (
        <div style={{ ...panel, padding: 24, textAlign: "center", fontSize: 15, color: colors.text }}>
          まだマスターしたカードはありません
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {cards.map((card) => (
            <MasteredRow key={card.id} card={card} restoring={restoringId === card.id} onRestore={onRestore} />
          ))}
        </ul>
      )}
    </div>
  );
}
