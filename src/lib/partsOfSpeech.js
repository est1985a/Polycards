// Parts of speech (品詞) for words.pos. The keys must match the CHECK constraint in
// supabase/polycards-pos.sql. Names and explanations are in src/i18n (pos.label.*, pos.other.*,
// pos.desc.*); the example words are English in both languages, so they live here.

// In the order of the pop-up (PosSheet).
export const POS_KEYS = [
  "noun", "verb", "adjective", "adverb", "preposition", "pronoun",
  "conjunction", "auxiliary", "article", "interjection", "number", "phrase",
];

export const POS_EXAMPLES = {
  noun: ["dog", "school", "music"],
  verb: ["play", "eat", "like"],
  adjective: ["big", "happy", "new"],
  adverb: ["slowly", "often", "very"],
  preposition: ["in", "on", "at"],
  pronoun: ["I", "you", "it"],
  conjunction: ["and", "but", "because"],
  auxiliary: ["can", "will", "must"],
  article: ["a", "an", "the"],
  interjection: ["oh", "wow", "ouch"],
  number: ["one", "ten", "first"],
  phrase: ["thank you", "look at", "a lot of"],
};

// words.pos → a known key, or null (no chip). Ignores capitals and spaces, so a typo-ish value
// from SQL never breaks a card.
export function posKey(value) {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  return POS_KEYS.includes(key) ? key : null;
}

// Where focus goes when the pop-up closes: back to the text box the student was typing in
// (typing mode, so the iPad keyboard comes back), otherwise back to the chip.
// focusedAtPress: what had focus when the chip was pressed.
export function returnFocusTarget(chip, focusedAtPress) {
  const tag = focusedAtPress?.tagName;
  const typingBox = (tag === "INPUT" || tag === "TEXTAREA") && focusedAtPress.isConnected !== false;
  return typingBox ? focusedAtPress : chip;
}
