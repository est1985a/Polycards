// Card reports: the rules of the report sheet (pure functions). The database checks the same
// limits again (supabase/polycards-card-reports.sql).

// The reasons, in the order the sheet shows them. Text: report.reason.<key> in src/i18n/.
// Same list as the CHECK on card_reports.reason.
export const REPORT_REASONS = ["spelling", "meaning", "example", "accept_answer", "handwriting", "audio", "pos", "display", "other"];

export const NOTE_MAX = 500;
export const ANSWER_MAX = 100;
// Screenshots are made at most this wide (JPEG, SCREENSHOT_QUALITY), so an upload stays small.
export const SCREENSHOT_MAX_WIDTH = 1200;
export const SCREENSHOT_QUALITY = 0.7;
// The automatic screenshot gives up after this long; the sheet then shows no thumbnail.
export const CAPTURE_TIMEOUT_MS = 2000;

// Reasons where a screenshot usually helps: the box is ticked for them until the student
// touches it themselves.
const SCREENSHOT_REASONS = new Set(["display", "other", "handwriting"]);
export function screenshotDefault(reason) {
  return SCREENSHOT_REASONS.has(reason);
}

// Reasons that ask for the student's answer (pre-filled from what they typed or wrote).
const ANSWER_REASONS = new Set(["accept_answer", "handwriting"]);
export function showsAnswerField(reason) {
  return ANSWER_REASONS.has(reason);
}

// The answer to pre-fill for the card on screen in a review, or "" (tap mode, nothing typed).
// typedResult / typed: StudySession's typing-mode state. A handwriting answer: what the model
// read (wrong) or the word it was accepted as (right); writtenAnswer: the main answer as written.
export function reportedAnswer(typedResult, typed, writtenAnswer) {
  let answer = "";
  const read = typedResult?.handwriting;
  if (read) answer = read.allCorrect ? read.accepted ?? writtenAnswer : read.text;
  else if (typedResult) answer = typed;
  return (answer || "").trim().slice(0, ANSWER_MAX);
}

// The size to draw a width × height picture at so it is at most `max` wide and 2 × `max` tall
// (a very tall photo would make a canvas too big for an iPad), never enlarged.
export function fitWithin(width, height, max = SCREENSHOT_MAX_WIDTH) {
  if (!(width > 0 && height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, max / width, (2 * max) / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
