// Builds online dictionary links (ALC 英辞郎 on the WEB) for a card's English word.

const ALC_SEARCH = 'https://eow.alc.co.jp/search?q=';

// Turn a card's English text into a clean search term:
// drop "(...)" with what's inside, "...", "…" and "?", tidy spaces, lowercase.
export function cleanSearchTerm(english) {
  return (english || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\.{3}|…|\?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Full dictionary address, or null if nothing is left to search for.
export function dictionaryUrl(english) {
  const term = cleanSearchTerm(english);
  return term ? ALC_SEARCH + encodeURIComponent(term) : null;
}

// --- Highlighting the word in an example sentence ---

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Regular expression text for one word or phrase, including common English endings
// for single words of 3+ letters (eat → eats/eating, study → studied, stop → stopped).
function termPattern(term) {
  const words = term.split(' ').map(escapeRegExp);
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
