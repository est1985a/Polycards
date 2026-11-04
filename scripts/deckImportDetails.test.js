// Tests for the import tool's word-detail columns (countable, plural, verb forms;
// supabase/polycards-word-details.sql). Run with: npm test
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pluralOf, verbForms, IRREGULAR_PLURALS, IRREGULAR_VERBS } from './wordForms.js';

// The import tool is one standalone HTML page; load its script's functions without a browser.
const html = readFileSync(new URL('../tools/deck-import-tool.html', import.meta.url), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const tool = new Function(`${code}\nreturn { analyze, countableKey, pluralOf, verbForms, IRREGULAR_PLURALS, IRREGULAR_VERBS, COUNTABLE_KEYS, TEMPLATE };`)();

const HEADER = 'deck,collection,english,japanese,pos,countable,plural,verb_past,verb_pp,verb_ing,verb_third';
const csv = (...rows) => [HEADER, ...rows].join('\n');
const DETAIL_COLS = ['countable', 'plural', 'verb_past', 'verb_pp', 'verb_ing', 'verb_third'];
// a database with these words (english, japanese, pos and any detail columns)
const db = (words, extra = {}) => ({
  words: words.map(({ english, japanese, pos }) => ({ english, japanese, pos: pos || null })),
  speakRows: [], speakCol: true, readingRows: [], readingCol: true,
  detailRows: words.map((w) => ({ english: w.english, japanese: w.japanese, ...Object.fromEntries(DETAIL_COLS.map((c) => [c, w[c] || null])) })),
  detailsCol: true,
  textbooks: [], units: [], decks: [], collections: [],
  exampleCols: true, altCols: true, posCol: true, ...extra,
});
const bySev = (r, sev) => r.issues.filter((i) => i.sev === sev).map((i) => i.msg);
const detailSql = (r) => (r.sql.split('-- Word details')[1] || '').split('\n\n')[0];

describe('import tool: word details', () => {
  it('countableKey: keys, Japanese labels, blank, anything else', () => {
    expect(tool.countableKey(' Countable ')).toBe('countable');
    expect(tool.countableKey('UNCOUNTABLE')).toBe('uncountable');
    expect(tool.countableKey('both')).toBe('both');
    expect(tool.countableKey('plural')).toBe('plural');
    expect(tool.countableKey('数えられる')).toBe('countable');
    expect(tool.countableKey('数えられない')).toBe('uncountable');
    expect(tool.countableKey('両方')).toBe('both');
    expect(tool.countableKey('数えられる・数えられない')).toBe('both');
    expect(tool.countableKey('常に複数形')).toBe('plural');
    expect(tool.countableKey('')).toBe('');
    expect(tool.countableKey('yes')).toBe(null);
  });

  it('errors: bad countable, Japanese in a form, two values for one word, no columns in the database', () => {
    const errs = (r) => bySev(r, 'error').join(' | ');
    expect(errs(tool.analyze(csv('D1,Test,dog,犬,noun,many,,,,,'), null))).toContain('countable "many" is not allowed');
    expect(errs(tool.analyze(csv('D1,Test,dog,犬,noun,countable,いぬ,,,,'), null))).toContain('plural contains Japanese');
    expect(errs(tool.analyze(csv('D1,Test,go,行く,verb,,,went,gone,going,goes', 'D2,Test,go,行く,verb,,,goed,,,'), null))).toContain('verb_past "goed" here but "went"');
    const old = db([], { detailsCol: false, detailRows: [] });
    expect(errs(tool.analyze(csv('D1,Test,dog,犬,noun,countable,dogs,,,,'), old))).toContain('polycards-word-details.sql');
  });

  it('writes the details in the SQL, filling only empty columns', () => {
    const r = tool.analyze(csv('D1,Test,dog,犬,noun,数えられる,dogs,,,,', 'D1,Test,go,行く,verb,,,went,gone,going,goes'), null);
    expect(bySev(r, 'error')).toHaveLength(0);
    const sql = detailSql(r);
    expect(sql).toContain("('dog', '犬', 'countable'::text, 'dogs'::text, null::text, null::text, null::text, null::text)");
    expect(sql).toContain("('go', '行く', null, null, 'went', 'gone', 'going', 'goes')");
    expect(sql).toContain('countable = coalesce(w.countable, v.countable)');
    expect(sql).toContain('verb_third = coalesce(w.verb_third, v.verb_third)');
    expect(sql).toContain('(w.plural is null and v.plural is not null)');
    expect(r.sql).toContain('polycards-word-details.sql');
    expect(r.checkSql).toContain('count(w.countable) as with_countable');
    expect(r.checkSql).toContain('count(w.verb_past) as with_verb_forms');
    // the details update runs after the words are inserted
    expect(r.sql.indexOf('-- Word details')).toBeGreaterThan(r.sql.indexOf('insert into public.words'));
  });

  it('no details section when the file has none', () => {
    const r = tool.analyze(csv('D1,Test,dog,犬,noun,,,,,,'.replace('noun', 'adjective')), null);
    expect(r.sql).not.toContain('Word details');
    expect(r.sql).not.toContain('countable');
    expect(r.checkSql).not.toContain('with_countable');
  });

  it('only the keys allowed by words_countable_check reach the SQL', () => {
    const r = tool.analyze(csv(
      'D1,Test,dog,犬,noun,数えられる,dogs,,,,', 'D1,Test,water,水,noun,数えられない,,,,,',
      'D1,Test,paper,紙,noun,両方,papers,,,,', 'D1,Test,jeans,ジーンズ,noun,常に複数形,,,,,',
      'D1,Test,cat,猫,noun,COUNTABLE,cats,,,,',
    ), null);
    expect(bySev(r, 'error')).toHaveLength(0);
    const rows = detailSql(r).match(/^ {2}\('.*\),?$/gm);
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      const countable = row.match(/^ {2}\('(?:[^']|'')*', '(?:[^']|'')*', '([^']*)'/)[1];
      expect(tool.COUNTABLE_KEYS).toContain(countable);
    }
  });

  it('keeps a different value already in the database (warning with both values)', () => {
    const stored = db([{ english: 'paper', japanese: '紙', pos: 'noun', countable: 'both', plural: 'papers' }]);
    const r = tool.analyze(csv('D1,Test,paper,紙,noun,uncountable,,,,,'), stored);
    expect(bySev(r, 'warn')).toContain('This word already has countable "both" in the database, but your file says "uncountable". The existing one is kept (the SQL never overwrites word details).');
    expect(r.words[0].detailsAction).toBe('kept: database has countable');
    // the same value: no warning
    const same = tool.analyze(csv('D1,Test,paper,紙,noun,both,papers,,,,'), stored);
    expect(bySev(same, 'warn').some((m) => m.includes('already has'))).toBe(false);
    expect(same.words[0].detailsAction).toBe('already set');
  });

  it('warns about details that do not fit the word', () => {
    // (readings are not in these rows, so their own warning is left out)
    const warns = (row, store = null) => bySev(tool.analyze(csv(row), store), 'warn').filter((m) => !m.startsWith('No reading given'));
    expect(warns('D1,Test,water,水,noun,uncountable,waters,,,,')).toContain('plural is filled in, but countable is "uncountable". Only countable / both nouns have a plural.');
    expect(warns('D1,Test,dog,犬,noun,,dogs,,,,').join(' ')).toContain('countable is blank');
    expect(warns('D1,Test,jeans,ジーンズ,noun,plural,jeanses,,,,').join(' ')).toContain('countable is "plural" (always plural');
    expect(warns('D1,Test,red,赤い,adjective,countable,,,,,')).toContain('countable / plural are for nouns, but pos is "adjective".');
    expect(warns('D1,Test,dog,犬,,countable,dogs,,,,')).toContain('countable / plural are for nouns, but it has no pos.');
    expect(warns('D1,Test,dog,犬,noun,countable,dogs,dogged,,,')).toContain('Verb forms are for verbs, but pos is "noun".');
    expect(warns('D1,Test,dog,犬,noun,,,,,,')).toContain('New noun with no countable.');
    expect(warns('D1,Test,go,行く,verb,,,went,gone,,').join(' ')).toContain('New verb with only some of the four verb forms (verb_ing, verb_third missing)');
    // pos from the database counts; an existing word gets no "new" warnings
    const stored = db([{ english: 'dog', japanese: '犬', pos: 'noun' }]);
    expect(warns('D1,Test,dog,犬,,countable,dogs,,,,', stored)).toHaveLength(0);
    expect(warns('D1,Test,dog,犬,,,,,,,', stored)).toHaveLength(0);
    // clean rows: nothing
    expect(warns('D1,Test,dog,犬,noun,countable,dogs,,,,')).toHaveLength(0);
    expect(warns('D1,Test,go,行く,verb,,,went,gone,going,goes')).toHaveLength(0);
  });

  it('suggests forms for new words, only in the SQL after "Use suggestions"', () => {
    const text = csv('D1,Test,box,箱,noun,countable,,,,,', 'D1,Test,stop,止まる,verb,,,,,,', 'D1,Test,give up,あきらめる,verb,,,gave up,,,');
    const r = tool.analyze(text, null);
    const word = (res, en) => res.words.find((w) => w.english === en);
    expect(word(r, 'box').suggested).toEqual({ plural: 'boxes' });
    expect(word(r, 'stop').suggested).toEqual({ past: 'stopped', pp: 'stopped', ing: 'stopping', third: 'stops' });
    expect(word(r, 'give up').suggested).toEqual({ pp: 'given up', ing: 'giving up', third: 'gives up' });
    expect(r.stats.suggestedWords).toBe(3);
    expect(r.sql).not.toContain('boxes');
    expect(r.sql).not.toContain('stopped');
    const used = tool.analyze(text, null, { useSuggestions: true });
    expect(used.useSuggestions).toBe(true);
    const sql = detailSql(used);
    expect(sql).toContain("('box', '箱', 'countable'::text, 'boxes'::text");
    expect(sql).toContain("('stop', '止まる', null, null, 'stopped', 'stopped', 'stopping', 'stops')");
    expect(sql).toContain("('give up', 'あきらめる', null, null, 'gave up', 'given up', 'giving up', 'gives up')");
  });

  it('no suggestions for existing words, uncountable / proper nouns, filled-in forms or past-form cards', () => {
    const none = (row, store = null) => tool.analyze(csv(row), store).stats.suggestedWords;
    expect(none('D1,Test,box,箱,noun,countable,,,,,', db([{ english: 'box', japanese: '箱', pos: 'noun' }]))).toBe(0);
    expect(none('D1,Test,water,水,noun,uncountable,,,,,')).toBe(0);
    expect(none('D1,Test,Japan,日本,noun,,,,,,')).toBe(0);
    expect(none('D1,Test,jeans,ジーンズ,noun,plural,,,,,')).toBe(0);
    expect(none('D1,Test,box,箱,noun,countable,boxes,,,,')).toBe(0);
    expect(none('D1,Test,go,行く,verb,,,went,gone,going,goes')).toBe(0);
    expect(none('D1,Test,read,読んだ（readの過去形）,verb,,,,,,')).toBe(0);
  });

  it('the example data checks without errors or warnings, and has a suggestion to try', () => {
    const r = tool.analyze(tool.TEMPLATE, null);
    expect(bySev(r, 'error')).toHaveLength(0);
    expect(bySev(r, 'warn')).toHaveLength(0);
    expect(r.stats.withDetails).toBe(4);
    expect(r.stats.suggestedWords).toBe(2);
  });
});

describe('import tool: its copy of scripts/wordForms.js', () => {
  it('has the same irregular lists', () => {
    expect(tool.IRREGULAR_PLURALS).toEqual(IRREGULAR_PLURALS);
    expect(tool.IRREGULAR_VERBS).toEqual(IRREGULAR_VERBS);
  });

  it('gives the same forms', () => {
    const nouns = [...Object.keys(IRREGULAR_PLURALS), 'dog', 'box', 'city', 'day', 'church', 'bookshelf', 'grandchild',
      'policeman', 'human', 'post office', 'cup of tea', 'mother-in-law', 'Japanese', 'T-shirt', 'bus', 'quiz'];
    for (const n of nouns) expect(tool.pluralOf(n), n).toBe(pluralOf(n));
    const verbs = [...Object.keys(IRREGULAR_VERBS), 'stop', 'study', 'play', 'like', 'visit', 'admit', 'prefer', 'lie',
      'see', 'agree', 'continue', 'fix', 'watch', 'give up', 'rewrite', 'misread', 'travel', 'open', 'enjoy', 'cry'];
    for (const v of verbs) expect(tool.verbForms(v), v).toEqual(verbForms(v));
  });
});
