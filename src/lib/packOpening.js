// Pack opening after Add to My Cards (PackOpening.jsx): which words are new, which the
// student already has, where each card sits in the fan, and when each step starts.
// Pure functions, no React or Supabase. Tests: packOpening.test.js.

// At most this many cards come out of the pack; the rest are counted in "ほか N語".
export const PACK_SHOWN = 12;
export const PACK_PER_ROW = 6;

// Below this screen width the 380 px stage doesn't fit (plus 16 px padding each side),
// so the fan uses 5 smaller cards per row (10 shown).
export const PACK_NARROW_BELOW = 412;

// Taps on OK are ignored this long after the summary appears, so a double tap that
// skipped the animation can't close the summary at once (like 次へ in typing mode).
export const PACK_CLOSE_GUARD_MS = 300;

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

// Card size and fan spacing for a screen this wide (px).
export function packFit(screenWidth) {
  if (screenWidth < PACK_NARROW_BELOW) {
    return { perRow: 5, shownMax: 10, card: { width: 58, height: 78 }, spacing: 52, rowGap: 112 };
  }
  return { perRow: PACK_PER_ROW, shownMax: PACK_SHOWN, card: { width: 66, height: 88 }, spacing: 58, rowGap: 124 };
}

// The cards that come out of the pack, and how many more are counted in "ほか N語".
export function packShown(items, shownMax = PACK_SHOWN) {
  const shown = items.slice(0, shownMax);
  return { shown, hiddenCount: items.length - shown.length };
}

// Font size (px) for a word on a fan card, so its longest single word fits the card's
// inner width: long words get smaller text instead of breaking in the middle.
export function cardFontSize(text, innerWidth, { max = 12, min = 7, charWidth = 0.6 } = {}) {
  const longest = Math.max(1, ...String(text || "").split(/\s+/).map((w) => w.length));
  return Math.max(min, Math.min(max, Math.floor(innerWidth / (longest * charWidth))));
}

// Is it too soon after the summary appeared (at shownAt, ms) to close it?
export function closeTooSoon(shownAt, now = Date.now()) {
  return now - shownAt < PACK_CLOSE_GUARD_MS;
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
  };
}

// Fan positions for n cards around the stage center: { x, y, rotate } in px / degrees.
// Up to perRow cards make one arc; more make two arcs (top row gets the extra one).
export function fanLayout(n, { perRow = PACK_PER_ROW, spacing = 58, rowGap = 124, lift = 14, maxTilt = 16 } = {}) {
  if (n <= 0) return [];
  const rows = n <= perRow ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
  const out = [];
  rows.forEach((count, r) => {
    const rowY = rows.length === 1 ? 0 : (r === 0 ? -rowGap / 2 : rowGap / 2);
    for (let i = 0; i < count; i++) {
      const pos = count === 1 ? 0 : (i / (count - 1)) * 2 - 1; // -1 … 1
      out.push({
        x: Math.round(pos * spacing * (count - 1) / 2),
        y: Math.round(rowY + pos * pos * lift),
        rotate: Math.round(pos * maxTilt * Math.min(1, (count - 1) / (perRow - 1))),
      });
    }
  });
  return out;
}
