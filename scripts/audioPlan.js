// Rules for scripts/generate-audio.mjs (pure functions, tested in audioPlan.test.js).
import { createHash } from 'node:crypto';
import { Mp3Encoder } from '@breezystack/lamejs';
import { speechText } from '../src/lib/speech.js';

export const MODEL = "gemini-3.8-flash-tts";
export const VOICE = "Achird";
export const LANGUAGE = "en-US";
// Saved in words.audio_voice. Anything else there (e.g. "en-US-Chirp3-HD-Achird") is an older recording.
export const ENGINE = `${MODEL}/${VOICE}`;
// How to say it. Sent only as speechMetadata.style: the model reads the text itself word for word.
export const STYLE = "Say the word clearly and naturally, at a slightly slower pace than normal, with standard American pronunciation. Use a calm, friendly, neutral tone and falling intonation, like reading a word from a vocabulary list. Don't exaggerate or separate the syllables.";
export const DEFAULT_DELAY_MS = 1000;
export const PREVIEW_DIR = "audio-preview";
export const PREVIEW_LIMIT = 10;
export const MP3_KBPS = 48;
export const MAX_RETRIES = 4;

// Prices (USD) for the cost estimate. Audio is about 25 tokens per second.
export const INPUT_PRICE_PER_M = 0.5;
export const AUDIO_PRICE_PER_M = 9;
export const AUDIO_TOKENS_PER_SECOND = 25;

// What to record for a word: speak_as when set, otherwise the English cleaned the same way the
// app's built-in voice reads it ("one of ..." → "one of"), ending in a full stop unless it
// already ends in . ? or ! ("tiny" → "tiny.", "How about you?" stays). "" = nothing to record.
export function recordingText(word) {
  const speakAs = (word.speak_as || "").trim();
  const text = speakAs || speechText(word.english);
  if (!text || /[.?!]$/.test(text)) return text;
  return `${text}.`;
}

// What to do with a word whose recording text is `text`:
//   "record"       no file yet, the text changed, a different Gemini voice, or picked with --word
//   "skip-gemini"  already recorded by this engine with this text
//   "skip-chirp"   an older (Chirp) recording of the same text; recorded only with overwriteChirp
export function planWord(word, text, { overwriteChirp = false, picked = false } = {}) {
  if (picked || !word.audio_path || word.audio_text !== text) return "record";
  if (word.audio_voice === ENGINE) return "skip-gemini";
  if (String(word.audio_voice || "").startsWith("gemini-")) return "record";
  return overwriteChirp ? "record" : "skip-chirp";
}

// True when --word "<text>" names this word (its English or speak_as, ignoring case and spaces).
export function matchesWord(word, wanted) {
  const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
  const w = norm(wanted);
  return Boolean(w) && (norm(word.english) === w || norm(word.speak_as) === w);
}

// File name: the word id plus a short hash of the engine, style and text. A changed recording gets
// a new name, so iPads and the CDN (files are cached for a year) never keep playing the old one.
export function audioFileName(wordId, text, engine = ENGINE, style = STYLE) {
  const hash = createHash("sha256").update(`${engine}\n${style}\n${text}`).digest("hex").slice(0, 8);
  return `${wordId}-${hash}.mp3`;
}

export function geminiUrl(projectId) {
  return `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/global/publishers/google/models/${MODEL}:generateContent`;
}

// The generateContent body for one word. The style never goes into the text.
export function geminiRequest(text) {
  return {
    contents: [{ role: "user", parts: [{ text, speechMetadata: { style: STYLE } }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { voice: VOICE }, languageCode: LANGUAGE },
    },
  };
}

// The base64 WAV in a generateContent response (camelCase or snake_case), or null.
export function audioFromResponse(body) {
  const part = body?.candidates?.[0]?.content?.parts?.[0];
  const inline = part?.inlineData || part?.inline_data;
  return inline?.data || null;
}

// A WAV file → { sampleRate, samples (mono Int16Array), seconds }. Only 16-bit PCM is accepted;
// stereo would be mixed down to mono.
export function parseWav(buffer) {
  const buf = Buffer.from(buffer);
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("The audio is not a WAV file.");
  }
  let format = null;
  for (let at = 12; at + 8 <= buf.length;) {
    const id = buf.toString("ascii", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    const start = at + 8;
    if (id === "fmt ") {
      format = { code: buf.readUInt16LE(start), channels: buf.readUInt16LE(start + 2), sampleRate: buf.readUInt32LE(start + 4), bits: buf.readUInt16LE(start + 14) };
    } else if (id === "data") {
      if (!format) throw new Error("The WAV file has no format chunk.");
      if ((format.code !== 1 && format.code !== 0xfffe) || format.bits !== 16) throw new Error("The WAV file is not 16-bit PCM.");
      const end = Math.min(start + size, buf.length); // a streamed WAV can say its size is 0xFFFFFFFF
      const frames = Math.floor((end - start) / (2 * format.channels));
      const samples = new Int16Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < format.channels; c++) sum += buf.readInt16LE(start + (i * format.channels + c) * 2);
        samples[i] = Math.round(sum / format.channels);
      }
      return { sampleRate: format.sampleRate, samples, seconds: frames / format.sampleRate };
    }
    at = start + size + (size % 2);
  }
  throw new Error("The WAV file has no audio data.");
}

