// Tests for the Card Sets library helpers. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  shapeLibrary, findTextbook, findUnit, parentPath, resolvePath, schoolLabel,
  levelOf, levelOptions, textbooksForLevel, pickLevel, loadSchoolLevel, saveSchoolLevel, isDeckAdded,
  shapeCollections, findCollection, collectionParentPath,
} from './library';

const ROWS = [
  { id: 1, name: 'Power On 1', school_level: 'HS', units: [{ id: 10, name: 'Lesson 5', unit_order: 5, decks: [{ id: 100, name: '5-1', deck_words: [{ count: 10 }] }] }] },
  { id: 2, name: 'New Horizon 3', school_level: 'JHS', units: [
    { id: 21, name: 'Unit 2', unit_order: 2, decks: [] },
    { id: 20, name: 'Unit 1', unit_order: 1, decks: [
      { id: 202, name: 'Part 10', deck_words: [{ count: 3 }] },
      { id: 201, name: 'Part 2', deck_words: [] },
    ] },
  ] },
  { id: 3, name: 'Extra Words', school_level: 'Other', units: null },
  { id: 4, name: 'New Horizon 1', school_level: 'JHS', units: [] },
];
const LIB = shapeLibrary(ROWS);

describe('shapeLibrary', () => {
  it('lists JHS, then HS, then Other, by name inside each level', () => {
    expect(LIB.map((tb) => tb.name)).toEqual(['New Horizon 1', 'New Horizon 3', 'Power On 1', 'Extra Words']);
  });

  it('orders units by unit_order and decks by name (Part 2 before Part 10)', () => {
    const nh3 = findTextbook(LIB, 2);
    expect(nh3.units.map((u) => u.name)).toEqual(['Unit 1', 'Unit 2']);
    expect(nh3.units[0].decks.map((d) => d.name)).toEqual(['Part 2', 'Part 10']);
  });

  it('orders decks by sort_order first, then by name', () => {
    const rows = [{ id: 9, name: 'T', school_level: 'JHS', units: [{ id: 90, name: 'U', unit_order: 1, decks: [
      { id: 1, name: "Let's Read 1 Page 44", sort_order: 100 },
      { id: 2, name: 'Part 2', sort_order: 0 },
      { id: 3, name: 'Part 1', sort_order: 0 },
      { id: 4, name: 'Stage Activity 1', sort_order: 0 },
    ] }] }];
    expect(shapeLibrary(rows)[0].units[0].decks.map((d) => d.name))
      .toEqual(['Part 1', 'Part 2', 'Stage Activity 1', "Let's Read 1 Page 44"]);
  });

  it('gives every deck a word count (0 when none) and drops the raw deck_words', () => {
    const [part2, part10] = findTextbook(LIB, 2).units[0].decks;
    expect(part10).toEqual({ id: 202, name: 'Part 10', wordCount: 3 });
    expect(part2.wordCount).toBe(0);
    expect(findTextbook(LIB, 1).units[0].decks[0].wordCount).toBe(10);
  });

  it('turns missing units and decks into empty lists', () => {
    expect(findTextbook(LIB, 3).units).toEqual([]);
    expect(shapeLibrary(null)).toEqual([]);
    expect(shapeLibrary([{ id: 5, name: 'X', school_level: 'HS', units: [{ id: 1, name: 'U', unit_order: 1 }] }])[0].units[0].decks).toEqual([]);
  });

  it('does not change the rows it was given', () => {
    expect(ROWS[1].units[0].name).toBe('Unit 2');
    expect(ROWS[0].units[0].decks[0].deck_words).toEqual([{ count: 10 }]);
  });
});

describe('lookups', () => {
  it('finds textbooks and units by id, or null', () => {
    expect(findTextbook(LIB, 1).name).toBe('Power On 1');
    expect(findTextbook(LIB, 99)).toBeNull();
    expect(findUnit(findTextbook(LIB, 2), 21).name).toBe('Unit 2');
    expect(findUnit(findTextbook(LIB, 2), 99)).toBeNull();
    expect(findUnit(null, 21)).toBeNull();
  });
});

