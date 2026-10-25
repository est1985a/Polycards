// Stroke-order guides for letter practice: all 26 capitals and 26 small letters, in the plain print
// style taught in Japanese junior high textbooks (single-story a and g, q with a straight tail, the
// dots of i and j as their own stroke).
//
// Coordinates are in "line units" on the English four lines (英語の4線): y = 0 on line 1 (top),
// 1 on line 2 (dashed), 2 on line 3 (the red baseline), 3 on line 4 (bottom). x uses the same unit,
// from 0 to the letter's width. Each stroke has a `kind`: its short description under the guide
// comes from practice.stroke.<kind> in src/i18n/.

// The four lines as fractions of a box's height (equal gaps, with room above line 1 and below line 4).
export const FOUR_LINES = [0.16, 0.16 + 0.68 / 3, 0.16 + (0.68 * 2) / 3, 0.84];

// Where the lines are in a box `height` px tall. gap = one line unit in px.
export function lineMetrics(height) {
  const lines = FOUR_LINES.map((f) => f * height);
  return { lines, top: lines[0], gap: lines[1] - lines[0] };
}

// Letter practice: 4 boxes in a row, 10 px apart, each between 56 and 92 px wide (plus its 3 px
// border) for the space available.
export const PRACTICE_BOXES = 4;
export const PRACTICE_BOX_GAP = 10;
export function practiceBoxWidth(available) {
  if (!available) return 84;
  const border = 3;
  return Math.max(56, Math.min(92, Math.floor((available - PRACTICE_BOX_GAP * (PRACTICE_BOXES - 1)) / PRACTICE_BOXES) - 2 * border));
}

// The other case of a letter (B ⇄ b).
export function otherCase(letter) {
  return letter === letter.toUpperCase() ? letter.toLowerCase() : letter.toUpperCase();
}

// Line units → px for a letter centered in a box (width × height px).
export function letterMapper(letter, width, height) {
  const { top, gap } = lineMetrics(height);
  const x0 = (width - (LETTER_GUIDES[letter]?.width ?? 0) * gap) / 2;
  return ([x, y]) => [x0 + x * gap, top + y * gap];
}

// Builds one stroke from moves, lines and elliptical arcs. Angles are in degrees on the screen
// (y down): 0 = right, 90 = bottom, 180 = left, -90 = top. A decreasing angle goes counterclockwise
// as you see it (top → left → bottom); an increasing one goes clockwise.
class Stroke {
  constructor(kind) {
    this.kind = kind;
    this.segs = []; // { t: "M" | "L" | "C", p: [[x, y], ...] }
    this.points = []; // sampled along the stroke (for the bounds and the tests)
    this.cur = null;
  }

  M(x, y) {
    this.segs.push({ t: "M", p: [[x, y]] });
    this.points.push([x, y]);
    this.cur = [x, y];
    return this;
  }

  L(x, y) {
    if (!this.cur) return this.M(x, y);
    this.segs.push({ t: "L", p: [[x, y]] });
    this.points.push([x, y]);
    this.cur = [x, y];
    return this;
  }

  arc(cx, cy, rx, ry, a0, a1) {
    const rad = (a) => (a * Math.PI) / 180;
    const at = (a) => [cx + rx * Math.cos(rad(a)), cy + ry * Math.sin(rad(a))];
    const tangent = (a) => [-rx * Math.sin(rad(a)), ry * Math.cos(rad(a))];
    const start = at(a0);
    if (!this.cur) this.M(...start);
    else if (Math.hypot(this.cur[0] - start[0], this.cur[1] - start[1]) > 1e-6) this.L(...start);
    const pieces = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90));
    const step = (a1 - a0) / pieces;
    for (let i = 0; i < pieces; i++) {
      const from = a0 + i * step;
      const to = from + step;
      const k = (4 / 3) * Math.tan(rad(to - from) / 4);
      const p0 = at(from), p3 = at(to), d0 = tangent(from), d3 = tangent(to);
      this.segs.push({ t: "C", p: [[p0[0] + k * d0[0], p0[1] + k * d0[1]], [p3[0] - k * d3[0], p3[1] - k * d3[1]], p3] });
      for (let s = 1; s <= 6; s++) this.points.push(at(from + (step * s) / 6));
      this.cur = p3;
    }
    return this;
  }

  done() {
    return { kind: this.kind, segs: this.segs, points: this.points, start: this.points[0] };
  }
}

