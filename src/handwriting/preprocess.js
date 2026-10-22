// Polycards handwriting: turn one letter box into the 28x28 input the model expects.
// JavaScript port of preprocess_drawing() from the training notebook, checked against
// the Python output in preprocess_test/expected.json.
//
// Input: grayscale pixels of ONE letter box, dark ink on a white background.
//   gray   - Uint8Array/Uint8ClampedArray of length width*height (0 = black, 255 = white)
//   width, height - box size in pixels
// Output: Float32Array(784), row-major 28x28, white ink = 1.0 on black = 0.0,
//   or null if the box is empty.
//
// Getting `gray` from a canvas:
//   const { data } = ctx.getImageData(0, 0, w, h);          // RGBA
//   const gray = new Uint8Array(w * h);
//   for (let i = 0; i < w * h; i++) gray[i] = data[i * 4];   // canvas filled white, ink drawn black
//
// Pure JS on purpose: no ctx.filter (not reliable in Safari) and no canvas resizing
// (browsers resample differently from the training pipeline).

const INK_THRESHOLD = 30;

export function preprocessLetter(gray, width, height) {
  // 1. Invert so ink is bright, and find the ink's bounding box
  let minX = width, minY = height, maxX = -1, maxY = -1;
  const inv = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = 255 - gray[y * width + x];
      inv[y * width + x] = v;
      if (v > INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // empty box

  // 2. Crop, centre in a square, then pad so the letter fills 24 of 28 pixels
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const s = Math.max(w, h);
  const pad = Math.round((s * 2) / 24);
  const side = s + 2 * pad;
  const sq = new Float32Array(side * side);
  const ox = pad + Math.floor((s - w) / 2), oy = pad + Math.floor((s - h) / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      sq[(oy + y) * side + ox + x] = inv[(minY + y) * width + minX + x];
    }
  }

  // 3. Slight Gaussian blur
  const blurred = gaussianBlur(sq, side, Math.max(1, side / 128));

  // 4. Shrink to 28x28 (Lanczos, matching Pillow's LANCZOS downscale)
  const small = resizeLanczos(blurred, side, side, 28, 28);

  // 5. Scale to 0..1 with the brightest pixel at 1.0
  let max = 0;
  for (let i = 0; i < small.length; i++) {
    let v = small[i];
    v = v < 0 ? 0 : v > 255 ? 255 : Math.round(v); // Pillow stores 8-bit results
    small[i] = v / 255;
    if (small[i] > max) max = small[i];
  }
  const m = Math.max(max, 1e-6);
  for (let i = 0; i < small.length; i++) small[i] /= m;
  return small;
}

function gaussianBlur(src, side, sigma) {
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(side * side), out = new Float32Array(side * side);
  const clamp = (v) => (v < 0 ? 0 : v >= side ? side - 1 : v);
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += src[y * side + clamp(x + i)] * k[i + r];
      tmp[y * side + x] = acc;
    }
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += tmp[clamp(y + i) * side + x] * k[i + r];
      out[y * side + x] = acc;
    }
  return out;
}

function lanczos(x) {
  if (x === 0) return 1;
  if (x <= -3 || x >= 3) return 0;
  const px = Math.PI * x;
  return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px);
}

// Separable Lanczos resample in the style of Pillow: when shrinking, the filter is
// widened by the scale factor so every source pixel contributes (antialiasing).
function resizeLanczos(src, inW, inH, outW, outH) {
  // Horizontal pass (inH x outW), then vertical pass (outH x outW)
  const horiz = new Float32Array(inH * outW);
  {
    const scale = inW / outW, fscale = Math.max(scale, 1), support = 3 * fscale;
    for (let o = 0; o < outW; o++) {
      const center = (o + 0.5) * scale;
      const lo = Math.max(0, Math.floor(center - support + 0.5));
      const hi = Math.min(inW, Math.floor(center + support + 0.5));
      const ws = []; let wsum = 0;
      for (let i = lo; i < hi; i++) { const wv = lanczos((i - center + 0.5) / fscale); ws.push(wv); wsum += wv; }
      for (let y = 0; y < inH; y++) {
        let acc = 0;
        for (let i = lo; i < hi; i++) acc += src[y * inW + i] * ws[i - lo];
        horiz[y * outW + o] = wsum ? acc / wsum : 0;
      }
    }
  }
  const out = new Float32Array(outH * outW);
  {
    const scale = inH / outH, fscale = Math.max(scale, 1), support = 3 * fscale;
    for (let o = 0; o < outH; o++) {
      const center = (o + 0.5) * scale;
      const lo = Math.max(0, Math.floor(center - support + 0.5));
      const hi = Math.min(inH, Math.floor(center + support + 0.5));
      const ws = []; let wsum = 0;
      for (let i = lo; i < hi; i++) { const wv = lanczos((i - center + 0.5) / fscale); ws.push(wv); wsum += wv; }
      for (let x = 0; x < outW; x++) {
        let acc = 0;
        for (let i = lo; i < hi; i++) acc += horiz[i * outW + x] * ws[i - lo];
        out[o * outW + x] = wsum ? acc / wsum : 0;
      }
    }
  }
  return out;
}
