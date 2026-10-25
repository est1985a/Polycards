// Rules for scripts/generate-audio.mjs (pure functions, tested in audioPlan.test.js).
import { createHash } from 'node:crypto';
import { speechText } from '../src/lib/speech.js';

export const VOICE = "en-US-Chirp3-HD-Achird";
export const LANGUAGE = "en-US";
export const DEFAULT_DELAY_MS = 250;

// What to record for a word: speak_as when set, otherwise the English cleaned the same way the
// app's built-in voice reads it ("How old ...?" → "How old"). "" = nothing to record.
export function recordingText(word) {
  const speakAs = (word.speak_as || "").trim();
  return speakAs || speechText(word.english);
}

// True when the word has no file yet, or its text or the voice changed since it was recorded.
export function needsRecording(word, text, voice = VOICE) {
  return !word.audio_path || word.audio_text !== text || word.audio_voice !== voice;
}

// File name: the word id plus a short hash of the text and voice. A changed recording gets a new
// name, so iPads and the CDN (files are cached for a year) never keep playing the old one.
export function audioFileName(wordId, text, voice = VOICE) {
  const hash = createHash("sha256").update(`${voice}\n${text}`).digest("hex").slice(0, 8);
  return `${wordId}-${hash}.mp3`;
}

// Command line: --dry-run, --limit N, --delay ms. Throws on anything else.
export function parseOptions(argv) {
  const options = { dryRun: false, limit: Infinity, delayMs: DEFAULT_DELAY_MS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--limit" || arg === "--delay") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 0) throw new Error(`${arg} needs a whole number, e.g. ${arg} 5`);
      if (arg === "--limit") options.limit = n;
      else options.delayMs = n;
    } else {
      throw new Error(`Unknown option "${arg}". Use --dry-run, --limit N or --delay ms.`);
    }
  }
  return options;
}

// A plain-language hint for a failed Google Text-to-Speech request.
export function googleErrorHint(status, message = "") {
  const m = message.toLowerCase();
  if (m.includes("api key not valid") || m.includes("api_key_invalid")) return "The GOOGLE_TTS_API_KEY in .env.audio is wrong.";
  if (m.includes("has not been used") || m.includes("is disabled") || m.includes("service_disabled")) return "Turn on the Cloud Text-to-Speech API in Google Cloud for this key's project.";
  if (m.includes("voice")) return `Google doesn't accept the voice ${VOICE}.`;
  if (status === 403) return "The key isn't allowed to use Text-to-Speech (check its API restrictions and billing).";
  if (status === 429) return "Too many requests: try a bigger --delay.";
  return null;
}

// Errors that will fail for every word: stop the run instead of trying 1,000 more.
export function stopsTheRun(status, message = "") {
  if (status === 401 || status === 403) return true;
  return status === 400 && /api key|voice/i.test(message);
}
