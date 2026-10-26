// Spelling check for typing mode (Japanese → English cards in SRS review). Pure functions only.
// This is a copy of spelling_normalize() / spelling_distance() / spelling_check() in
// supabase/polycards-answers.sql and spelling_answers() / the three-argument spelling_check() in
// supabase/polycards-alt-answers.sql, so the app can show ✓ straight away. It MUST give the same
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

// Every accepted spelling of a word, cleaned up: for the main English and each alternate
// (words.alt_answers), the form without the ( ) / [ ] words and the form with them. Blanks dropped.
// Same as spelling_answers() in the SQL.
export function spellingAnswers(english, alts = []) {
  const forms = [english, ...(alts ?? [])].flatMap((a) => [
    normalizeSpelling((a ?? "").replace(/[([][^)\]]*[)\]]/g, " ")), // without the ( ) words
    normalizeSpelling((a ?? "").replace(/[()[\]]/g, "")),            // with them
  ]);
  return [...new Set(forms)].filter((f) => f !== "");
}

// 'exact' = right (bonus), 'close' = one change away (おしい), 'wrong' = anything else (also empty).
// Words in ( ) or [ ] are optional: "look (at)" accepts "look" and "look at".
// alts: the word's alternate answers, accepted exactly like the main one ("cute" for "pretty").
export function checkSpelling(typed, english, alts = []) {
  const answer = normalizeSpelling((typed ?? "").slice(0, MAX_TYPED));
  if (answer === "") return "wrong";
  const accepted = spellingAnswers(english, alts);
  if (accepted.includes(answer)) return "exact";
  const distances = accepted.map((a) => spellingDistance(answer, a));
  if (distances.length > 0 && Math.min(...distances) <= 1) return "close";
  return "wrong";
}

// true = the typed answer is right only because of an alternate (not the main English), so the
// app shows 教科書の答え with the textbook word.
export function isAlternateAnswer(typed, english, alts = []) {
  return checkSpelling(typed, english, alts) === "exact" && checkSpelling(typed, english) !== "exact";
}

// A wrong spelling may be another word with the same meaning: ask the database once per showing
// of the card (retryUsed: this showing already had its retry). exact / close never ask.
export function needsOtherMeaningCheck(spelling, retryUsed) {
  return spelling === "wrong" && !retryUsed;
}

// How Japanese → English cards are answered in reviews (the 答え方 switch on My Cards), saved on
// this device: "off" (buttons), "typing" or "handwriting" (Apple Pencil). Off if nothing is saved
// or storage is blocked. A student who had the old スペル入力 switch on keeps typing.
// handwritingEnabled false (HANDWRITING_ENABLED in src/handwriting/config.js): 手書き becomes typing.
export const ANSWER_MODES = ["off", "typing", "handwriting"];
const ANSWER_MODE_KEY = "polycards.answerMode";
const OLD_TYPING_KEY = "polycards.typingMode";

export function loadAnswerMode(storage, handwritingEnabled = true) {
  try {
    let mode = storage?.getItem(ANSWER_MODE_KEY);
    if (!ANSWER_MODES.includes(mode)) mode = storage?.getItem(OLD_TYPING_KEY) === "1" ? "typing" : "off";
    return mode === "handwriting" && !handwritingEnabled ? "typing" : mode;
  } catch {
    return "off";
  }
}

export function saveAnswerMode(storage, mode) {
  try {
    storage?.setItem(ANSWER_MODE_KEY, mode);
  } catch {
    // ignore: private browsing or blocked site data
  }
}

// The answer mode for the card on screen in a review. The student can switch the mode during a review
// (ReviewModeToggle): until the card is answered it follows the setting at once; from the moment it is
// answered (flipped, 答える / こたえる pressed, or わからない) the review keeps it in the mode it was
// answered in (lock, set by StudySession), and the next card follows the setting again.
// lock: the mode the card was answered in, or null while it isn't answered yet.
export function cardAnswerMode(lock, setting) {
  return ANSWER_MODES.includes(lock) ? lock : setting;
}

// 次へ appears right after 答える / わからない. The same Enter press, or a held-down Enter, must not
// also press 次へ and skip the result: ignore repeated keys, and Enter for a moment after it appears.
export const NEXT_KEY_GUARD_MS = 300;

export function ignoreNextKey(event, shownAt, now = Date.now()) {
  if (event.repeat) return true;
  return event.key === "Enter" && now - shownAt < NEXT_KEY_GUARD_MS;
}
