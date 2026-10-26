// The foil pack's outline on its 120 × 160 grid (pure data), shared by PackIcon.jsx and the
// small pack icon in Tabs.jsx.

// A zigzag (crimped) edge from x 4 to 116 at height y, teeth pointing `dir` (-1 up, 1 down).
export function crimp(y, dir) {
  const pts = [];
  for (let x = 4, i = 0; x <= 116; x += 8, i++) pts.push(`${x},${y + (i % 2 ? dir * 6 : 0)}`);
  return pts;
}

// The body (below the tear line, crimped bottom) and the strip that tears off (crimped top).
export const PACK_BODY = ["4,22", "116,22", ...crimp(144, 1).reverse()].join(" ");
export const PACK_STRIP = [...crimp(6, -1), "116,22", "4,22"].join(" ");
