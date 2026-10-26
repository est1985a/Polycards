// Handwriting answer mode (experimental). Everything for it lives in src/handwriting/;
// set HANDWRITING_ENABLED to false to hide the whole feature (including /hw-test).

export const HANDWRITING_ENABLED = true;

// The hidden test page's address (not linked from the app).
export function isHwTestPath(pathname) {
  return HANDWRITING_ENABLED && /^\/hw-test\/?$/.test(pathname);
}

// Letter practice (れんしゅう？ under a red / orange box after a handwriting answer). false hides it
// (and the /hw-letters page).
export const PRACTICE_ENABLED = true;

// The hidden page showing every letter guide (not linked from the app).
export function isHwLettersPath(pathname) {
  return HANDWRITING_ENABLED && PRACTICE_ENABLED && /^\/hw-letters\/?$/.test(pathname);
}

// A practice box passes the shape check when the model's top letter is the target, or the target got
// at least this probability. Look-alikes (LENIENT_PAIRS) pass only when the height check passes too.
export const PRACTICE_MIN_TARGET_PROB = 0.25;

// Height check against the four lines: how far the top / bottom of the ink may be from the line it
// should touch, as a fraction of the gap between two lines. false switches the height check (and the
// i / j dot check) off, so only the model decides.
export const PRACTICE_HEIGHT_TOLERANCE = 0.4;
export const PRACTICE_HEIGHT_CHECK = true;

// A practice box is checked this long after the pen last lifted (a new stroke restarts the wait).
export const PRACTICE_CHECK_DELAY_MS = 1000;

// The model's input is drawn again with an ink width of this fraction of the letter's own size, so a
// small letter in a tall practice box looks like a letter in the answer boxes (where the ink is about
// this thick for a letter that fills the box).
export const PRACTICE_MODEL_INK = 0.09;

// The letter model (public/models/emnist/), loaded only when handwriting is used.
export const MODEL_URL = "/models/emnist/model.json";
export const TEST_DATA_URL = "/models/emnist/test/";
export const LABELS = "abcdefghijklmnopqrstuvwxyz".split("");

// The model always runs on exactly this many boxes at once (unused slots are blank images).
// WebGL compiles its shaders for each new input shape, which took ~5 s on an iPad, so a
// fixed shape means it compiles only once (during the warm-up).
export const BATCH_SIZE = 16;

// A read that takes longer than this is given up (practice: the box asks to write again; review: typing
// instead), so a box is never left waiting with no result. A normal read takes well under a second.
export const RECOGNITION_TIMEOUT_MS = 15000;

// Letters the model often mixes up. Target letter → what it may be read as.
// A box read this way still counts as correct, but gets an orange warning.
export const LENIENT_PAIRS = { i: "l", l: "i", g: "q", q: "g" };

// A box the model read as another letter is still lenient (correct, with an orange warning)
// when the model gave the target letter at least this probability.
export const MIN_TARGET_PROB = 0.25;

// false: a word with a lenient box still counts as わかった, but without the spelling bonus.
export const LENIENT_GIVES_BONUS = true;

// Ink thickness relative to the box height (training used 18 px in a 280 px box).
export const STROKE_RATIO = 18 / 280;

// Handwriting-only colors (the boxes are always paper-white with black ink, whatever the
// theme, because that is what the model was trained on). Orange is kept apart from gold.
export const HW_COLORS = {
  ink: "#000000",
  paper: "#ffffff",
  lenient: "#ff8a1f",
  lenientBg: "#ffe3c7",
  // Letter practice: a passed box is always this green, whatever the theme, so it reads as correct.
  pass: "#1f9d55",
  passBg: "#d6f5e1",
  passInk: "#ffffff",
  // The four lines (line 2 dashed, line 3 the red baseline), the faint letter to trace, and the
  // numbered start dots of the stroke-order guide.
  guide: "#9aa3b5",
  guideBaseline: "#e5484d",
  trace: "#cdd2dc",
  startDot: "#2f6fde",
  startText: "#ffffff",
};
