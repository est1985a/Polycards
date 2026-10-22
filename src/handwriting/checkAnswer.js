import { LENIENT_PAIRS } from "./config.js";

// One box: the target letter vs the model's top letter (null = empty box).
// "correct" | "lenient" (a known look-alike, still counts as correct) | "wrong"
export function scoreBox(target, read, pairs = LENIENT_PAIRS) {
  if (!read) return "wrong";
  const t = String(target).toLowerCase();
  const r = String(read).toLowerCase();
  if (t === r) return "correct";
  if (pairs[t] === r) return "lenient";
  return "wrong";
}

// A whole word. boxes: [{ target, read }] in order.
// Returns each box's score, whether every box counts as correct, and the lenient pairs
// (each target → read pair listed once, in the order they appear).
export function scoreWord(boxes, pairs = LENIENT_PAIRS) {
  const scores = boxes.map((b) => scoreBox(b.target, b.read, pairs));
  const lenientPairs = [];
  boxes.forEach((b, i) => {
    if (scores[i] !== "lenient") return;
    const pair = { target: b.target.toLowerCase(), read: b.read.toLowerCase() };
    if (!lenientPairs.some((p) => p.target === pair.target && p.read === pair.read)) lenientPairs.push(pair);
  });
  return {
    scores,
    allCorrect: boxes.length > 0 && scores.every((s) => s !== "wrong"),
    hasLenient: lenientPairs.length > 0,
    lenientPairs,
  };
}

// The warning line for one lenient pair: 「i」が「l」に見えるかも。気をつけて書こう！
export function lenientMessage({ target, read }) {
  return `「${target}」が「${read}」に見えるかも。気をつけて書こう！`;
}
