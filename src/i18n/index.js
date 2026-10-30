import { Fragment, createElement } from 'react';
import ja from './ja.js';
import en from './en.js';

// The app's own text (menus, buttons, messages) lives in ja.js and en.js, one entry per key,
// with the same keys in both. Japanese is the default; setLang() switches (see settings.js).
export const LANGS = ['ja', 'en'];
export const DEFAULT_LANG = 'ja';
const DICTIONARIES = { ja, en };

let current = DEFAULT_LANG;

export function getLang() {
  return current;
}

// Unknown values fall back to Japanese. Returns the language now in use.
export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : DEFAULT_LANG;
  return current;
}

const PLACEHOLDER = /\{(\w+)\}/g;

// The entry for a key: a string, or a function of vars (for text that changes with a number).
// A key missing in the current language uses the Japanese text; a key missing in Japanese too
// shows the key itself. Both log a warning (in development).
function lookup(key, vars) {
  let entry = DICTIONARIES[current][key];
  if (entry === undefined && current !== DEFAULT_LANG) {
    if (import.meta.env?.DEV) console.warn(`i18n: "${key}" is missing in ${current}, using ${DEFAULT_LANG}`);
    entry = DICTIONARIES[DEFAULT_LANG][key];
  }
  if (entry === undefined) {
    if (import.meta.env?.DEV) console.warn(`i18n: missing key "${key}"`);
    return key;
  }
  return typeof entry === 'function' ? entry(vars || {}) : entry;
}

// Text for a key, with {name} placeholders filled in from vars (after a function entry has run).
// A placeholder with no value in vars is left as it is. "" means "show nothing here".
export function t(key, vars) {
  const text = lookup(key, vars);
  if (!vars) return text;
  return text.replace(PLACEHOLDER, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

// Like t(), but always the Japanese text, whatever the setting: for CSV files (headers and file
// names stay Japanese so the school's spreadsheets match).
export function tJa(key, vars) {
  const entry = DICTIONARIES[DEFAULT_LANG][key];
  if (entry === undefined) return key;
  const text = typeof entry === 'function' ? entry(vars || {}) : entry;
  if (!vars) return text;
  return text.replace(PLACEHOLDER, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

// Like t(), but a placeholder may be a React element (e.g. a number in a styled <span>).
// Returns an array of strings and elements to put inside JSX. When {n} is an element, also pass
// the plain number as `count`, so plural entries can pick "1 word" / "3 words".
export function tx(key, vars = {}) {
  return lookup(key, vars)
    .split(/(\{\w+\})/)
    .filter((part) => part !== '')
    .map((part, i) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1];
      if (name === undefined || !(name in vars)) return part;
      return createElement(Fragment, { key: i }, vars[name]);
    });
}
