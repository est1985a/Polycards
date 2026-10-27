// Tests for the heteronym list, the recording script's --heteronyms option, and the import tool's
// speak_as column + heteronym warning. Run with: npm test
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HETERONYMS, isHeteronym, heteronymNote, heteronymsToCheck } from './heteronyms.js';
import { parseOptions } from './audioPlan.js';

// The import tool is one standalone HTML page; load its script's functions without a browser.
const html = readFileSync(new URL('../tools/deck-import-tool.html', import.meta.url), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const tool = new Function(`${code}\nreturn { analyze, generateSql, HETERONYMS };`)();

const HEADER = 'school_level,textbook,unit_order,unit,deck,collection,english,japanese,pos,speak_as';
const csv = (...rows) => [HEADER, ...rows].join('\n');
const db = (words) => ({
  words: words.map(({ english, japanese }) => ({ english, japanese })),
  speakRows: words, speakCol: true, textbooks: [], units: [], decks: [], collections: [],
  exampleCols: true, altCols: true, posCol: true,
});
const heteronymWarnings = (r) => r.issues.filter((i) => i.msg.startsWith('Heteronym'));

describe('heteronym list', () => {
  it('knows common heteronyms, ignoring case and spaces', () => {
    expect(isHeteronym('read')).toBe(true);
    expect(isHeteronym('  Live ')).toBe(true);
    expect(isHeteronym('dog')).toBe(false);
    expect(isHeteronym('')).toBe(false);
    expect(isHeteronym('constructor')).toBe(false); // not inherited object keys
    expect(heteronymNote('read')).toContain('red');
    expect(heteronymNote('dog')).toBe('');
  });

  it('every entry has a note, keys are lowercase', () => {
    for (const [word, note] of Object.entries(HETERONYMS)) {
      expect(word).toBe(word.toLowerCase().trim());
      expect(note.length).toBeGreaterThan(5);
    }
  });

  it('the import tool has exactly the same list', () => {
    expect(tool.HETERONYMS).toEqual(HETERONYMS);
  });

  it('lists heteronyms without speak_as, sorted', () => {
    const words = [
      { id: 1, english: 'read', japanese: '読んだ', speak_as: 'red' },
      { id: 2, english: 'read', japanese: '読む', speak_as: null },
      { id: 3, english: 'dog', japanese: '犬' },
      { id: 4, english: 'Live', japanese: '住む', speak_as: '  ' },
    ];
    expect(heteronymsToCheck(words).map((w) => w.id)).toEqual([4, 2]);
  });
});

describe('recording script options', () => {
  it('--heteronyms', () => {
    expect(parseOptions([]).heteronyms).toBe(false);
    expect(parseOptions(['--heteronyms']).heteronyms).toBe(true);
  });
});

describe('import tool: speak_as and heteronyms', () => {
  it('warns about a heteronym with no speak_as, with a past-tense hint for read', () => {
    const r = tool.analyze(csv(',,,,D1,Test,read,読んだ（readの過去形）,verb,'), null);
    const w = heteronymWarnings(r);
    expect(w).toHaveLength(1);
    expect(w[0].sev).toBe('warn');
    expect(w[0].msg).toContain('set speak_as to red');
  });

  it('no hint for present-tense read, but still a warning', () => {
    const w = heteronymWarnings(tool.analyze(csv(',,,,D1,Test,read,読む,verb,'), null));
    expect(w).toHaveLength(1);
    expect(w[0].msg).not.toContain('set speak_as to red');
  });

  it('no warning when speak_as is in the file or already in the database, or for normal words', () => {
    expect(heteronymWarnings(tool.analyze(csv(',,,,D1,Test,read,読んだ,verb,red'), null))).toHaveLength(0);
    expect(heteronymWarnings(tool.analyze(csv(',,,,D1,Test,dog,犬,noun,'), null))).toHaveLength(0);
    const stored = db([{ english: 'read', japanese: '読んだ', speak_as: 'red' }]);
    expect(heteronymWarnings(tool.analyze(csv(',,,,D1,Test,read,読んだ,verb,'), stored))).toHaveLength(0);
  });

  it('writes speak_as in the SQL, never overwriting an existing one', () => {
    const r = tool.analyze(csv(',,,,D1,Test,read,読んだ,verb,red', ',,,,D1,Test,dog,犬,noun,'), null);
    expect(r.issues.filter((i) => i.sev === 'error')).toHaveLength(0);
    expect(r.sql).toContain('set speak_as = v.speak_as');
    expect(r.sql).toContain("('read', '読んだ', 'red')");
    expect(r.sql).toContain("coalesce(btrim(w.speak_as), '') = ''");
    const section = r.sql.split('set speak_as = v.speak_as')[1].split(';')[0];
    expect(section).not.toContain("'dog'");
  });

  it('no speak_as section when the file has none', () => {
    const r = tool.analyze(csv(',,,,D1,Test,dog,犬,noun,'), null);
    expect(r.sql).not.toContain('speak_as');
  });

  it('errors: Japanese in speak_as, two different speak_as for one word, no column in the database', () => {
    const errs = (r) => r.issues.filter((i) => i.sev === 'error').map((i) => i.msg).join(' | ');
    expect(errs(tool.analyze(csv(',,,,D1,Test,read,読んだ,verb,レッド'), null))).toContain('Japanese');
    expect(errs(tool.analyze(csv(',,,,D1,Test,read,読んだ,verb,red', ',,,,D2,Test,read,読んだ,verb,redd'), null))).toContain('same one on both rows');
    const old = { ...db([]), speakCol: false };
    expect(errs(tool.analyze(csv(',,,,D1,Test,read,読んだ,verb,red'), old))).toContain('polycards-word-audio.sql');
  });

  it('warns when the database already has a different speak_as (kept)', () => {
    const stored = db([{ english: 'read', japanese: '読んだ', speak_as: 'red' }]);
    const r = tool.analyze(csv(',,,,D1,Test,read,読んだ,verb,redd'), stored);
    expect(r.issues.some((i) => i.sev === 'warn' && i.msg.includes('existing one is kept'))).toBe(true);
  });
});
