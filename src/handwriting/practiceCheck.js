// Checking one letter-practice box: the shape (the letter model) and the height (the four lines).
// Pure functions; strokes and heights are in line units (see letterGuides.js: y = 0 on line 1,
// 1 on line 2, 2 on the red baseline, 3 on line 4).
import {
  LENIENT_PAIRS, PRACTICE_HEIGHT_CHECK, PRACTICE_HEIGHT_TOLERANCE, PRACTICE_MIN_TARGET_PROB,
} from "./config.js";
import { readBoxes } from "./checkAnswer.js";
import { letterCategory } from "./letterGuides.js";

// Box pixels → line units. strokes: [[{ x, y }]] in px; metrics: lineMetrics(box height).
export function strokesToUnits(strokes, { top, gap }) {
  return strokes.map((stroke) => stroke.map((p) => [p.x / gap, (p.y - top) / gap]));
}

// Top and bottom of the ink (stroke centers), or null with no ink.
export function inkBounds(strokes) {
  const ys = strokes.flatMap((stroke) => stroke.map((p) => p[1]));
  if (ys.length === 0) return null;
  return { top: Math.min(...ys), bottom: Math.max(...ys) };
}

// Small i and j need their dot.
export function needsDot(letter) {
  return letter === "i" || letter === "j";
}

// Capital I is taught with short bars at the top and bottom (so it isn't mistaken for l): in practice
// it needs at least 3 strokes (the line and the two bars; the height check makes sure the ink reaches
// from line 1 to the baseline).
export function needsBars(letter) {
  return letter === "I";
}

export function hasBars(strokes) {
  return strokes.length >= 3;
}

// A dot: a short stroke (not the only one) lying above line 2.
export function hasDot(strokes, tol = PRACTICE_HEIGHT_TOLERANCE) {
  if (strokes.length < 2) return false;
  return strokes.some((stroke) => {
    const xs = stroke.map((p) => p[0]);
    const ys = stroke.map((p) => p[1]);
    const small = Math.max(...xs) - Math.min(...xs) <= 0.6 && Math.max(...ys) - Math.min(...ys) <= 0.6;
    return small && Math.max(...ys) < 1 + tol / 4;
  });
}

// What is wrong with the ink's height for this letter, or null. Bottom first, then top, so there is
// one hint at a time. Hint keys: practice.hint.<key>.
export function heightProblem(letter, top, bottom, tol = PRACTICE_HEIGHT_TOLERANCE) {
  const category = letterCategory(letter);
  const tail = category === "descender" || category === "j";
  if (Math.abs(bottom - (tail ? 3 : 2)) > tol) return tail ? "tail" : "baseline";
  switch (category) {
    case "capital":
      return Math.abs(top) > tol ? "capital" : null;
    case "ascender":
      return Math.abs(top) > tol ? "ascender" : null;
    case "t":
    case "i":
    case "j":
      // the top of t, or the dot of i / j: between line 1 and line 2
      if (top >= -tol && top <= 1 - tol / 2) return null;
      return category === "t" ? "ascender" : "dot";
    default: // x-height letters and the body of g p q y
      return Math.abs(top - 1) > tol ? "small" : null;
  }
}

// The whole check for one box.
// target: the letter to write (case matters for the height); probs: the model's 26 probabilities
// (null = nothing written); strokes: the ink in line units.
// → { pass, hint: { key, letter } | null, read, targetProb }
//   Shape: the top letter is the target, or the target got at least minProb. A look-alike read
//   (i ↔ l, g ↔ q) counts only together with the height check. Small i and j also need their dot,
//   capital I its top and bottom bars.
export function practiceResult({ target, probs, strokes }, {
  heightCheck = PRACTICE_HEIGHT_CHECK, tol = PRACTICE_HEIGHT_TOLERANCE, minProb = PRACTICE_MIN_TARGET_PROB,
} = {}) {
  const letter = target.toLowerCase();
  const fail = (key) => ({ pass: false, hint: { key, letter }, read, targetProb });
  if (!probs) return { pass: false, hint: { key: "shape", letter }, read: null, targetProb: 0 };
  const [{ read, targetProb }] = readBoxes([target], [probs]);
  const bounds = inkBounds(strokes);
  if (!bounds) return fail("shape");

  const shapeOk = read === letter || targetProb >= minProb;
  const lookAlike = LENIENT_PAIRS[letter] === read;
  if (!shapeOk && !(lookAlike && heightCheck)) return fail("shape");
  if (!heightCheck) return { pass: true, hint: null, read, targetProb };

  if (needsDot(target) && !hasDot(strokes, tol)) return fail("dot");
  if (needsBars(target) && !hasBars(strokes)) return fail("capitalI");
  const problem = heightProblem(target, bounds.top, bounds.bottom, tol);
  if (problem) return fail(problem);
  return { pass: true, hint: null, read, targetProb };
}
