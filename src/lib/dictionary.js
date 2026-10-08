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
