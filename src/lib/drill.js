// Helpers for building and shuffling study piles.

export const CLEAR_TARGET = 2; // only used for the Card Sets practice drill

// Each word becomes two cards: English to Japanese and Japanese to English.
export function buildCards(dbCards) {
  const cards = [];
  dbCards.forEach((c) => {
    cards.push({ id: `${c.id}-e2j`, direction: "en2jp", front: c.english, back: c.japanese, jp: c.japanese, en: c.english });
    cards.push({ id: `${c.id}-j2e`, direction: "jp2en", front: c.japanese, back: c.english, jp: c.japanese, en: c.english });
  });
  return cards;
}

// Turn user_cards rows (with their joined card) into review cards.
export function buildReviewCards(rows) {
  return rows.map((r) => {
    const c = r.cards;
    const e2j = r.direction === 'en2jp';
    return {
      id: `${r.card_id}-${e2j ? 'e2j' : 'j2e'}`,
      cardId: r.card_id,
      direction: r.direction,
      front: e2j ? c.english : c.japanese,
      back: e2j ? c.japanese : c.english,
      jp: c.japanese,
      en: c.english,
      level: r.level,
    };
  });
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Put a card back into the pile at a random spot (never right at the front).
export function reinsert(pile, cardId) {
  if (pile.length === 0) return [cardId];
  const minPos = Math.min(1, pile.length);
  const pos = minPos + Math.floor(Math.random() * (pile.length - minPos + 1));
  const next = [...pile];
  next.splice(pos, 0, cardId);
  return next;
}
