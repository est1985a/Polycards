// Handwriting answer mode (experimental). Everything for it lives in src/handwriting/;
// set HANDWRITING_ENABLED to false to hide the whole feature (including /hw-test).

export const HANDWRITING_ENABLED = true;

// The hidden test page's address (not linked from the app).
export function isHwTestPath(pathname) {
  return HANDWRITING_ENABLED && /^\/hw-test\/?$/.test(pathname);
}

// The letter model (public/models/emnist/), loaded only when handwriting is used.
export const MODEL_URL = "/models/emnist/model.json";
export const TEST_DATA_URL = "/models/emnist/test/";
export const LABELS = "abcdefghijklmnopqrstuvwxyz".split("");

// Letters the model often mixes up. Target letter → what it may be read as.
// A box read this way still counts as correct, but gets an orange warning.
export const LENIENT_PAIRS = { i: "l", l: "i", g: "q", q: "g" };

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
};
