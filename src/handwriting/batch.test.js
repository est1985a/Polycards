// Tests for running the model in fixed batches of BATCH_SIZE (so WebGL compiles its shaders
// only once). Uses a fake model: no TensorFlow.js needed. Run with: npm test
import { describe, it, expect } from 'vitest';
import { predictWith } from './model.js';
import { BATCH_SIZE } from './config.js';

// Fake tf + model: each output row's first value is the input image's first pixel, so we can
// tell which input a row came from. Records every batch shape and counts undisposed tensors.
function fakeModel() {
  const shapes = [];
  let live = 0;
  const tensor = (values, shape) => { live++; return { values, shape, dispose: () => { live--; } }; };
  const tf = { tensor4d: (values, shape) => tensor(values, shape) };
  const model = {
    predict(x) {
      shapes.push(x.shape);
      const n = x.shape[0];
      const out = new Float32Array(n * 26);
      for (let i = 0; i < n; i++) out[i * 26] = x.values[i * 784];
      const y = tensor(out, [n, 26]);
      y.data = async () => out;
      return y;
    },
  };
  return { tf, model, shapes, live: () => live };
}

const image = (id) => { const a = new Float32Array(784); a[0] = id; return a; };
const inputs = (n) => Array.from({ length: n }, (_, i) => image(i + 1));

describe('predictWith', () => {
  it('uses a batch of 16', () => {
    expect(BATCH_SIZE).toBe(16);
  });

  it('pads a short word to one full batch and returns only its own rows', async () => {
    const f = fakeModel();
    const probs = await predictWith(f.tf, f.model, inputs(4));
    expect(f.shapes).toEqual([[16, 28, 28, 1]]);
    expect(probs).toHaveLength(4);
    expect(probs.map((p) => p[0])).toEqual([1, 2, 3, 4]);
    expect(probs[0]).toHaveLength(26);
  });

  it('every word length uses the same shape', async () => {
    const f = fakeModel();
    for (const n of [1, 4, 10, 16]) await predictWith(f.tf, f.model, inputs(n));
    expect(new Set(f.shapes.map((s) => s.join('x')))).toEqual(new Set(['16x28x28x1']));
  });

  it('splits a long answer into chunks of 16, in order', async () => {
    const f = fakeModel();
    const probs = await predictWith(f.tf, f.model, inputs(20));
    expect(f.shapes).toEqual([[16, 28, 28, 1], [16, 28, 28, 1]]);
    expect(probs.map((p) => p[0])).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('exactly 16 boxes is one batch; 33 is three', async () => {
    const a = fakeModel();
    await predictWith(a.tf, a.model, inputs(16));
    expect(a.shapes).toHaveLength(1);
    const b = fakeModel();
    expect(await predictWith(b.tf, b.model, inputs(33))).toHaveLength(33);
    expect(b.shapes).toHaveLength(3);
  });

  it('no boxes runs nothing', async () => {
    const f = fakeModel();
    expect(await predictWith(f.tf, f.model, [])).toEqual([]);
    expect(f.shapes).toEqual([]);
  });

  it('frees every tensor', async () => {
    const f = fakeModel();
    await predictWith(f.tf, f.model, inputs(20));
    expect(f.live()).toBe(0);
  });
});