// Mono 16-bit samples → MP3 bytes (small enough for single words).
export function encodeMp3(samples, sampleRate, kbps = MP3_KBPS) {
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const chunks = [];
  for (let i = 0; i < samples.length; i += 1152) chunks.push(encoder.encodeBuffer(samples.subarray(i, i + 1152)));
  chunks.push(encoder.flush());
  return Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.length)));
}

// Rough numbers for a --dry-run, before Google has said anything.
export function guessTokens(text) {
  return {
    inputTokens: Math.ceil((text.length + STYLE.length) / 4),
    audioTokens: Math.ceil((0.8 + text.length * 0.06) * AUDIO_TOKENS_PER_SECOND),
  };
}

export function audioTokensFor(seconds) {
  return Math.ceil(seconds * AUDIO_TOKENS_PER_SECOND);
}

export function estimateCost({ inputTokens = 0, audioTokens = 0 }) {
  return (inputTokens * INPUT_PRICE_PER_M + audioTokens * AUDIO_PRICE_PER_M) / 1e6;
}

// Rate limits and Google's own hiccups are worth another try; everything else isn't.
export function isRetryable(status, message = "") {
  return [429, 500, 502, 503, 504].includes(status) || /RESOURCE_EXHAUSTED|UNAVAILABLE/.test(message);
}

// Wait before retry number `attempt` (0 = first retry): Google's Retry-After seconds when given
// (at most a minute), otherwise 2 s, 4 s, 8 s, 16 s.
export function retryDelay(attempt, retryAfter) {
  const seconds = Number(retryAfter);
  if (retryAfter != null && retryAfter !== "" && Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 60) * 1000;
  return 2000 * 2 ** attempt;
}

// Command line. Throws on anything unknown.
//   --dry-run  --limit N  --delay ms  --preview [dir]  --word "<text>" (repeatable)  --overwrite-chirp
export function parseOptions(argv) {
  const options = { dryRun: false, limit: Infinity, delayMs: DEFAULT_DELAY_MS, preview: null, words: [], overwriteChirp: false, heteronyms: false };
  let limitGiven = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--overwrite-chirp") options.overwriteChirp = true;
    else if (arg === "--heteronyms") options.heteronyms = true;
    else if (arg === "--preview") {
      const next = argv[i + 1];
      options.preview = next && !next.startsWith("--") ? argv[++i] : PREVIEW_DIR;
    } else if (arg === "--word") {
      const next = argv[++i];
      if (!next || next.startsWith("--") || !next.trim()) throw new Error('--word needs a word, e.g. --word "dog"');
      options.words.push(next);
    } else if (arg === "--limit" || arg === "--delay") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 0) throw new Error(`${arg} needs a whole number, e.g. ${arg} 5`);
      if (arg === "--limit") {
        options.limit = n;
        limitGiven = true;
      } else options.delayMs = n;
    } else {
      throw new Error(`Unknown option "${arg}". Use --dry-run, --limit N, --delay ms, --preview [folder], --word "<text>", --overwrite-chirp or --heteronyms.`);
    }
  }
  // A preview is a small listening test unless you say otherwise.
  if (options.preview && !limitGiven && !options.words.length) options.limit = PREVIEW_LIMIT;
  return options;
}

// A plain-language hint for a failed Google request (or a sign-in problem before it).
export function googleErrorHint(status, message = "") {
  const m = message.toLowerCase();
  if (m.includes("could not load the default credentials") || m.includes("enoent") || m.includes("no such file")) return "GOOGLE_APPLICATION_CREDENTIALS in .env.audio must be the full path to the service account's JSON file.";
  if (m.includes("has not been used") || m.includes("is disabled") || m.includes("service_disabled")) return "Turn on the Gemini Enterprise API (aiplatform.googleapis.com) in Google Cloud for this project.";
  if (m.includes("billing")) return "Billing isn't on for this Google Cloud project.";
  if (m.includes("voice")) return `Google doesn't accept the voice ${VOICE}.`;
  if (status === 401) return "The service account's JSON file isn't accepted (deleted key?). Download a new key.";
  if (status === 403) return "The service account needs the Vertex AI User role in this project.";
  if (status === 404) return `Check GOOGLE_CLOUD_PROJECT in .env.audio (the project ID, not its name) and the model ${MODEL}.`;
  if (status === 429) return "Too many requests: try a bigger --delay.";
  return null;
}

// Errors that will fail for every word: stop the run instead of trying 1,000 more.
export function stopsTheRun(status, message = "") {
  if (status === 401 || status === 403 || status === 404) return true;
  return status === 400 && /voice|language|model|speech_?config|unknown name|invalid json/i.test(message);
}
