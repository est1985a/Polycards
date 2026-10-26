// Loads the letter model and runs it. TensorFlow.js is imported dynamically, so it is only
// downloaded when handwriting is actually used.
import { BATCH_SIZE, LABELS, MODEL_URL } from "./config.js";
import { penLog } from "./penDebug.js";

let loading = null;
let warming = null;
let ready = false; // loaded and warmed up (see modelReady)

// Loads TF.js and the model once (later calls share the same promise).
// Resolves to { tf, model, backend, loadMs }. A failed load can be retried.
export function loadModel() {
  if (!loading) {
    penLog({ model: "loading", modelError: null });
    loading = (async () => {
      const start = performance.now();
      const tf = await import("@tensorflow/tfjs");
      const webgl = await tf.setBackend("webgl").catch(() => false);
      if (!webgl) await tf.setBackend("cpu");
      await tf.ready();
      const model = await tf.loadGraphModel(MODEL_URL);
      return { tf, model, backend: tf.getBackend(), loadMs: performance.now() - start };
    })();
    loading.then(({ backend, loadMs }) => {
      penLog({ model: "warming up", backend, modelMs: Math.round(loadMs) });
      warmUp();
    }, (error) => {
      penLog({ model: "error", modelError: String(error?.message ?? error) });
      loading = null;
    });
  }
  return loading;
}

// Runs one blank batch so WebGL compiles its shaders before the first real answer.
// Starts by itself once the model has loaded (in the background: nothing waits for it).
// Resolves to { warmMs }, or null if it failed.
export function warmUp() {
  if (!warming) {
    warming = loadModel().then(async ({ tf, model }) => {
      const start = performance.now();
      await predictWith(tf, model, [new Float32Array(784)]);
      const warmMs = performance.now() - start;
      penLog({ model: "ready", modelMs: Math.round(warmMs) });
      return { warmMs };
    }).catch((error) => {
      console.warn("Handwriting model warm-up failed:", error);
      penLog({ model: "warm-up failed", modelError: String(error?.message ?? error) });
      warming = null;
      return null;
    });
  }
  return warming;
}

// Resolves once the model has loaded AND warmed up, so nothing heavy runs on the main thread while
// the student writes (the warm-up compiles WebGL shaders, which can block the page for seconds on a
// slow iPad). A failed warm-up still counts as ready (a real read will try again). Rejects if the model
// can't load.
export function modelReady() {
  return loadModel().then(async (loaded) => {
    await warmUp();
    ready = true;
    return loaded;
  });
}

// True once modelReady() has resolved (so a new card's boxes don't flash "getting ready").
export function isModelReady() {
  return ready;
}

// Rejects with Error("timeout") if the promise takes longer than ms (its late result is ignored).
export function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), ms); }),
  ]).finally(() => clearTimeout(timer));
}

// Runs the inputs (each a Float32Array(784), 28×28, white ink = 1) through the model in
// batches of exactly BATCH_SIZE: a short word is padded with blank images (their outputs are
// ignored), a longer answer is split into chunks of BATCH_SIZE.
// Returns an array of 26 probabilities per input.
export async function predictWith(tf, model, inputs, batchSize = BATCH_SIZE) {
  const out = [];
  for (let start = 0; start < inputs.length; start += batchSize) {
    const chunk = inputs.slice(start, start + batchSize);
    const flat = new Float32Array(batchSize * 784); // unused slots stay 0 (blank)
    chunk.forEach((input, i) => flat.set(input, i * 784));
    const x = tf.tensor4d(flat, [batchSize, 28, 28, 1]);
    const y = model.predict(x);
    try {
      const data = await y.data();
      chunk.forEach((_, i) => out.push(Array.from(data.slice(i * 26, (i + 1) * 26))));
    } finally {
      x.dispose();
      y.dispose();
    }
  }
  return out;
}

// Loads the model if needed, then predicts. Resolves to { probs, predictMs }.
export async function predictBatch(inputs) {
  const { tf, model } = await loadModel();
  await warming; // never at the same time as the warm-up (set as soon as the model has loaded)
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
