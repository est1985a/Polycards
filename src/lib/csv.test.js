// Tests for the CSV helpers: BOM, CRLF, escaping, the formula guard and file names. Run with: npm test
import { describe, it, expect } from 'vitest';
import { csvCell, toCsv, csvFileName, BOM } from './csv';

describe('csvCell', () => {
  it('leaves plain text and numbers alone', () => {
    expect(csvCell('山田 太郎')).toBe('山田 太郎');
    expect(csvCell(12)).toBe('12');
    expect(csvCell(0)).toBe('0');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes commas, quotes and line breaks (quotes doubled)', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
  });

  it('stops text that looks like a formula from running in Excel', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+81')).toBe("'+81");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@me')).toBe("'@me");
    expect(csvCell(-1)).toBe('-1'); // a real number is not text
  });
});

describe('toCsv', () => {
  it('starts with a BOM and ends every line with CRLF', () => {
    const text = toCsv(['番号', '名前'], [[1, '佐藤'], [2, '鈴木, 花子']]);
    expect(text.startsWith(BOM)).toBe(true);
    expect(BOM).toBe('\uFEFF');
    expect(text).toBe('\uFEFF番号,名前\r\n1,佐藤\r\n2,"鈴木, 花子"\r\n');
  });

  it('works with no rows', () => {
    expect(toCsv(['a'], [])).toBe('\uFEFFa\r\n');
  });
});

describe('csvFileName', () => {
  it('joins class, kind, extra and date with _', () => {
    expect(csvFileName('1年A組', '一覧', '2026-10-30')).toBe('1年A組_一覧_2026-10-30.csv');
    expect(csvFileName('1年A組', '課題', '2026-10-30', 'Lesson 1')).toBe('1年A組_課題_Lesson 1_2026-10-30.csv');
  });

  it('replaces characters that file names cannot have', () => {
    expect(csvFileName('1/2組', '課題', '2026-10-30', 'Q: "what?"')).toBe('1_2組_課題_Q_ _what___2026-10-30.csv');
  });
});
