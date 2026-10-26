// Settings saved on this device (localStorage). Every read and write is wrapped in try/catch:
// private browsing or blocked site data must never break the app. Pure helpers that take the
// storage as an argument, so they are easy to test.
// The theme is saved on the account (gacha_set_theme); the copy here is only a cache so the
// right theme shows before the first screen draws.
import { SESSION_SIZES, DEFAULT_SESSION_SIZE } from './srs';
import { LANGS, DEFAULT_LANG, setLang } from '../i18n';

const SESSION_SIZE_KEY = "polycards.sessionSize";
const REDUCE_MOTION_KEY = "polycards.reduceMotion";
const AUTO_PLAY_KEY = "polycards.autoPlay";
const SLOW_SPEECH_KEY = "polycards.slowSpeech";
const THEME_KEY = "polycards.theme";
const LANG_KEY = "polycards.lang";

function read(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage, key, value) {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // ignore: private browsing or blocked site data
  }
}

// 1回の枚数: 10, 20 or 30 cards per review. Anything else gives 20.
export function loadSessionSize(storage) {
  const n = Number(read(storage, SESSION_SIZE_KEY));
  return SESSION_SIZES.includes(n) ? n : DEFAULT_SESSION_SIZE;
}

export function saveSessionSize(storage, size) {
  write(storage, SESSION_SIZE_KEY, String(size));
}

// カードの動きを減らす: off unless "true" is saved.
export function loadReduceMotion(storage) {
  return read(storage, REDUCE_MOTION_KEY) === "true";
}

export function saveReduceMotion(storage, on) {
  write(storage, REDUCE_MOTION_KEY, on ? "true" : "false");
}

// 自動再生 (read the English word aloud when it appears): off unless "true" is saved.
export function loadAutoPlay(storage) {
  return read(storage, AUTO_PLAY_KEY) === "true";
}

export function saveAutoPlay(storage, on) {
  write(storage, AUTO_PLAY_KEY, on ? "true" : "false");
}

// ゆっくり (slower speech): off unless "true" is saved.
export function loadSlowSpeech(storage) {
  return read(storage, SLOW_SPEECH_KEY) === "true";
}

export function saveSlowSpeech(storage, on) {
  write(storage, SLOW_SPEECH_KEY, on ? "true" : "false");
}

// Theme cache: the key of the last theme applied (null if none). An unknown key is still
// returned; getTheme() in src/themes.js turns it into the default theme.
export function loadThemeCache(storage) {
  return read(storage, THEME_KEY) || null;
}

export function saveThemeCache(storage, key) {
  write(storage, THEME_KEY, key);
}

export function clearThemeCache(storage) {
  write(storage, THEME_KEY, null);
}

// 言語 / Language: "ja" or "en". Anything else (or nothing saved) gives Japanese.
export function loadLang(storage) {
  const lang = read(storage, LANG_KEY);
  return LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

export function saveLang(storage, lang) {
  write(storage, LANG_KEY, lang);
}

// Switches the app's text to this language and sets <html lang> to match. Returns the language used.
export function applyLang(lang, root = typeof document !== "undefined" ? document.documentElement : null) {
  const used = setLang(lang);
  if (root) root.lang = used;
  return used;
}

// The reduce-motion switch: data-reduce-motion="true" on <html>. Every rule in a
// prefers-reduced-motion block in src/index.css also applies under it.
export function applyReduceMotion(on, root = document.documentElement) {
  if (on) root.setAttribute("data-reduce-motion", "true");
  else root.removeAttribute("data-reduce-motion");
}

// For motion done in JavaScript: true when the device's own Reduce Motion setting or the app's
// switch is on.
export function reduceMotionOn(win = typeof window !== "undefined" ? window : undefined) {
  if (!win) return false;
  if (win.document?.documentElement?.getAttribute?.("data-reduce-motion") === "true") return true;
  return !!win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// TEMPORARY dev-only theme try-out: under npm run dev, ?theme=pizza in the URL shows that theme
// and the saved theme is not applied. Always null on the live site.
export function devThemeOverride(isDev = import.meta.env.DEV, search = typeof location !== "undefined" ? location.search : "") {
  return isDev ? new URLSearchParams(search).get("theme") : null;
}