describe('parentPath (back button)', () => {
  it('goes up one level', () => {
    expect(parentPath({ screen: 'decks', textbookId: 2, unitId: 20 })).toEqual({ screen: 'units', textbookId: 2 });
    expect(parentPath({ screen: 'units', textbookId: 2 })).toEqual({ screen: 'textbooks' });
    expect(parentPath({ screen: 'textbooks' })).toEqual({ screen: 'hub' });
    expect(parentPath({ screen: 'tests' })).toEqual({ screen: 'hub' });
  });

  it('keeps the chosen school level', () => {
    expect(parentPath({ screen: 'decks', textbookId: 1, unitId: 10, level: 'HS' })).toEqual({ screen: 'units', textbookId: 1, level: 'HS' });
    expect(parentPath({ screen: 'units', textbookId: 1, level: 'HS' })).toEqual({ screen: 'textbooks', level: 'HS' });
    expect(parentPath({ screen: 'textbooks', level: 'HS' })).toEqual({ screen: 'hub', level: 'HS' });
  });
});

describe('resolvePath', () => {
  it('finds the textbook and unit of a path', () => {
    const r = resolvePath(LIB, { screen: 'decks', textbookId: 2, unitId: 20 });
    expect(r.path.screen).toBe('decks');
    expect(r.textbook.name).toBe('New Horizon 3');
    expect(r.unit.name).toBe('Unit 1');
    expect(resolvePath(LIB, { screen: 'units', textbookId: 1 }).textbook.name).toBe('Power On 1');
  });

  it('falls back to the hub when the textbook or unit is gone', () => {
    expect(resolvePath(LIB, { screen: 'units', textbookId: 99 }).path).toEqual({ screen: 'hub' });
    expect(resolvePath(LIB, { screen: 'decks', textbookId: 2, unitId: 99 }).path).toEqual({ screen: 'hub' });
    expect(resolvePath([], { screen: 'decks', textbookId: 2, unitId: 20 }).path).toEqual({ screen: 'hub' });
    expect(resolvePath([], { screen: 'units', textbookId: 2, level: 'HS' }).path).toEqual({ screen: 'hub', level: 'HS' });
  });

  it('leaves screens without ids alone', () => {
    expect(resolvePath([], { screen: 'textbooks' }).path).toEqual({ screen: 'textbooks' });
    expect(resolvePath([], { screen: 'tests' }).path).toEqual({ screen: 'tests' });
  });
});

describe('schoolLabel', () => {
  it('labels school levels', () => {
    expect(schoolLabel('JHS')).toBe('中学 · JHS');
    expect(schoolLabel('HS')).toBe('高校 · HS');
    expect(schoolLabel('Other')).toBe('その他');
  });
});

describe('school level switch', () => {
  it('levelOf: JHS and HS as they are, anything else is Other', () => {
    expect(levelOf({ school_level: 'JHS' })).toBe('JHS');
    expect(levelOf({ school_level: 'HS' })).toBe('HS');
    expect(levelOf({ school_level: 'Other' })).toBe('Other');
    expect(levelOf({ school_level: null })).toBe('Other');
  });

  it('levelOptions: Other only when an Other textbook exists', () => {
    expect(levelOptions(LIB)).toEqual(['JHS', 'HS', 'Other']);
    const noOther = LIB.filter((tb) => tb.school_level !== 'Other');
    expect(levelOptions(noOther)).toEqual(['JHS', 'HS']);
    expect(levelOptions([])).toEqual(['JHS', 'HS']);
  });

  it('textbooksForLevel: only that level, in library order', () => {
    expect(textbooksForLevel(LIB, 'JHS').map((tb) => tb.name)).toEqual(['New Horizon 1', 'New Horizon 3']);
    expect(textbooksForLevel(LIB, 'HS').map((tb) => tb.name)).toEqual(['Power On 1']);
    expect(textbooksForLevel(LIB, 'Other').map((tb) => tb.name)).toEqual(['Extra Words']);
  });

  it('pickLevel: the chosen level if it is an option, otherwise JHS', () => {
    expect(pickLevel('HS', ['JHS', 'HS'])).toBe('HS');
    expect(pickLevel(undefined, ['JHS', 'HS'])).toBe('JHS');
    expect(pickLevel('Other', ['JHS', 'HS'])).toBe('JHS'); // no Other textbooks any more
    expect(pickLevel('Other', ['JHS', 'HS', 'Other'])).toBe('Other');
  });
});

