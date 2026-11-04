// Word helpers for the back of the card: cleans a card's English text and finds it in an
// example sentence so it can be highlighted. (The ALC dictionary link was removed on 2026-10-30;
// the in-app dictionary search is at the bottom.)
import { spellingDistance } from './spelling';

// Turn a card's English text into a clean search term:
// drop "(...)" with what's inside, "...", "…" and "?", tidy spaces, lowercase.
export function cleanSearchTerm(english) {
  return (english || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\.{3}|\u2026|\?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// --- Highlighting the word in an example sentence ---

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Any form of "be", for phrases like "be interested in".
const BE_FORMS = "(?:be|am|is|are|was|were|been|being|['\u2019](?:m|s|re))";

// True if a phrase (2+ words) contains the word "be".
const hasBe = (term) => term.includes(' ') && term.split(' ').includes('be');

// Regular expression text for one word or phrase, including common English endings
// for single words of 3+ letters (eat → eats/eating, study → studied, stop → stopped).
// In a phrase, "be" matches any form of be (is, was, 'm ...).
function termPattern(term) {
  const multi = term.includes(' ');
  const words = term.split(' ').map((w) => (multi && w === 'be' ? BE_FORMS : escapeRegExp(w)));
  const forms = [words.join('\\s+')];
  if (words.length === 1 && term.length >= 3 && /^[a-z]+$/.test(term)) {
    forms[0] = `${term}(?:s|es|d|ed|ing|n|en|er|est|ly)?`;
    const stem = term.slice(0, -1);
    const last = term.slice(-1);
    if (last === 'y') forms.push(`${stem}(?:ies|ied|ier|iest|ily)`);
    if (last === 'e') forms.push(`${stem}(?:ing|er|est)`);
    if (/[^aeiouy]/.test(last)) forms.push(`${term}${last}(?:ed|ing|er|est|en)`);
  }
  // \b only where the term starts/ends with a letter or digit (so "mr." still matches).
  const start = /^\w/.test(term) ? '\\b' : '';
  const end = /\w$/.test(term) ? '\\b' : '';
  return `${start}(?:${forms.join('|')})${end}`;
}

// Splits an example sentence into pieces, marking the card's word: [{ text, hit }].
// Matches ignore capitals. "~" in a phrase splits it into parts that are matched one by one.
// Irregular forms (go → went) are not found; then the sentence is returned as one plain piece.
export function highlightParts(sentence, english) {
  if (!sentence) return [];
  const terms = cleanSearchTerm(english).split('~').map((t) => t.trim()).filter(Boolean);
  if (terms.length === 0) return [{ text: sentence, hit: false }];

  const parts = markTerms(sentence, terms);
  if (parts.some((p) => p.hit) || !terms.some(hasBe)) return parts;

  // Nothing found: try again without "be" (e.g. "She is not interested in" → "interested in").
  const withoutBe = terms
    .map((t) => (hasBe(t) ? t.split(' ').filter((w) => w !== 'be').join(' ') : t))
    .filter(Boolean);
  return markTerms(sentence, withoutBe);
}

// Marks every match of the terms in the sentence: [{ text, hit }].
function markTerms(sentence, terms) {
  // Longer terms first, so "look for" wins over "look".
  const pattern = terms.sort((a, b) => b.length - a.length).map(termPattern).join('|');
  const re = new RegExp(pattern, 'gi');

  const parts = [];
  let last = 0;
  for (const m of sentence.matchAll(re)) {
    if (m.index > last) parts.push({ text: sentence.slice(last, m.index), hit: false });
    parts.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < sentence.length) parts.push({ text: sentence.slice(last), hit: false });
  return parts;
}

// --- Dictionary search (the search box in the header, DictionarySearch.jsx) ---
// The index is every library word: { id, english, japanese, reading, pos, alt_answers }
// (fetchDictionaryIndex in api.js). Everything below is pure and tested in dictionary.test.js.


const MAX_RESULTS = 8;

// Katakana → hiragana (ァ–ヶ; ー stays), so タベル finds たべる.
export function toHiragana(text) {
  return (text || '').replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// Japanese text for matching: full-width → normal (NFKC), lower case, katakana → hiragana, and
// ～ ~ … ・ quotes and spaces removed.
export function normalizeJa(text) {
  return toHiragana((text || '').normalize('NFKC').toLowerCase())
    .replace(/\.{2,}|[\uff5e~\u301c\u2026\u30fb\u300c\u300d\u300e\u300f"'\s]/g, '');
}

// English text for matching: NFKC, lower case, curly apostrophes → ', ( ) words, ~ … ... ? ! .
// removed, spaces collapsed.
export function normalizeEn(text) {
  return (text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2019\u2018`\u00b4]/g, "'")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\.{2,}|[~\u301c\uff5e\u2026?!.,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// The meanings in a japanese / reading text: split on 、 ， , ； ; ／ /, with （…） / (…) notes
// removed first, each normalized; blanks dropped. 「（どらまの）1わ、えぴそーど」 → ['1わ', 'えぴそーど'].
export function jaSegments(text) {
  return (text || '')
    .normalize('NFKC')
    .replace(/\([^)]*\)/g, '')
    .split(/[\u3001,;/]/)
    .map(normalizeJa)
    .filter(Boolean);
}

// Past-form cards say what they are the past of: 「読んだ（readの過去形）」, 「売った（sellの過去形・過去分詞）」,
// 「beの過去分詞(…)」, 「～だった（am・isの過去形）」. Returns the base English words (['read'],
// ['am', 'is']) or null for any other word. 「（過去形もhit）」 is a base word, so null.
export function pastFormBases(japanese) {
  const m = (japanese || '').normalize('NFKC').match(/([A-Za-z][A-Za-z' \u30fb]*?)\u306e\u904e\u53bb(?:\u5f62|\u5206\u8a5e)/);
  if (!m) return null;
  const bases = m[1].split('\u30fb').map((s) => normalizeEn(s)).filter(Boolean);
  return bases.length ? bases : null;
}

// True for a search typed in English (Latin letters and no Japanese characters).
export function isEnglishQuery(query) {
  const q = (query || '').normalize('NFKC');
  return /[a-z]/i.test(q) && !/[\u3040-\u30ff\u3400-\u9fff]/.test(q);
}

// The search index: one entry per word with its cleaned English terms (main word + alternates),
// Japanese meaning segments (japanese and reading) and, for past-form cards, their base words.
export function buildDictionaryIndex(words) {
  return (words || []).map((w) => ({
    word: w,
    en: [w.english, ...(w.alt_answers || [])].map(normalizeEn).filter(Boolean),
    ja: [...new Set([...jaSegments(w.japanese), ...jaSegments(w.reading)])],
    bases: pastFormBases(w.japanese),
  }));
}

// How well one term matches the query (lower is better; null = no match).
// 0 exact, 1 starts with, 2 a later word of a phrase starts with it ("for" → "look for"),
// 3 one small spelling slip (English, 3+ letters: "eta" → "eat"), 4 contains, 5 two slips (6+ letters).
function termScore(term, q, english) {
  if (term === q) return 0;
  if (term.startsWith(q)) return 1;
  if (english && term.split(' ').some((part, i) => i > 0 && part.startsWith(q))) return 2;
  if (english && q.length >= 3) {
    const allowed = q.length <= 5 ? 1 : 2;
    if (Math.abs(term.length - q.length) <= allowed) {
      const d = spellingDistance(term, q);
      if (d === 1) return 3;
      if (d === 2 && allowed === 2) return term.includes(q) ? 4 : 5;
    }
  }
  if (term.includes(q)) return 4;
  return null;
}

// The best score of a list of terms, or null.
function bestScore(terms, q, english) {
  let best = null;
  for (const term of terms) {
    const s = termScore(term, q, english);
    if (s !== null && (best === null || s < best)) best = s;
    if (best === 0) break;
  }
  return best;
}

// Searches the index. English queries match the English (and alternates); a past-form card also
// matches its base word, a little lower, and same-score past forms come after base words ("go" lists "went" after "go"). Japanese queries match
// each meaning segment of japanese and reading. Results: words, best first (score, then shorter
// English, then A–Z), at most `limit`.
export function searchDictionary(index, query, limit = MAX_RESULTS) {
  const english = isEnglishQuery(query);
  const q = english ? normalizeEn(query) : normalizeJa(query);
  if (!q || (english && q.length < 2)) return []; // English needs 2 letters, Japanese 1 character
  const hits = [];
  for (const entry of index || []) {
    let score = english ? bestScore(entry.en, q, true) : bestScore(entry.ja, q, false);
    if (english && entry.bases) {
      const viaBase = bestScore(entry.bases, q, false);
      if (viaBase !== null && viaBase <= 1) score = score === null ? viaBase + 0.5 : Math.min(score, viaBase + 0.5);
    }
    if (score !== null) hits.push({ entry, score });
  }
  hits.sort((a, b) => a.score - b.score
    || Boolean(a.entry.bases) - Boolean(b.entry.bases) // read 読む before read 読んだ
    || a.entry.word.english.length - b.entry.word.english.length
    || a.entry.word.english.localeCompare(b.entry.word.english));
  return hits.slice(0, limit).map((h) => h.entry.word);
}

// Other words that share a meaning segment with this one (正確な: accurate / exact), by English A–Z.
// Words with the same English (the other meaning of park) are left out; past-form cards too.
export function relatedWords(index, wordId, limit = 8) {
  const me = (index || []).find((e) => e.word.id === wordId);
  if (!me) return [];
  const mine = new Set(jaSegments(me.word.japanese));
  if (mine.size === 0) return [];
  const myEnglish = normalizeEn(me.word.english);
  return index
    .filter((e) => e !== me && !e.bases && normalizeEn(e.word.english) !== myEnglish
      && jaSegments(e.word.japanese).some((s) => mine.has(s)))
    .map((e) => e.word)
    .sort((a, b) => a.english.localeCompare(b.english))
    .slice(0, limit);
}

// The base-form words of a past-form card, never another past-form row: for 読んだ（readの過去形）
// → the read 読む row. [] when the word isn't a past form or no base is in the library.
export function baseFormWords(index, word) {
  const bases = pastFormBases(word?.japanese);
  if (!bases) return [];
  return (index || [])
    .filter((e) => !e.bases && e.word.id !== word.id && bases.includes(normalizeEn(e.word.english)))
    .map((e) => e.word);
}

// Other words with the same English as this one (park 公園 / park 駐車する), past forms included.
export function sameEnglishWords(index, word) {
  const en = normalizeEn(word?.english);
  return (index || []).filter((e) => e.word.id !== word?.id && normalizeEn(e.word.english) === en).map((e) => e.word);
}

// Where each pack containing a word lives, for the word pop-up: [{ deck: { id, name }, parts }]
// with parts = textbook › unit › deck or every collection from the top › deck. Packs found nowhere
// in the loaded library are left out. textbooks: shapeLibrary; collections: shapeCollections.
export function wordPackPaths(deckIds, textbooks, collections) {
  const wanted = new Set(deckIds || []);
  const out = [];
  const seen = new Set();
  for (const tb of textbooks || []) {
    for (const unit of tb.units || []) {
      for (const deck of unit.decks || []) {
        if (wanted.has(deck.id) && !seen.has(deck.id)) {
          seen.add(deck.id);
          out.push({ deck: { id: deck.id, name: deck.name }, parts: [tb.name, unit.name, deck.name] });
        }
      }
    }
  }
  const walk = (nodes, trail, depth) => {
    for (const node of nodes || []) {
      const here = [...trail, node.name];
      for (const deck of node.decks || []) {
        if (wanted.has(deck.id) && !seen.has(deck.id)) {
          seen.add(deck.id);
          out.push({ deck: { id: deck.id, name: deck.name }, parts: [...here, deck.name] });
        }
      }
      if (depth < 10) walk(node.children, here, depth + 1);
    }
  };
  walk(collections, [], 0);
  return out;
}

// sessionStorage copy of the index, so a reload in the same tab doesn't load it again.
// Wrapped in try/catch: a private window or a full storage just means no copy.
export const DICTIONARY_CACHE_KEY = 'polycards.dictionaryIndex';
const CACHE_VERSION = 1;
const CACHE_MAX_AGE_MS = 6 * 3600 * 1000;

export function loadCachedIndex(storage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage?.getItem(DICTIONARY_CACHE_KEY) || 'null');
    if (!saved || saved.v !== CACHE_VERSION || !Array.isArray(saved.words)) return null;
    if (!(now - saved.at < CACHE_MAX_AGE_MS)) return null;
    return saved.words;
  } catch {
    return null;
  }
}

export function saveCachedIndex(storage, words, now = Date.now()) {
  try {
    storage?.setItem(DICTIONARY_CACHE_KEY, JSON.stringify({ v: CACHE_VERSION, at: now, words }));
  } catch {
    // no copy, it loads again next time
  }
}

// True for a key press that only finishes Japanese (IME) input: Enter / arrows then must not pick
// a suggestion. Safari sends that Enter after compositionend with keyCode 229, so justComposed (set
// on compositionend, cleared on the next tick) catches it too.
export function isImeKey(event, justComposed = false) {
  return Boolean(event?.nativeEvent?.isComposing || event?.isComposing || event?.keyCode === 229 || justComposed);
}
