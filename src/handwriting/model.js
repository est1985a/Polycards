// Loads the letter model and runs it. TensorFlow.js is imported dynamically, so it is only
// downloaded when handwriting is actually used.
import { LABELS, MODEL_URL } from "./config.js";

let loading = null;

// Loads TF.js and the model once (later calls share the same promise).
// Resolves to { tf, model, backend, loadMs }. A failed load can be retried.
export function loadModel() {
  if (!loading) {
    loading = (async () => {
      const start = performance.now();
      const tf = await import("@tensorflow/tfjs");
      const webgl = await tf.setBackend("webgl").catch(() => false);
      if (!webgl) await tf.setBackend("cpu");
      await tf.ready();
      const model = await tf.loadGraphModel(MODEL_URL);
      return { tf, model, backend: tf.getBackend(), loadMs: performance.now() - start };
    })();
    loading.catch(() => { loading = null; });
  }
  return loading;
}

// Runs every input (each a Float32Array(784), 28×28, white ink = 1) through ONE predict call.
// Returns an array of 26 probabilities per input.
export async function predictWith(tf, model, inputs) {
  if (inputs.length === 0) return [];
  const flat = new Float32Array(inputs.length * 784);
  inputs.forEach((input, i) => flat.set(input, i * 784));
  const x = tf.tensor4d(flat, [inputs.length, 28, 28, 1]);
  const y = model.predict(x);
  try {
    const data = await y.data();
    return inputs.map((_, i) => Array.from(data.slice(i * 26, (i + 1) * 26)));
  } finally {
    x.dispose();
    y.dispose();
  }
}

// Loads the model if needed, then predicts. Resolves to { probs, predictMs }.
export async function predictBatch(inputs) {
  const { tf, model } = await loadModel();
  const start = performance.now();
  const probs = await predictWith(tf, model, inputs);
  return { probs, predictMs: performance.now() - start };
}

// The k most likely letters: [{ letter, prob }], highest first.
export function topK(probs, k = 3) {
  return probs
    .map((prob, i) => ({ letter: LABELS[i], prob }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, k);
}
