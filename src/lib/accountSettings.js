// Settings saved on the student's account (user_settings.settings, supabase/polycards-user-settings.sql),
// with a copy on the device (the localStorage keys in settings.js / spelling.js) so the app starts
// with the right settings before the account answers. Pure helpers; App does the syncing:
// - signed in with no account row yet: the device's settings are uploaded (nobody loses their setup);
// - otherwise the account wins, and every change is saved on both.
// The theme is not here: it is saved on the account in user_gacha.theme (gacha_set_theme, which
// refuses locked themes).
import { SESSION_SIZES, DEFAULT_SESSION_SIZE } from './srs';
import { LANGS, DEFAULT_LANG } from '../i18n';
import { ANSWER_MODES, loadAnswerMode, saveAnswerMode } from './spelling';
import {
  loadSessionSize, saveSessionSize, loadReduceMotion, saveReduceMotion, loadAutoPlay, saveAutoPlay,
  loadSlowSpeech, saveSlowSpeech, loadLang, saveLang,
} from './settings';

export const SETTING_DEFAULTS = {
  sessionSize: DEFAULT_SESSION_SIZE,
  answerMode: "off",
  reduceMotion: false,
  autoPlay: true,
  slowSpeech: false,
  lang: DEFAULT_LANG,
};

const isBool = (v) => typeof v === "boolean";
const VALID = {
  sessionSize: (v) => SESSION_SIZES.includes(v),
  answerMode: (v) => ANSWER_MODES.includes(v),
  reduceMotion: isBool,
  autoPlay: isBool,
  slowSpeech: isBool,
  lang: (v) => LANGS.includes(v),
};

// The account's settings laid over a base (the device's): each valid value from the account wins,
// anything missing or broken keeps the base's value. Unknown keys are dropped.
// handwritingEnabled false (HANDWRITING_ENABLED): 手書き becomes typing, as on the device.
export function mergeSettings(base, account, handwritingEnabled = true) {
  const merged = { ...base };
  if (account && typeof account === "object" && !Array.isArray(account)) {
    for (const key of Object.keys(SETTING_DEFAULTS)) {
      if (VALID[key](account[key])) merged[key] = account[key];
    }
  }
  if (merged.answerMode === "handwriting" && !handwritingEnabled) merged.answerMode = "typing";
  return merged;
}

// Only the known keys, in a fixed order (what is sent to the account).
export function settingsPayload(settings) {
  const out = {};
  for (const key of Object.keys(SETTING_DEFAULTS)) out[key] = settings[key];
  return out;
}

export function sameSettings(a, b) {
  return Object.keys(SETTING_DEFAULTS).every((key) => a?.[key] === b?.[key]);
}

// The copy on the device.
export function loadDeviceSettings(storage, handwritingEnabled = true) {
  return {
    sessionSize: loadSessionSize(storage),
    answerMode: loadAnswerMode(storage, handwritingEnabled),
    reduceMotion: loadReduceMotion(storage),
    autoPlay: loadAutoPlay(storage),
    slowSpeech: loadSlowSpeech(storage),
    lang: loadLang(storage),
  };
}

export function saveDeviceSettings(storage, settings) {
  saveSessionSize(storage, settings.sessionSize);
  saveAnswerMode(storage, settings.answerMode);
  saveReduceMotion(storage, settings.reduceMotion);
  saveAutoPlay(storage, settings.autoPlay);
  saveSlowSpeech(storage, settings.slowSpeech);
  saveLang(storage, settings.lang);
}

// Log-out: the device goes back to the defaults, so the next student on a shared iPad never
// starts with (or uploads) someone else's settings. Their own come back from the account.
export function clearDeviceSettings(storage) {
  saveDeviceSettings(storage, SETTING_DEFAULTS);
  try { storage?.removeItem("polycards.typingMode"); } catch { /* blocked site data */ }
}
