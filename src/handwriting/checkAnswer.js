import { LENIENT_PAIRS, MIN_TARGET_PROB } from "./config.js";

// One box: the target letter vs the model's top letter (read; null = empty box) and the
// probability the model gave the target letter (targetProb, 0 to 1).
//   "correct": the top letter is the target
//   "lenient": still counts as correct, with an orange warning: the target got at least
//              MIN_TARGET_PROB, or the top letter is a known look-alike (LENIENT_PAIRS)
//   "wrong":   anything else, including an empty box
export function scoreBox(target, read, targetProb = 0, { pairs = LENIENT_PAIRS, minProb = MIN_TARGET_PROB } = {}) {
  if (!read) return "wrong";
  const t = String(target).toLowerCase();
  const r = String(read).toLowerCase();
  if (t === r) return "correct";
  if (targetProb >= minProb || pairs[t] === r) return "lenient";
  return "wrong";
}

// A whole word. boxes: [{ target, read, targetProb }] in order.
// Returns each box's score, whether every box counts as correct, and the lenient pairs
// (each target → read pair listed once, in the order they appear; read = the letter the model read).
export function scoreWord(boxes, options) {
  const scores = boxes.map((b) => scoreBox(b.target, b.read, b.targetProb, options));
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