const s = (kind) => new Stroke(kind);
const dot = (x, y) => ({ kind: "dot", dot: true, segs: [{ t: "M", p: [[x, y]] }], points: [[x, y]], start: [x, y] });
const down = (x, y0 = 0, y1 = 2) => s("down").M(x, y0).L(x, y1);
const across = (x0, x1, y) => s("across").M(x0, y).L(x1, y);

// The SVG path of a stroke, with each point passed through map ([x, y] in line units → [x, y] in px).
// null for a dot (drawn as a circle).
export function strokePath(stroke, map = (p) => p) {
  if (stroke.dot) return null;
  const f = (p) => map(p).map((v) => Math.round(v * 100) / 100).join(" ");
  return stroke.segs.map((seg) => `${seg.t} ${seg.p.map(f).join(" ")}`).join(" ");
}

function def(width, ...strokes) {
  return { width, strokes: strokes.map((x) => (x instanceof Stroke ? x.done() : x)) };
}

export const LETTER_GUIDES = {
  // Capitals: line 1 to line 3.
  A: def(1.4, s("slantDownLeft").M(0.7, 0).L(0, 2), s("slantDownRight").M(0.7, 0).L(1.4, 2), across(0.27, 1.13, 1.25)),
  B: def(1.2, down(0), s("bumps").M(0, 0).L(0.6, 0).arc(0.6, 0.5, 0.45, 0.5, -90, 90).L(0, 1).L(0.68, 1).arc(0.68, 1.5, 0.5, 0.5, -90, 90).L(0, 2)),
  C: def(1.45, s("cLeft").arc(0.75, 1, 0.7, 1, -50, -310)),
  D: def(1.2, down(0), s("bowlRight").M(0, 0).L(0.35, 0).arc(0.35, 1, 0.85, 1, -90, 90).L(0, 2)),
  E: def(1.1, down(0), across(0, 1.1, 0), across(0, 1, 1), across(0, 1.1, 2)),
  F: def(1.1, down(0), across(0, 1.1, 0), across(0, 0.95, 1)),
  G: def(1.53, s("gShape").arc(0.78, 1, 0.75, 1, -45, -350).L(1.52, 1.05).L(0.95, 1.05)),
  H: def(1.3, down(0), down(1.3), across(0, 1.3, 1)),
  // Capital I with short bars at the top and bottom (as taught in Japan), so it isn't mistaken for l.
  I: def(0.8, down(0.4), s("barTop").M(0, 0).L(0.8, 0), s("barBottom").M(0, 2).L(0.8, 2)),
  J: def(1, s("downHookLeft").M(1, 0).L(1, 1.5).arc(0.5, 1.5, 0.5, 0.5, 0, 180)),
  K: def(1.25, down(0), s("slantDownLeft").M(1.2, 0).L(0, 1.15), s("slantDownRight").M(0.42, 0.75).L(1.25, 2)),
  L: def(1.1, s("downThenRight").M(0, 0).L(0, 2).L(1.1, 2)),
  M: def(1.6, down(0), s("slantDownRight").M(0, 0).L(0.8, 2), s("slantUpRight").M(0.8, 2).L(1.6, 0), down(1.6)),
  N: def(1.3, down(0), s("slantDownRight").M(0, 0).L(1.3, 2), down(1.3)),
  O: def(1.5, s("circleLeft").arc(0.75, 1, 0.75, 1, -90, -450)),
  P: def(1.15, down(0), s("bowlRight").M(0, 0).L(0.6, 0).arc(0.6, 0.55, 0.55, 0.55, -90, 90).L(0, 1.1)),
  Q: def(1.5, s("circleLeft").arc(0.75, 1, 0.75, 1, -90, -450), s("slantDownRight").M(0.85, 1.45).L(1.5, 2.1)),
  R: def(1.25, down(0), s("bowlThenLeg").M(0, 0).L(0.6, 0).arc(0.6, 0.55, 0.55, 0.55, -90, 90).L(0.3, 1.1).L(1.25, 2)),
  S: def(1.15, s("sShape").arc(0.6, 0.5, 0.5, 0.5, -20, -200).arc(0.6, 1.5, 0.55, 0.5, -60, 160)),
  T: def(1.4, across(0, 1.4, 0), down(0.7)),
  U: def(1.3, s("uShape").M(0, 0).L(0, 1.35).arc(0.65, 1.35, 0.65, 0.65, 180, 0).L(1.3, 0)),
  V: def(1.4, s("vee").M(0, 0).L(0.7, 2).L(1.4, 0)),
  W: def(1.9, s("doubleVee").M(0, 0).L(0.45, 2).L(0.95, 0).L(1.45, 2).L(1.9, 0)),
  X: def(1.3, s("slantDownRight").M(0, 0).L(1.3, 2), s("slantDownLeft").M(1.3, 0).L(0, 2)),
  Y: def(1.4, s("slantDownRight").M(0, 0).L(0.7, 1), s("slantDownLeft").M(1.4, 0).L(0.7, 1), down(0.7, 1, 2)),
  Z: def(1.3, s("zShape").M(0, 0).L(1.3, 0).L(0, 2).L(1.3, 2)),

  // Small letters: line 2 to line 3; tall ones from line 1, tails down to line 4.
  a: def(0.86, s("circleThenDown").arc(0.43, 1.5, 0.43, 0.5, -20, -360).L(0.86, 1).L(0.86, 2)),
  b: def(0.9, s("downThenRound").M(0, 0).L(0, 2).L(0, 1.5).arc(0.45, 1.5, 0.45, 0.5, 180, 540)),
  c: def(0.92, s("cLeft").arc(0.47, 1.5, 0.45, 0.5, -40, -320)),
  d: def(0.9, s("circleThenUpDown").arc(0.45, 1.5, 0.45, 0.5, -10, -360).L(0.9, 0).L(0.9, 2)),
  e: def(0.9, s("eShape").M(0.05, 1.5).L(0.9, 1.5).arc(0.475, 1.5, 0.425, 0.5, 0, -320)),
  f: def(0.8, s("hookDown").arc(0.55, 0.3, 0.25, 0.3, -30, -180).L(0.3, 2), across(0, 0.65, 1)),
  g: def(0.9, s("circleThenHook").arc(0.45, 1.5, 0.45, 0.5, -10, -360).L(0.9, 1).L(0.9, 2.6).arc(0.5, 2.6, 0.4, 0.4, 0, 160)),
  h: def(0.9, s("downThenHump").M(0, 0).L(0, 2).L(0, 1.45).arc(0.45, 1.45, 0.45, 0.45, 180, 360).L(0.9, 2)),
  i: def(0, down(0, 1, 2), dot(0, 0.55)),
  j: def(0.6, s("downHookLeft").M(0.6, 1).L(0.6, 2.6).arc(0.3, 2.6, 0.3, 0.4, 0, 160), dot(0.6, 0.55)),
  k: def(0.8, down(0), s("angle").M(0.75, 1).L(0.05, 1.55).L(0.8, 2)),
  l: def(0, down(0)),
  m: def(1.3, s("downThenTwoHumps").M(0, 1).L(0, 2).L(0, 1.4).arc(0.325, 1.4, 0.325, 0.4, 180, 360).L(0.65, 2).L(0.65, 1.4).arc(0.975, 1.4, 0.325, 0.4, 180, 360).L(1.3, 2)),
  n: def(0.85, s("downThenHump").M(0, 1).L(0, 2).L(0, 1.4).arc(0.425, 1.4, 0.425, 0.4, 180, 360).L(0.85, 2)),
  o: def(0.9, s("circleLeft").arc(0.45, 1.5, 0.45, 0.5, -90, -450)),
  p: def(0.9, s("downThenRound").M(0, 1).L(0, 3).L(0, 1.5).arc(0.45, 1.5, 0.45, 0.5, 180, 540)),
  q: def(0.9, s("circleThenDown").arc(0.45, 1.5, 0.45, 0.5, -10, -360).L(0.9, 1).L(0.9, 3)),
  r: def(0.7, s("downThenShoulder").M(0, 1).L(0, 2).L(0, 1.45).arc(0.4, 1.45, 0.4, 0.45, 180, 300)),
  s: def(0.73, s("sShape").arc(0.38, 1.25, 0.32, 0.25, -20, -200).arc(0.38, 1.75, 0.35, 0.25, -60, 160)),
  t: def(0.8, s("downCurveRight").M(0.3, 0.45).L(0.3, 1.8).arc(0.55, 1.8, 0.25, 0.2, 180, 20), across(0, 0.7, 1)),
  u: def(0.8, s("uThenDown").M(0, 1).L(0, 1.6).arc(0.4, 1.6, 0.4, 0.4, 180, 0).L(0.8, 1).L(0.8, 2)),
  v: def(0.9, s("vee").M(0, 1).L(0.45, 2).L(0.9, 1)),
  w: def(1.3, s("doubleVee").M(0, 1).L(0.32, 2).L(0.65, 1).L(0.98, 2).L(1.3, 1)),
  x: def(0.85, s("slantDownRight").M(0, 1).L(0.85, 2), s("slantDownLeft").M(0.85, 1).L(0, 2)),
  y: def(0.9, s("slantDownRight").M(0, 1).L(0.52, 2), s("slantDownLeft").M(0.9, 1).L(0.15, 3)),
  z: def(0.85, s("zShape").M(0, 1).L(0.85, 1).L(0, 2).L(0.85, 2)),
};

