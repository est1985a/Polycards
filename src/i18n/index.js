import { Fragment, createElement } from 'react';
import ja from './ja.js';

// The app's own text (menus, buttons, messages) lives in ja.js, one entry per key.
// For now there is only Japanese; English mode will add en.js and a way to switch.
const dictionary = ja;

const PLACEHOLDER = /\{(\w+)\}/g;

// The entry for a key: a string, or a function of vars (for text that changes with a number).
// A missing key logs a warning (in development) and shows the key itself.
function lookup(key, vars) {
  const entry = dictionary[key];
  if (entry === undefined) {
    if (import.meta.env?.DEV) console.warn(`i18n: missing key "${key}"`);
    return key;
  }
  return typeof entry === 'function' ? entry(vars || {}) : entry;
}

// Text for a key, with {name} placeholders filled in from vars.
// A placeholder with no value in vars is left as it is.
export function t(key, vars) {
  const text = lookup(key, vars);
  if (!vars) return text;
  return text.replace(PLACEHOLDER, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

// Like t(), but a placeholder may be a React element (e.g. a number in a styled <span>).
// Returns an array of strings and elements to put inside JSX.
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
