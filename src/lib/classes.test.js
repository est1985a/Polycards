// Tests for the class helpers (join codes, names, 出席番号, roster order). Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  JOIN_CODE_CHARS, normalizeJoinCode, isJoinCodeShaped, splitJoinCode, cleanRealName, realNameValid,
  parseStudentNumber, studentNumberValid, sortRoster, defaultSchoolYear, parseSchoolYear, classNameValid,
  cleanNickname, nicknameValid, NICKNAME_MAX,
} from './classes';
import { readFileSync } from 'node:fs';

describe('join codes', () => {
  it('has no look-alike characters', () => {
    for (const c of ['0', 'O', '1', 'I', 'L']) expect(JOIN_CODE_CHARS).not.toContain(c);
    expect(JOIN_CODE_CHARS).toHaveLength(31);
  });

  it('matches the SQL check (new_join_code / the join_code CHECK)', () => {
    expect(JOIN_CODE_CHARS).toBe('ABCDEFGHJKMNPQRSTUVWXYZ23456789');
  });

  it('cleans what was typed: case, spaces, hyphens, full-width', () => {
    expect(normalizeJoinCode(' abc-def ')).toBe('ABCDEF');
    expect(normalizeJoinCode('ＡＢＣ　２３４')).toBe('ABC234');
    expect(normalizeJoinCode('ab cd ef')).toBe('ABCDEF');
    expect(normalizeJoinCode(null)).toBe('');
  });

  it('knows a code-shaped input', () => {
    expect(isJoinCodeShaped('abc 234')).toBe(true);
    expect(isJoinCodeShaped('ABCDE')).toBe(false);
    expect(isJoinCodeShaped('ABCDEO')).toBe(false); // O is never used
    expect(isJoinCodeShaped('ABCDE1')).toBe(false);
  });

  it('splits a code into two halves for the big display', () => {
    expect(splitJoinCode('ABC234')).toEqual(['ABC', '234']);
    expect(splitJoinCode('')).toEqual(['']);
  });
});

describe('real names and 出席番号', () => {
  it('tidies spaces', () => {
    expect(cleanRealName('  山田　 太郎 ')).toBe('山田 太郎');
    expect(realNameValid('   ')).toBe(false);
    expect(realNameValid('山田太郎')).toBe(true);
    expect(realNameValid('あ'.repeat(41))).toBe(false);
  });

  it('reads the number: blank = none, 1–99, full-width digits', () => {
    expect(parseStudentNumber('')).toBe(null);
    expect(parseStudentNumber(' 7 ')).toBe(7);
    expect(parseStudentNumber('１２')).toBe(12);
    expect(parseStudentNumber('0')).toBeNaN();
    expect(parseStudentNumber('100')).toBeNaN();
    expect(parseStudentNumber('3a')).toBeNaN();
    expect(studentNumberValid('')).toBe(true);
    expect(studentNumberValid('-1')).toBe(false);
  });
});

describe('sortRoster', () => {
  it('sorts by 出席番号, then name; students without a number last', () => {
    const rows = [
      { real_name: 'Ueda', student_number: null },
      { real_name: 'Sato', student_number: 12 },
      { real_name: 'Abe', student_number: null },
      { real_name: 'Kato', student_number: 3 },
    ];
    expect(sortRoster(rows).map((r) => r.real_name)).toEqual(['Kato', 'Sato', 'Abe', 'Ueda']);
    expect(rows[0].real_name).toBe('Ueda'); // the original list is unchanged
  });
});

describe('school year (年度)', () => {
  it('starts on April 1, Japan time', () => {
    expect(defaultSchoolYear(Date.parse('2026-10-30T12:00:00Z'))).toBe(2026);
    expect(defaultSchoolYear(Date.parse('2027-03-31T14:00:00Z'))).toBe(2026); // 23:00 on Mar 31 in Japan
    expect(defaultSchoolYear(Date.parse('2027-03-31T15:00:00Z'))).toBe(2027); // 00:00 on Apr 1 in Japan
  });

  it('reads the 年度 field', () => {
    expect(parseSchoolYear('2026')).toBe(2026);
    expect(parseSchoolYear('２０２６')).toBe(2026);
    expect(parseSchoolYear('26')).toBeNaN();
    expect(parseSchoolYear('1999')).toBeNaN();
  });

  it('checks a class name', () => {
    expect(classNameValid(' 1年A組 ')).toBe(true);
    expect(classNameValid('  ')).toBe(false);
  });
});

describe('full-width join codes (the same in the app and the database)', () => {
  it('cleans full-width letters, digits, spaces, hyphens and ー', () => {
    expect(normalizeJoinCode('ＡＢＣ２３４')).toBe('ABC234');
    expect(normalizeJoinCode('ａｂｃ－２３４')).toBe('ABC234');
    expect(normalizeJoinCode('ABC ー 234')).toBe('ABC234');
    expect(normalizeJoinCode('ABC\u2010234')).toBe('ABC234');
    expect(isJoinCodeShaped('ＡＢＣ　２３４')).toBe(true);
  });

  it('join_class and check_join_code share one clean-up (NFKC, the same characters as normalizeJoinCode)', () => {
    const sql = readFileSync(new URL('../../supabase/polycards-class-tab.sql', import.meta.url), 'utf8');
    expect(sql).toMatch(/clean_join_code[^]*normalize\(coalesce\(p_code, ''\), NFKC\)/);
    expect(sql).toContain("'[-\\s\u30FC\u2010-\u2015]'"); // the real characters ー ‐ ― in the SQL
    const uses = sql.match(/v_code text := public\.clean_join_code\(p_code\);/g) || [];
    expect(uses).toHaveLength(2); // join_class and check_join_code
  });
});

describe('class nicknames', () => {
  it('cleans like clean_nickname() in the SQL: NFKC, spaces collapsed, trimmed', () => {
    expect(cleanNickname('  Ｔａｒｏ　 ２ ')).toBe('Taro 2');
    expect(cleanNickname('ﾀﾛｳ')).toBe('タロウ'); // half-width katakana → full-width
    expect(cleanNickname(null)).toBe('');
  });

  it('allows 1–12 characters (code points), no control characters', () => {
    expect(NICKNAME_MAX).toBe(12);
    expect(nicknameValid('a')).toBe(true);
    expect(nicknameValid('abcdefghijkl')).toBe(true);
    expect(nicknameValid('abcdefghijklm')).toBe(false);
    expect(nicknameValid('　 ')).toBe(false);
    expect(nicknameValid('😀'.repeat(12))).toBe(true); // 12 code points, like char_length
    expect(nicknameValid('😀'.repeat(13))).toBe(false);
    expect(nicknameValid('a\u0007b')).toBe(false);
  });
});
