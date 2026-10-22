// What the student writes for a card's English: words in ( ) or [ ] are optional in typing mode,
// so they are left out here ("look (at)" → "look"). Typing mode's spelling check accepts this
// as exact, so it is also what a correct handwritten answer sends as the typed answer.
export function writtenAnswer(english) {
  return String(english ?? "").replace(/[([][^)\]]*[)\]]/g, " ").replace(/\s+/g, " ").trim();
}

// Splits an English answer into what the student writes and what is printed for them.
//   { type: "box", letter, index }  one letter to write (a–z / A–Z)
//   { type: "gap" }          a space between words
//   { type: "print", text }  anything else, printed between the boxes ("...", "?", "'", "-", digits)
// Characters that aren't letters or spaces next to each other stay one print slot ("..."), unless
// they sit at different heights ("!”" is "!" on the baseline, then "”" at the top).
export function answerSlots(answer) {
  const slots = [];
  let index = 0; // boxes are numbered 0, 1, 2 … in reading order
  for (const ch of String(answer ?? "").trim()) {
    if (/[A-Za-z]/.test(ch)) {
      slots.push({ type: "box", letter: ch, index: index++ });
    } else if (/\s/.test(ch)) {
      if (slots.length && slots[slots.length - 1].type !== "gap") slots.push({ type: "gap" });
    } else {
      const last = slots[slots.length - 1];
      if (last && last.type === "print" && printPosition(last.text) === printPosition(ch)) last.text += ch;
      else slots.push({ type: "print", text: ch });
    }
  }
  return slots;
}

// How many boxes an answer needs.
export function boxCount(answer) {
  return answerSlots(answer).filter((s) => s.type === "box").length;
}

// Where a printed character sits, relative to the boxes:
//   "top":      apostrophes and quotation marks (don't, “Hi”), level with the top third
//   "middle":   hyphens and dashes (T-shirt)
//   "baseline": everything else (. , ... ? ! digits), near the bottom of the boxes
export function printPosition(text) {
  if (/^['’‘"“”`´]+$/.test(text)) return "top";
  if (/^[-‐–—]+$/.test(text)) return "middle";
  return "baseline";
}

// Width of a slot, as a multiple of the box size. Apostrophes and quotes are narrow, so "don't"
// still reads as one word.
export function slotFactor(slot) {
  if (slot.type === "box") return 1;
  if (slot.type === "gap") return 0.45;
  if (printPosition(slot.text) === "top") return 0.16 * slot.text.length;
  return Math.max(0.3, 0.34 * slot.text.length);
}

// The box size that makes a row exactly fill `width`.
function fitSize(row, width, spacing) {
  const k = row.reduce((sum, s) => sum + slotFactor(s), 0);
  return (width - spacing * Math.max(0, row.length - 1)) / k;
}

// Where to break a long answer into two rows: at the space nearest the middle, or, for one
// long word, between the two middle letters. Returns the two rows (the gap itself is dropped).
function splitRows(slots) {
  const boxes = slots.filter((s) => s.type === "box").length;
  const gapAt = slots.map((s, i) => (s.type === "gap" ? i : -1)).filter((i) => i >= 0);
  let best = null;
  for (const i of gapAt) {
    const left = slots.slice(0, i).filter((s) => s.type === "box").length;
    const score = Math.abs(left - boxes / 2);
    if (!best || score < best.score) best = { score, rows: [slots.slice(0, i), slots.slice(i + 1)] };
  }
  if (best) return best.rows;
  let seen = 0;
  const cut = slots.findIndex((s) => s.type === "box" && seen++ === Math.ceil(boxes / 2));
  return cut > 0 ? [slots.slice(0, cut), slots.slice(cut)] : [slots];
}

// Box size and rows for an answer in a space `width` px wide. One row when the boxes fit at
// `min` px or more (capped at `max`), otherwise two rows. → { rows: [[slot]], size }
export function boxLayout(slots, width, { max = 96, min = 56, spacing = 6 } = {}) {
  if (slots.length === 0 || width <= 0) return { rows: [slots], size: min };
  const one = Math.min(max, fitSize(slots, width, spacing));
  if (one >= min) return { rows: [slots], size: Math.floor(one) };
  const rows = splitRows(slots);
  if (rows.length < 2) return { rows, size: Math.floor(one) };
  const two = Math.min(max, ...rows.map((r) => fitSize(r, width, spacing)));
  return { rows, size: Math.floor(Math.max(one, two)) };
}

// The answer as the model read it: each box's letter (? for an empty box), with the spaces and
// printed characters in between. reads: one letter (or null) per box, in order.
export function readText(slots, reads) {
  return slots.map((s) => (s.type === "box" ? reads[s.index] ?? "?" : s.type === "gap" ? " " : s.text)).join("");
}
