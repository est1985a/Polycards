// Pronunciation: plays a card's English word. A word with a recorded file (words.audio_path, made by
// npm run audio with Google Text-to-Speech) plays that MP3; otherwise, or if the file can't load,
// the browser's own speech (Web Speech API) reads it. English only: callers pass the card's main
// `en` and its `audioPath`, never alternate answers and never Japanese. Nothing here ever throws,
// so a browser that refuses to play (e.g. iOS before the first tap) can't break a card.
import { supabaseUrl } from './supabaseClient.js';

export const SLOW_RATE = 0.75;
export const AUDIO_BUCKET = "word-audio";
const PREFERRED_VOICE = "Samantha"; // Apple's standard US voice; other en-US voices may be novelty ones

// The text to read (and to record, see scripts/generate-audio.mjs): what a student would say.
// - "a / b" (two forms): only the first form
// - [ ] and ( ) with what's inside: removed ("have never [not] been to", "kind(s) of")
// - "...", "....", "…", "～", "~" (placeholders): removed, with a "?" "!" or "," right after them
//   ("How old ...?" → "How old") and an attached "ing" ("enjoy ...ing" → "enjoy"); a single
//   sentence period stays
// - spaces tidied, no space before . ? !
export function speechText(english) {
  if (!english) return "";
  return String(english)
    .split("/")[0]
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, "")
    .replace(/(?:\.{2,}|\u2026|\uFF5E|~)(?:ing\b)?\s*[?!,]*/g, " ") // ... … ～ ~
    .replace(/\s+/g, " ")
    .replace(/\s+([.?!,])/g, "$1")
    .trim();
}

// The public URL of a recorded file in the word-audio bucket.
export function wordAudioUrl(path, base = supabaseUrl) {
  return `${base}/storage/v1/object/public/${AUDIO_BUCKET}/${encodeURI(path)}`;
}

function synth(win) {
  try {
    return win?.speechSynthesis && win?.SpeechSynthesisUtterance ? win.speechSynthesis : null;
  } catch {
    return null;
  }
}

// True when this browser can speak (if not, the speaker buttons and settings are hidden; the
// built-in voice is the fallback for every recorded word, so it's still needed).
export function speechAvailable(win = typeof window !== "undefined" ? window : undefined) {
  return synth(win) !== null;
}

// Samantha when the device has her; otherwise null = the device's default voice for en-US.
// getVoices() can be empty at first on Safari; that just means the default voice.
function pickVoice(speech) {
  const voices = speech.getVoices?.() || [];
  return voices.find((v) => v.name === PREFERRED_VOICE && /^en[-_]US$/i.test(v.lang)) || null;
}

function speakBuiltIn(text, slow, win) {
  const speech = synth(win);
  const words = speechText(text);
  if (!speech || !words) return;
  try {
    speech.cancel();
    const utterance = new win.SpeechSynthesisUtterance(words);
    utterance.lang = "en-US";
    utterance.rate = slow ? SLOW_RATE : 1;
    const voice = pickVoice(speech);
    if (voice) utterance.voice = voice;
    speech.speak(utterance);
  } catch (error) {
    console.warn("Could not speak the word:", error);
  }
}

// One audio element per window, reused for every word: on iPad an element that has played once
// from a tap can usually play again later without one, which helps auto-play.
const players = new WeakMap();
function player(win) {
  try {
    if (!win?.Audio) return null;
    if (!players.has(win)) players.set(win, new win.Audio());
    return players.get(win);
  } catch {
    return null;
  }
}

// Goes up with every word and every stop, so a late error from an earlier word is ignored.
let playToken = 0;

function stopAll(win) {
  try {
    players.get(win)?.pause();
  } catch {
    // ignore
  }
  try {
    synth(win)?.cancel();
  } catch {
    // ignore
  }
}

// Plays one English word. Stops anything still playing first, so taps never queue up.
// audioPath: the recorded file (null → the built-in voice). slow: rate 0.75, natural pitch.
export function speakWord(text, { slow = false, audioPath = null } = {}, win = typeof window !== "undefined" ? window : undefined) {
  const token = ++playToken;
  stopAll(win);
  const audio = audioPath ? player(win) : null;
  if (!audio) {
    speakBuiltIn(text, slow, win);
    return;
  }

  let fellBack = false;
  const fallBack = (error) => {
    if (fellBack || token !== playToken) return; // already done, or another word has started
    fellBack = true;
    console.warn("Recorded audio could not play, using the built-in voice:", error);
    speakBuiltIn(text, slow, win);
  };
  try {
    const rate = slow ? SLOW_RATE : 1;
    audio.onerror = () => fallBack(audio.error);
    audio.src = wordAudioUrl(audioPath);
    audio.preservesPitch = true;
    audio.webkitPreservesPitch = true;
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
    const playing = audio.play();
    playing?.catch?.((error) => {
      if (error?.name === "NotAllowedError") return; // iOS blocked a play without a tap: stay quiet
      fallBack(error);
    });
  } catch (error) {
    fallBack(error);
  }
}

// Stops playing (a card left the screen).
export function stopSpeaking(win = typeof window !== "undefined" ? window : undefined) {
  playToken++;
  stopAll(win);
}
