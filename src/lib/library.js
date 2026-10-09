// Card Sets library: shaping the textbooks query and the drill-down navigation rules.
// Pure functions (no database), tested in library.test.js.

const SCHOOL_ORDER = { JHS: 0, HS: 1 }; // anything else (Other) comes last

// Compares names so "Part 2" comes before "Part 10" and "New Horizon 1" before "New Horizon 3".
const byName = (a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true });

// Rows from fetchLibrary → a flat textbook list: JHS first, then HS, then Other (by name inside each).
// Units are sorted by unit_order, decks by name, and each deck gets wordCount (from deck_words(count)).
export function shapeLibrary(rows) {
  const level = (tb) => SCHOOL_ORDER[tb.school_level] ?? 2;
  return (rows || [])
    .map((tb) => ({
      ...tb,
      units: (tb.units || [])
        .map((unit) => ({
          ...unit,
          decks: (unit.decks || [])
            .map(({ deck_words, ...deck }) => ({ ...deck, wordCount: deck_words?.[0]?.count ?? 0 }))
            .sort(byName),
        }))
        .sort((a, b) => a.unit_order - b.unit_order),
    }))
    .sort((a, b) => level(a) - level(b) || byName(a, b));
}

export function findTextbook(textbooks, id) {
  return textbooks.find((tb) => tb.id === id) || null;
}

export function findUnit(textbook, id) {
  return textbook?.units.find((u) => u.id === id) || null;
}

// Where the back button goes: decks → units → textbooks → hub, tests → hub.
// The chosen school level (path.level) is kept, so going back returns to the same level.
export function parentPath(path) {
  const { level } = path;
  switch (path.screen) {
    case "decks": return { screen: "units", textbookId: path.textbookId, level };
    case "units": return { screen: "textbooks", level };
    default: return { screen: "hub", level };
  }
}

// The textbook and unit a path points to. If they no longer exist (the library changed),
// the path falls back to the hub (keeping the school level).
export function resolvePath(textbooks, path) {
  if (path.screen !== "units" && path.screen !== "decks") return { path, textbook: null, unit: null };
  const textbook = findTextbook(textbooks, path.textbookId);
  const unit = path.screen === "decks" ? findUnit(textbook, path.unitId) : null;
  if (!textbook || (path.screen === "decks" && !unit)) return { path: { screen: "hub", level: path.level }, textbook: null, unit: null };
  return { path, textbook, unit };
}

export function schoolLabel(level) {
  if (level === "JHS") return "中学 · JHS";
  if (level === "HS") return "高校 · HS";
  return "Other";
}

// School-level switch on the Textbooks screen ------------------------------------------

export const DEFAULT_LEVEL = "JHS";
const LEVEL_KEY = "polycards.cardSetsLevel"; // localStorage key for the chosen level

// 'JHS', 'HS', or 'Other' for any other school_level.
export function levelOf(textbook) {
  return textbook.school_level === "JHS" || textbook.school_level === "HS" ? textbook.school_level : "Other";
}

// Switch options: always JHS and HS; Other only when some textbook is Other.
export function levelOptions(textbooks) {
  return textbooks.some((tb) => levelOf(tb) === "Other") ? ["JHS", "HS", "Other"] : ["JHS", "HS"];
}

export function textbooksForLevel(textbooks, level) {
  return textbooks.filter((tb) => levelOf(tb) === level);
}

// The level to show: the chosen one if it is an option, otherwise JHS.
export function pickLevel(level, options) {
  return options.includes(level) ? level : DEFAULT_LEVEL;
}

// Saved level from the last visit (JHS if none, unknown, or storage is blocked).
export function loadSchoolLevel(storage) {
  try {
    const saved = storage?.getItem(LEVEL_KEY);
    return ["JHS", "HS", "Other"].includes(saved) ? saved : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL;
  }
}

// Remembers the level for next visit. If storage is blocked, it is simply not remembered.
export function saveSchoolLevel(storage, level) {
  try {
    storage?.setItem(LEVEL_KEY, level);
  } catch {
    // ignore: private browsing or blocked site data
  }
}
