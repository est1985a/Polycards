// Tests for the import tool's reading column (words.reading, supabase/polycards-word-readings.sql).
// Run with: npm test
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The import tool is one standalone HTML page; load its script's functions without a browser.
const html = readFileSync(new URL('../tools/deck-import-tool.html', import.meta.url), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const tool = new Function(`${code}\nreturn { analyze, hiraganaReading, TEMPLATE };`)();

const HEADER = 'school_level,textbook,unit_order,unit,deck,collection,english,japanese,reading';
const csv = (...rows) => [HEADER, ...rows].join('\n');
const db = (words, extra = {}) => ({
  words: words.map(({ english, japanese }) => ({ english, japanese })),
  speakRows: [], speakCol: true, readingRows: words, readingCol: true,
  textbooks: [], units: [], decks: [], collections: [],
  exampleCols: true, altCols: true, posCol: true, ...extra,
});
const bySev = (r, sev) => r.issues.filter((i) => i.sev === sev).map((i) => i.msg);
const noReading = (r) => bySev(r, 'warn').filter((m) => m.startsWith('No reading given'));

describe('import tool: readings', () => {
  it('turns katakana into hiragana and tidies spaces', () => {
    expect(tool.hiraganaReading('  カード　 ゲーム ')).toBe('かーど げーむ');
    expect(tool.hiraganaReading('ヴァイオリン・ケース')).toBe('ゔぁいおりん・けーす');
    expect(tool.hiraganaReading('')).toBe('');
  });

  it('writes readings in the SQL, only where the word has none', () => {
    const r = tool.analyze(csv(',,,,D1,Test,card,カード,カード', ',,,,D1,Test,dog,犬,'), null);
    expect(bySev(r, 'error')).toHaveLength(0);
    expect(r.sql).toContain('set reading = v.reading');
    expect(r.sql).toContain("('card', 'カード', 'かーど')");
    expect(r.sql).toContain('and w.reading is null;');
    expect(r.sql).toContain('polycards-word-readings.sql');
    const section = r.sql.split('set reading = v.reading')[1].split(';')[0];
    expect(section).not.toContain("'dog'");
    expect(r.checkSql).toContain('count(w.reading) as with_reading');
    expect(r.stats.withReading).toBe(1);
  });

  it('no reading section when the file has none', () => {
    const r = tool.analyze(csv(',,,,D1,Test,dog,犬,'), null);
    expect(r.sql).not.toContain('reading');
    expect(r.checkSql).not.toContain('with_reading');
  });

  it('errors: kanji, English letters, two readings for one word, no column in the database', () => {
    const errs = (r) => bySev(r, 'error').join(' | ');
    expect(errs(tool.analyze(csv(',,,,D1,Test,borrow,借りる,借りる'), null))).toContain('kanji');
    expect(errs(tool.analyze(csv(',,,,D1,Test,borrow,借りる,kariru'), null))).toContain('English letters');
    expect(errs(tool.analyze(csv(',,,,D1,Test,borrow,借りる,かりる', ',,,,D2,Test,borrow,借りる,かりた'), null))).toContain('same one on both rows');
    const old = db([], { readingCol: false, readingRows: [] });
    expect(errs(tool.analyze(csv(',,,,D1,Test,borrow,借りる,かりる'), old))).toContain('polycards-word-readings.sql');
  });

  it('allows English letters that are in the Japanese meaning, and punctuation', () => {
    const r = tool.analyze(csv(',,,,D1,Test,read,読んだ（readの過去形）,よんだ（readのかこけい）', ',,,,D1,Test,one of ...,...の1つ,...の1つ', ',,,,D1,Test,pretty,かわいい、きれいな,かわいい、きれいな'), null);
    expect(bySev(r, 'error')).toHaveLength(0);
  });

  it('warns once per word when a meaning with kanji or katakana has no reading', () => {
    const r = tool.analyze(csv(',,,,D1,Test,dog,犬,', ',,,,D2,Test,dog,犬,', ',,,,D1,Test,card,カード,'), null);
    expect(noReading(r)).toHaveLength(2);
    expect(noReading(tool.analyze(csv(',,,,D1,Test,apple,りんご,'), null))).toHaveLength(0);
    expect(noReading(tool.analyze(csv(',,,,D1,Test,dog,犬,いぬ'), null))).toHaveLength(0);
    // a reading on another row of the same word counts
    expect(noReading(tool.analyze(csv(',,,,D1,Test,dog,犬,いぬ', ',,,,D2,Test,dog,犬,'), null))).toHaveLength(0);
    // already in the database
    expect(noReading(tool.analyze(csv(',,,,D1,Test,dog,犬,'), db([{ english: 'dog', japanese: '犬', reading: 'いぬ' }])))).toHaveLength(0);
  });

  it('keeps a different reading that is already in the database (info line)', () => {
    const stored = db([{ english: 'dog', japanese: '犬', reading: 'いぬ' }]);
    const r = tool.analyze(csv(',,,,D1,Test,dog,犬,わんちゃん'), stored);
    expect(bySev(r, 'info')).toContain('This word already has a reading (いぬ). It is kept.');
    expect(tool.analyze(csv(',,,,D1,Test,dog,犬,いぬ'), stored).issues.some((i) => i.msg.includes('already has a reading'))).toBe(false);
  });

  it('the example data checks without errors', () => {
    const r = tool.analyze(tool.TEMPLATE, null);
    expect(bySev(r, 'error')).toHaveLength(0);
    expect(r.stats.withReading).toBe(5);
  });
});
