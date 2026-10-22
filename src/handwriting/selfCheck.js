// The /hw-test self-checks as pure functions (so they can also run in the automated tests).
import { LABELS } from "./config.js";

// golden.json input ([28][28]) → Float32Array(784)
export function flatten28(rows) {
  const out = new Float32Array(784);
  rows.forEach((row, y) => row.forEach((v, x) => { out[y * 28 + x] = v; }));
  return out;
}

export function topLetter(probs) {
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  return LABELS[best];
}

export function maxAbsDiff(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

export function meanAbsDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

// Model check: top letter = label and probabilities within 1e-3 of the Python ones.
export function modelCheck(golden, probs) {
  return { label: golden.label, top: topLetter(probs), diff: maxAbsDiff(probs, golden.probs),
    pass: topLetter(probs) === golden.label && maxAbsDiff(probs, golden.probs) < 1e-3 };
}

// Preprocessing check: mean difference under 0.01 and the model's top letter = model_top.
export function preprocessCheck(expected, input, probs) {
  const diff = input ? meanAbsDiff(input, flatten28(expected.expected_28x28)) : Infinity;
  const top = probs ? topLetter(probs) : null;
  return { file: expected.file, top, expectedTop: expected.model_top, diff,
    pass: diff < 0.01 && top === expected.model_top };
}
