import { useState } from 'react';
import { colors, fontDisplay, fontBody, panel, btnGhost, btnPrimary } from '../styles/theme';
import { directionLabel } from '../lib/drill';
import StarIcon from './StarIcon';

const smallBtn = { minHeight: 44, padding: "8px 14px", fontSize: 14, whiteSpace: "nowrap" };

// One Mastered card: direction (in English), the English word and the Japanese, and a button
// that puts it back into reviews. That button first asks 復習に戻しますか？ on the card itself.
export function MasteredRow({ card, confirming, restoring, onAsk, onCancel, onRestore }) {
  return (
    <li
      style={{
        display: "grid", gap: 10, padding: "12px 12px 12px 16px",
        background: colors.surface, border: `2px solid ${colors.gold}`, borderRadius: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: colors.muted }}>{directionLabel(card.direction)}</div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.text, overflowWrap: "anywhere" }}>{card.en}</div>
          <div style={{ fontFamily: fontBody, fontSize: 15, color: colors.text, overflowWrap: "anywhere" }}>{card.jp}</div>
        </div>
        {!confirming && (
          <button onClick={() => onAsk(card)} style={{ ...btnGhost, ...smallBtn, flexShrink: 0 }}>
            復習に戻す
          </button>
        )}
      </div>

      {confirming && (
        <div
          role="group"
          aria-label="復習に戻しますか？"
          style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8,
            paddingTop: 10, borderTop: `1px solid ${colors.line}`,
          }}
        >
          <span style={{ flex: 1, minWidth: 120, fontSize: 15, fontWeight: 700, color: colors.text }}>復習に戻しますか？</span>
          <button onClick={onCancel} disabled={restoring} style={{ ...btnGhost, ...smallBtn }}>キャンセル</button>
          <button
            onClick={() => onRestore(card)}
            disabled={restoring}
            style={{ ...btnPrimary, ...smallBtn, opacity: restoring ? 0.6 : 1 }}
          >
            {restoring ? "…" : "戻す"}
          </button>
        </div>
      )}
    </li>
  );
}

// List of the student's Mastered cards, newest first (fetchMasteredCards in src/lib/api.js).
// cards: [{ id, wordId, direction, en, jp }]; restoringId: the card being put back, if any.
export default function MasteredList({ cards, restoringId, onRestore }) {
  const [confirmingId, setConfirmingId] = useState(null); // card showing 復習に戻しますか？

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
            <MasteredRow
              key={card.id}
              card={card}
              confirming={confirmingId === card.id}
              restoring={restoringId === card.id}
              onAsk={(c) => setConfirmingId(c.id)}
              onCancel={() => setConfirmingId(null)}
              onRestore={onRestore}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
