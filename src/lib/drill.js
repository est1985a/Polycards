// Helpers for building and shuffling study piles.

export const CLEAR_TARGET = 2; // only used for the Card Sets practice drill

// Optional example sentences: missing or blank ones become null.
const example = (s) => (s && s.trim()) || null;

// Word details every card carries, whichever direction it is.
function wordFields(w) {
  return { jp: w.japanese, en: w.english, exampleEn: example(w.example_en), exampleJa: example(w.example_ja) };
}

// Each word becomes two cards: English to Japanese and Japanese to English.
export function buildCards(words) {
  const cards = [];
  words.forEach((w) => {
    cards.push({ id: `${w.id}-e2j`, wordId: w.id, direction: "en2jp", front: w.english, back: w.japanese, ...wordFields(w) });
    cards.push({ id: `${w.id}-j2e`, wordId: w.id, direction: "jp2en", front: w.japanese, back: w.english, ...wordFields(w) });
  });
  return cards;
}

// Turn user_cards rows (with their joined word) into review cards.
export function buildReviewCards(rows) {
  return rows.map((r) => {
    const c = r.words;
    const e2j = r.direction === 'en2jp';
    return {
      id: `${r.word_id}-${e2j ? 'e2j' : 'j2e'}`,
      wordId: r.word_id,
      direction: r.direction,
      front: e2j ? c.english : c.japanese,
      back: e2j ? c.japanese : c.english,
      ...wordFields(c),
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