// Every stroke kind used above (each needs practice.stroke.<kind> in ja.js and en.js).
export const STROKE_KINDS = [...new Set(Object.values(LETTER_GUIDES).flatMap((g) => g.strokes.map((st) => st.kind)))];

// A stroke description split after each Japanese comma (、, built from its character code below) or English ", ".
// Each part is kept on one line, so a long description wraps only at a natural point and never
// leaves one character alone on a line.
export function phraseParts(text) {
  return String(text).split(new RegExp(`(?<=${String.fromCharCode(0x3001)})|(?<=, )`)).filter(Boolean);
}

// Which heights a letter should reach on the four lines.
//   capital: line 1 → line 3          xheight: line 2 → line 3
//   ascender (b d f h k l): line 1 → line 3
//   t: between line 1 and 2 → line 3  descender (g p q y): line 2 → line 4
//   i: dot between line 1 and 2 → line 3    j: dot between line 1 and 2 → line 4
export function letterCategory(letter) {
  if (/^[A-Z]$/.test(letter)) return "capital";
  if ("bdfhkl".includes(letter)) return "ascender";
  if ("gpqy".includes(letter)) return "descender";
  if (letter === "t" || letter === "i" || letter === "j") return letter;
  return "xheight";
}

// The letter's top and bottom in line units, from its guide.
export function guideBounds(letter) {
  const ys = LETTER_GUIDES[letter].strokes.flatMap((st) => st.points.map((p) => p[1]));
  return { top: Math.min(...ys), bottom: Math.max(...ys) };
}
