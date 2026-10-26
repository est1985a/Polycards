// Pack opening after Add to My Cards (PackOpening.jsx): which words are new, which the
// student already has, where each card sits in the fan, and when each step starts.
// Pure functions, no React or Supabase. Tests: packOpening.test.js.

// At most this many cards come out of the pack; the rest are counted in "ほか N語".
export const PACK_SHOWN = 12;
export const PACK_PER_ROW = 6;

// When each step starts (ms after opening). The summary comes at `done`.
export const PACK_STEPS = { shake: 0, tear: 450, fan: 750, sort: 1450, fly: 1950, done: 2700 };
export const PACK_STEP_ORDER = ["shake", "tear", "fan", "sort", "fly", "done"];

// Has the animation reached `step` yet?
export function reached(phase, step) {
  return PACK_STEP_ORDER.indexOf(phase) >= PACK_STEP_ORDER.indexOf(step);
}

// The deck's words, once each, in deck order: [{ id, en }]. cards = activeSet.cards
// (two per word, from buildCards in drill.js).
export function packWords(cards) {
  const seen = new Set();
  const words = [];
  for (const card of cards || []) {
    if (seen.has(card.wordId)) continue;
    seen.add(card.wordId);
    words.push({ id: card.wordId, en: card.direction === "jp2en" ? card.back : card.front });
  }
  return words;
}

// Splits the words into new and already owned. ownedIds = word ids the student had
// before adding (from addDeckToMyCards), or null when that check failed: then nothing is
// marked owned and `known` is false, so the summary shows a plain "added" line.
export function packSummary(words, ownedIds) {
  const known = Array.isArray(ownedIds);
  const owned = new Set(known ? ownedIds : []);
  const items = words.map((w) => ({ ...w, owned: owned.has(w.id) }));
  const ownedCount = items.filter((w) => w.owned).length;
  const newCount = items.length - ownedCount;
  return {
    items,
    newCount,
    ownedCount,
    known,
    allOwned: known && items.length > 0 && newCount === 0,
    shown: items.slice(0, PACK_SHOWN),
    hiddenCount: Math.max(0, items.length - PACK_SHOWN),
  };
}

// Fan positions for n cards around the stage center: { x, y, rotate } in px / degrees.
// Up to PACK_PER_ROW cards make one arc; more make two arcs (top row gets the extra one).
export function fanLayout(n, { spacing = 58, rowGap = 124, lift = 14, maxTilt = 16 } = {}) {
  if (n <= 0) return [];
  const rows = n <= PACK_PER_ROW ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
  const out = [];
  rows.forEach((count, r) => {
    const rowY = rows.length === 1 ? 0 : (r === 0 ? -rowGap / 2 : rowGap / 2);
    for (let i = 0; i < count; i++) {
      const pos = count === 1 ? 0 : (i / (count - 1)) * 2 - 1; // -1 … 1
      out.push({
        x: Math.round(pos * spacing * (count - 1) / 2),
        y: Math.round(rowY + pos * pos * lift),
        rotate: Math.round(pos * maxTilt * Math.min(1, (count - 1) / (PACK_PER_ROW - 1))),
      });
    }
  });
  return out;
}
