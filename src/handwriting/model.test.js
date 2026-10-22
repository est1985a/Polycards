// Runs the real letter model and preprocessLetter in Node (TF.js CPU backend) against the
// Python reference data: the same self-checks as the /hw-test page. Run with: npm test
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import * as tf from '@tensorflow/tfjs';
import { preprocessLetter } from './preprocess.js';
import { predictWith, topK } from './model.js';
import { flatten28, modelCheck, preprocessCheck } from './selfCheck.js';

const dir = new URL('../../public/models/emnist/', import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, dir), 'utf8'));

// Minimal PNG reader for the 8-bit grayscale, non-interlaced test images.
function readGrayPng(path) {
  const buf = readFileSync(new URL(path, dir));
  let pos = 8, width = 0, height = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[9] !== 0 || body[12] !== 0) throw new Error(`${path}: not 8-bit grayscale`);
    }
    if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (width + 1)];
    for (let x = 0; x < width; x++) {
      const v = raw[y * (width + 1) + 1 + x];
      const a = x > 0 ? gray[y * width + x - 1] : 0;
      const b = y > 0 ? gray[(y - 1) * width + x] : 0;
      const c = x > 0 && y > 0 ? gray[(y - 1) * width + x - 1] : 0;
      let pred = 0;
      if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      gray[y * width + x] = (v + pred) & 255;
    }
  }
  return { gray, width, height };
}

let model;
beforeAll(async () => {
  await tf.setBackend('cpu');
  const json = readJson('model.json');
  const weights = readFileSync(new URL('group1-shard1of1.bin', dir));
  model = await tf.loadGraphModel(tf.io.fromMemory({
    modelTopology: json.modelTopology,
    weightSpecs: json.weightsManifest.flatMap((g) => g.weights),
    weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength),
    signature: json.signature,
  }));
}, 30000);

describe('letter model (golden.json)', () => {
  it('matches the Python predictions', async () => {
    const golden = readJson('test/golden.json');
    const probs = await predictWith(tf, model, golden.map((g) => flatten28(g.input)));
    golden.forEach((g, i) => {
      const r = modelCheck(g, probs[i]);
      expect(r.top, g.label).toBe(g.label);
      expect(r.diff, g.label).toBeLessThan(1e-3);
    });
  });
});

describe('preprocessLetter (preprocess_test/)', () => {
  it('matches the Python 28×28 images and gives the same top letter', async () => {
    const expected = readJson('test/preprocess_test/expected.json');
    const inputs = expected.map((e) => {
      const { gray, width, height } = readGrayPng(`test/preprocess_test/${e.file}`);
      return preprocessLetter(gray, width, height);
    });
    const probs = await predictWith(tf, model, inputs);
    expected.forEach((e, i) => {
      const r = preprocessCheck(e, inputs[i], probs[i]);
      expect(r.diff, e.file).toBeLessThan(0.01);
      expect(r.top, e.file).toBe(e.model_top);
      expect(topK(probs[i], 3)[0].letter).toBe(e.model_top);
    });
  });

  it('returns null for an empty box', () => {
    expect(preprocessLetter(new Uint8Array(100).fill(255), 10, 10)).toBeNull();
  });
});
