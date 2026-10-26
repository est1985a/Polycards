// Card Sets library: shaping the textbooks query and the drill-down navigation rules.
// Pure functions (no database), tested in library.test.js.
import { t } from '../i18n';

const SCHOOL_ORDER = { JHS: 0, HS: 1 }; // anything else (Other) comes last

// Compares names so "Part 2" comes before "Part 10" and "New Horizon 1" before "New Horizon 3".
const byName = (a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true });

// Lower sort_order first; a deck without one counts as 0.
const bySortOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

// Rows from fetchLibrary → a flat textbook list: JHS first, then HS, then Other (by name inside each).
// Units are sorted by unit_order, decks by sort_order then by name, and each deck gets wordCount
// (from deck_words(count)).
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
            .sort((a, b) => bySortOrder(a, b) || byName(a, b)),
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
  if (level === "JHS") return t("cardSets.levelJHS");
  if (level === "HS") return t("cardSets.levelHS");
  return t("cardSets.levelOther");
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

// True when the deck is already in the student's My Cards (myDeckIds from user_decks).
export function isDeckAdded(myDeckIds, deckId) {
  return Array.isArray(myDeckIds) && myDeckIds.includes(deckId);
}

// The add button's word counts for a deck: counted per word (each word is two cards).
// ownedWordIds: from fetchOwnedWordIds (null = unknown). Returns null when the check failed or
// no word is owned (the plain button), else { newCount, ownedCount, allOwned }.
export function ownedCounts(cards, ownedWordIds) {
  if (!Array.isArray(ownedWordIds)) return null;
  const owned = new Set(ownedWordIds);
  const words = new Set((cards || []).map((c) => c.wordId));
  let ownedCount = 0;
  for (const id of words) if (owned.has(id)) ownedCount++;
  if (ownedCount === 0) return null;
  const newCount = words.size - ownedCount;
  return { newCount, ownedCount, allOwned: newCount === 0 };
}

// Word list reveals: a new Set with id added, or removed if it was already there
// (the original is not changed).
export function toggleId(set, id) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// Tests & Themes: the collections tree -------------------------------------------------

// Rows from fetchCollections → the top-level collections, each { id, name, sort_order, parentId,
// children, decks, deckCount }. children = sub-collections, decks = its own decks (with wordCount);
// both are sorted by sort_order, then by name ("2" before "10"). deckCount counts the decks inside it
// and all its sub-collections, each deck once. collections: { id, name, parent_id, sort_order };
// links: { collection_id, decks: { id, name, sort_order, deck_words: [{ count }] } }.
// A collection whose parent is missing is not shown.
export function shapeCollections(collections, links) {
  const sort = (a, b) => bySortOrder(a, b) || byName(a, b);
  const nodes = new Map((collections || []).map((c) => [c.id, {
    id: c.id, name: c.name, sort_order: c.sort_order, parentId: c.parent_id ?? null, children: [], decks: [], deckCount: 0,
  }]));
  for (const link of links || []) {
    const node = nodes.get(link.collection_id);
    if (!node || !link.decks) continue;
    const { deck_words, ...deck } = link.decks;
    if (!node.decks.some((d) => d.id === deck.id)) node.decks.push({ ...deck, wordCount: deck_words?.[0]?.count ?? 0 });
  }
  const roots = [];
  for (const node of nodes.values()) {
    if (node.parentId === null) roots.push(node);
    else nodes.get(node.parentId)?.children.push(node);
  }
  // Sorts each level and returns the set of deck ids under a node (depth guard against bad data).
  const finish = (node, depth) => {
    node.children.sort(sort);
    node.decks.sort(sort);
    const ids = new Set(node.decks.map((d) => d.id));
    if (depth < 10) for (const child of node.children) for (const id of finish(child, depth + 1)) ids.add(id);
    node.deckCount = ids.size;
    return ids;
  };
  roots.forEach((root) => finish(root, 0));
  return roots.sort(sort);
}

// The collection with this id anywhere in the tree, or null.
export function findCollection(roots, id) {
  for (const node of roots || []) {
    if (node.id === id) return node;
    const found = findCollection(node.children, id);
    if (found) return found;
  }
  return null;
}

// Where the back button goes from a collection: its parent collection, or the Tests & Themes list.
export function collectionParentPath(collection, level) {
  return collection?.parentId
    ? { screen: "collection", collectionId: collection.parentId, level }
    : { screen: "tests", level };
}
