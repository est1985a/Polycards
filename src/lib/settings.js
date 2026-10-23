// Settings saved on this device (localStorage). Every read and write is wrapped in try/catch:
// private browsing or blocked site data must never break the app. Pure helpers that take the
// storage as an argument, so they are easy to test.
// The theme is saved on the account (gacha_set_theme); the copy here is only a cache so the
// right theme shows before the first screen draws.
import { SESSION_SIZES, DEFAULT_SESSION_SIZE } from './srs';

const SESSION_SIZE_KEY = "polycards.sessionSize";
const REDUCE_MOTION_KEY = "polycards.reduceMotion";
const THEME_KEY = "polycards.theme";
const SEEN_THEMES_PREFIX = "polycards.seenThemes.";

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

// Unlocked themes this student has already been told about, per user: a list of theme keys.
// Broken data counts as none seen.
export function loadSeenThemes(storage, userId) {
  if (!userId) return [];
  try {
    const list = JSON.parse(read(storage, SEEN_THEMES_PREFIX + userId));
    return Array.isArray(list) ? list.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function saveSeenThemes(storage, userId, keys) {
  if (!userId) return;
  write(storage, SEEN_THEMES_PREFIX + userId, JSON.stringify(keys));
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
