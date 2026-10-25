// Pronunciation: reads a card's English word aloud with the browser's own speech (Web Speech API).
// No audio files and no outside services. English only: callers pass the card's main `en`, never
// alternate answers and never Japanese. Nothing here ever throws, so a browser that refuses to
// speak (e.g. iOS before the first tap) can't break a card.

export const SLOW_RATE = 0.75;
const PREFERRED_VOICE = "Samantha"; // Apple's standard US voice; other en-US voices may be novelty ones

// The text to read: what a student would say for this card.
// - "a / b" (two forms): only the first form
// - [ ] and ( ) with what's inside: removed ("have never [not] been to", "kind(s) of")
// - "...", "....", "…", "～", "~" (placeholders): removed; a single sentence period stays
// - spaces tidied, no space before . ? !
export function speechText(english) {
  if (!english) return "";
  return String(english)
    .split("/")[0]
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, "")
    .replace(/\.{2,}|\u2026|\uFF5E|~/g, " ") // ... … ～ ~
    .replace(/\s+/g, " ")
    .replace(/\s+([.?!,])/g, "$1")
    .trim();
}

function synth(win) {
  try {
    return win?.speechSynthesis && win?.SpeechSynthesisUtterance ? win.speechSynthesis : null;
  } catch {
    return null;
  }
}

// True when this browser can speak (if not, the speaker buttons and settings are hidden).
export function speechAvailable(win = typeof window !== "undefined" ? window : undefined) {
  return synth(win) !== null;
}

// Samantha when the device has her; otherwise null = the device's default voice for en-US.
// getVoices() can be empty at first on Safari; that just means the default voice.
function pickVoice(speech) {
  const voices = speech.getVoices?.() || [];
  return voices.find((v) => v.name === PREFERRED_VOICE && /^en[-_]US$/i.test(v.lang)) || null;
}

// Reads one English word. Stops anything still being read first, so taps never queue up.
export function speakWord(text, { slow = false } = {}, win = typeof window !== "undefined" ? window : undefined) {
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

// Stops reading (a card left the screen).
export function stopSpeaking(win = typeof window !== "undefined" ? window : undefined) {
  try {
    synth(win)?.cancel();
  } catch {
    // ignore
  }
}
