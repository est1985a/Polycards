// Spelling check for typing mode (Japanese → English cards in SRS review). Pure functions only.
// This is a copy of spelling_normalize() / spelling_distance() / spelling_check() in
// supabase/polycards-answers.sql, so the app can show ✓ straight away. It MUST give the same
// results as the SQL; if the two ever disagree, the database decides the bonus.

const MAX_TYPED = 200; // the database only looks at the first 200 characters

// Clean-up for both the typed answer and the card's English, in the same order as the SQL:
// full-width letters (Japanese keyboard) → normal, lowercase, curly apostrophes and backticks → ',
// "..." "…" "~" "〜" "," "、" → space, extra spaces collapsed, and spaces and . ! ? 。 ！ ？
// removed from the start and end.
export function normalizeSpelling(text) {
  return (text ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/(\.\.\.|…|~|〜|,|、)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.!?。！？]+|[\s.!?。！？]+$/g, "");
}

// Number of small changes between two answers: one letter added, removed or changed, or two
// letters next to each other swapped ("appel" → "apple") = 1.
export function spellingDistance(a, b) {
  const x = [...a];
  const y = [...b];
  if (x.length === 0) return y.length;
  if (y.length === 0) return x.length;
  let pprev = [];
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) {
        v = Math.min(v, pprev[j - 2] + 1);
      }
      cur.push(v);
    }
    pprev = prev;
    prev = cur;
  }
  return prev[y.length];
}

// 'exact' = right (bonus), 'close' = one change away (おしい), 'wrong' = anything else (also empty).
// Words in ( ) or [ ] are optional: "look (at)" accepts "look" and "look at".
export function checkSpelling(typed, english) {
  const answer = normalizeSpelling((typed ?? "").slice(0, MAX_TYPED));
  if (answer === "") return "wrong";
  const accepted = [
    normalizeSpelling((english ?? "").replace(/[([][^)\]]*[)\]]/g, " ")), // without the ( ) words
    normalizeSpelling((english ?? "").replace(/[()[\]]/g, "")),            // with them
  ];
  if (accepted.includes(answer)) return "exact";
  const distances = accepted.filter((a) => a !== "").map((a) => spellingDistance(answer, a));
  if (distances.length > 0 && Math.min(...distances) <= 1) return "close";
  return "wrong";
}

// A wrong spelling may be another word with the same meaning: ask the database once per showing
// of the card (retryUsed: this showing already had its retry). exact / close never ask.
export function needsOtherMeaningCheck(spelling, retryUsed) {
  return spelling === "wrong" && !retryUsed;
}

// The typing-mode switch on My Cards, saved on this device (off if nothing is saved or storage is blocked).
const TYPING_KEY = "polycards.typingMode";

export function loadTypingMode(storage) {
  try {
    return storage?.getItem(TYPING_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveTypingMode(storage, on) {
  try {
    storage?.setItem(TYPING_KEY, on ? "1" : "0");
  } catch {
    // ignore: private browsing or blocked site data
  }
}

// 次へ appears right after 答える / わからない. The same Enter press, or a held-down Enter, must not
// also press 次へ and skip the result: ignore repeated keys, and Enter for a moment after it appears.
export const NEXT_KEY_GUARD_MS = 300;

export function ignoreNextKey(event, shownAt, now = Date.now()) {
  if (event.repeat) return true;
  return event.key === "Enter" && now - shownAt < NEXT_KEY_GUARD_MS;
}