describe('saved school level', () => {
  const fakeStorage = (data = {}) => ({ getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } });
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

  it('defaults to JHS when nothing (or nonsense) is saved', () => {
    expect(loadSchoolLevel(fakeStorage())).toBe('JHS');
    expect(loadSchoolLevel(fakeStorage({ 'polycards.cardSetsLevel': 'college' }))).toBe('JHS');
    expect(loadSchoolLevel(undefined)).toBe('JHS');
  });

  it('remembers the saved level', () => {
    const storage = fakeStorage();
    saveSchoolLevel(storage, 'HS');
    expect(loadSchoolLevel(storage)).toBe('HS');
  });

  it('does not crash when storage is blocked', () => {
    expect(loadSchoolLevel(blocked)).toBe('JHS');
    expect(() => saveSchoolLevel(blocked, 'HS')).not.toThrow();
  });
});

describe('isDeckAdded', () => {
  it('is true only for decks in My Cards', () => {
    expect(isDeckAdded([100, 201], 201)).toBe(true);
    expect(isDeckAdded([100, 201], 202)).toBe(false);
  });

  it('is false when nothing is added or the list is not loaded yet', () => {
    expect(isDeckAdded([], 201)).toBe(false);
    expect(isDeckAdded(undefined, 201)).toBe(false);
  });
});

describe('shapeCollections', () => {
  const deck = (id, name, count, sortOrder = 0) => ({ id, name, sort_order: sortOrder, deck_words: count == null ? [] : [{ count }] });
  const COLS = [
    { id: 'b', name: 'B top', parent_id: null, sort_order: 0 },
    { id: 'a', name: 'A top', parent_id: null, sort_order: 0 },
    { id: 'first', name: 'Z first', parent_id: null, sort_order: -5 },
    { id: 'a1', name: 'Level 10', parent_id: 'a', sort_order: 0 },
    { id: 'a2', name: 'Level 2', parent_id: 'a', sort_order: 0 },
    { id: 'a2x', name: 'Deep', parent_id: 'a2', sort_order: 0 },
    { id: 'orphan', name: 'Orphan', parent_id: 'missing', sort_order: 0 },
  ];
  const LINKS = [
    { collection_id: 'a', decks: deck('d10', '10 疑問詞', 12) },
    { collection_id: 'a', decks: deck('d2', '2 色', 15) },
    { collection_id: 'a', decks: deck('d1', '1 あいさつ', null, 5) },
    { collection_id: 'a1', decks: deck('d2', '2 色', 15) }, // the same deck in a sub-collection
    { collection_id: 'a2x', decks: deck('d3', '3 数', 14) },
    { collection_id: 'nope', decks: deck('d9', 'x', 1) },
    { collection_id: 'a', decks: null },
  ];
  const TREE = shapeCollections(COLS, LINKS);

  it('lists top-level collections by sort_order, then name, and hides orphans', () => {
    expect(TREE.map((c) => c.name)).toEqual(['Z first', 'A top', 'B top']);
  });

  it('sorts sub-collections and decks by sort_order, then name numeric-aware', () => {
    const a = findCollection(TREE, 'a');
    expect(a.children.map((c) => c.name)).toEqual(['Level 2', 'Level 10']);
    expect(a.decks.map((d) => d.name)).toEqual(['2 色', '10 疑問詞', '1 あいさつ']);
  });

  it('gives decks a word count and drops deck_words', () => {
    const a = findCollection(TREE, 'a');
    expect(a.decks[0]).toEqual({ id: 'd2', name: '2 色', sort_order: 0, wordCount: 15 });
    expect(a.decks[2].wordCount).toBe(0);
  });

  it('counts decks in sub-collections too, each deck once', () => {
    expect(findCollection(TREE, 'a').deckCount).toBe(4); // d10, d2, d1 + d3 two levels down
    expect(findCollection(TREE, 'a2').deckCount).toBe(1);
    expect(findCollection(TREE, 'b').deckCount).toBe(0);
  });

  it('finds nested collections and returns null for unknown ids', () => {
    expect(findCollection(TREE, 'a2x').name).toBe('Deep');
    expect(findCollection(TREE, 'orphan')).toBeNull();
    expect(findCollection(null, 'a')).toBeNull();
  });

  it('handles empty input', () => {
    expect(shapeCollections(null, null)).toEqual([]);
  });

  it('back goes to the parent collection, or to the Tests & Themes list from the top', () => {
    expect(collectionParentPath(findCollection(TREE, 'a2x'), 'HS')).toEqual({ screen: 'collection', collectionId: 'a2', level: 'HS' });
    expect(collectionParentPath(findCollection(TREE, 'a'), 'HS')).toEqual({ screen: 'tests', level: 'HS' });
    expect(collectionParentPath(null, 'JHS')).toEqual({ screen: 'tests', level: 'JHS' });
  });
});
