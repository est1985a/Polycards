// Tests for 名簿を貼り付け: reading a pasted roster and the preview statuses. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  parseRosterPaste, splitRosterLine, rosterPayload, previewRows, previewSummary, cleanEmail, emailValid, isSchoolEmail,
  ROSTER_MAX_ROWS,
} from './rosterPaste';

const shape = (rows) => rows.map((r) => [r.studentNumber, r.realName, r.email, r.problems.join(',')]);

describe('splitRosterLine', () => {
  it('splits on tabs when there is one, else reads CSV with quotes', () => {
    expect(splitRosterLine('1\t山田, 太郎\ta@b.jp')).toEqual(['1', '山田, 太郎', 'a@b.jp']);
    expect(splitRosterLine('1,山田 太郎,a@b.jp')).toEqual(['1', '山田 太郎', 'a@b.jp']);
    expect(splitRosterLine('1,"山田, 太郎",a@b.jp')).toEqual(['1', '山田, 太郎', 'a@b.jp']);
    expect(splitRosterLine('1, "say ""hi""" ,a@b.jp')).toEqual(['1', 'say "hi" ', 'a@b.jp']);
  });
});

describe('parseRosterPaste', () => {
  it('reads tab-separated rows copied from Excel / Sheets', () => {
    const p = parseRosterPaste('1\t山田 太郎\ttaro@ryukokurg.ed.jp\n2\t佐藤 花子\thanako@ryukokurg.ed.jp');
    expect(p.headerSkipped).toBe(false);
    expect(shape(p.rows)).toEqual([
      [1, '山田 太郎', 'taro@ryukokurg.ed.jp', ''],
      [2, '佐藤 花子', 'hanako@ryukokurg.ed.jp', ''],
    ]);
    expect(p.rows.map((r) => r.line)).toEqual([1, 2]);
  });

  it('reads CSV (commas, quotes, CRLF line endings)', () => {
    const p = parseRosterPaste('1,"山田 太郎",taro@ryukokurg.ed.jp\r\n2,佐藤 花子,hanako@ryukokurg.ed.jp\r\n');
    expect(shape(p.rows)).toEqual([
      [1, '山田 太郎', 'taro@ryukokurg.ed.jp', ''],
      [2, '佐藤 花子', 'hanako@ryukokurg.ed.jp', ''],
    ]);
  });

  it('skips a header row (first row without @) and blank lines', () => {
    const p = parseRosterPaste('出席番号\t名前\tメールアドレス\n\n1\t山田 太郎\ttaro@ryukokurg.ed.jp\n   \n\t\t\n2\t佐藤 花子\thanako@ryukokurg.ed.jp\n');
    expect(p.headerSkipped).toBe(true);
    expect(p.rows.map((r) => r.line)).toEqual([3, 6]);
  });

  it('keeps a first row that has an @ (no header)', () => {
    expect(parseRosterPaste('1,A,a@b.jp').headerSkipped).toBe(false);
  });

  it('full-width digits, letters and spaces; extra spaces; upper-case email', () => {
    const p = parseRosterPaste('１２\t　山田　　太郎　\t  Taro.Yamada@RYUKOKURG.ED.JP  \n ３ , 佐藤 花子 , ｈａｎａｋｏ＠ｒｙｕｋｏｋｕｒｇ．ｅｄ．ｊｐ');
    expect(shape(p.rows)).toEqual([
      [12, '山田 太郎', 'taro.yamada@ryukokurg.ed.jp', ''],
      [3, '佐藤 花子', 'hanako@ryukokurg.ed.jp', ''],
    ]);
  });

  it('an empty 出席番号 is allowed (null); a bad one is a problem', () => {
    const p = parseRosterPaste('\t山田\ta@b.jp\n100\t佐藤\tb@b.jp\nx\t鈴木\tc@b.jp\n0\t田中\td@b.jp');
    expect(p.rows.map((r) => [r.studentNumber, r.problems])).toEqual([[null, []], [NaN, ['number']], [NaN, ['number']], [NaN, ['number']]]);
  });

  it('flags missing columns, a missing name, a bad email and duplicate emails', () => {
    const p = parseRosterPaste([
      '2\t\tb@b.jp',
      '1\t山田 太郎',
      '3\t鈴木\tnot-an-email',
      '4\tA\tsame@b.jp',
      '5\tB\tSAME@b.jp',
      `6\t${'あ'.repeat(41)}\tlong@b.jp`,
    ].join('\n'));
    expect(p.rows.map((r) => r.problems)).toEqual([
      ['noName'], ['columns'], ['email'], ['duplicateEmail'], ['duplicateEmail'], ['name'],
    ]);
  });

  it('reads hand-typed lines separated by spaces (number optional, email last)', () => {
    const p = parseRosterPaste('1 山田 太郎 taro@ryukokurg.ed.jp\n１２　佐藤　花子　hanako@ryukokurg.ed.jp\nKenta Mori kenta@ryukokurg.ed.jp');
    expect(shape(p.rows)).toEqual([
      [1, '山田 太郎', 'taro@ryukokurg.ed.jp', ''],
      [12, '佐藤 花子', 'hanako@ryukokurg.ed.jp', ''],
      [null, 'Kenta Mori', 'kenta@ryukokurg.ed.jp', ''],
    ]);
  });

  it('a typed number that is too big is still the number (an error), never part of the name', () => {
    const [row] = parseRosterPaste('120 番号ミス test@ryukokurg.ed.jp').rows;
    expect([row.numberText, row.realName, row.problems]).toEqual(['120', '番号ミス', ['number']]);
  });

  it('a line with only an email says the name is missing; a line without an email has missing columns', () => {
    const p = parseRosterPaste('kenta@ryukokurg.ed.jp\nblahblah@ryukokurg.ed.jp\n120');
    expect(p.rows.map((r) => [r.raw, r.problems])).toEqual([
      ['kenta@ryukokurg.ed.jp', ['noName']],
      ['blahblah@ryukokurg.ed.jp', ['noName']],
      ['120', ['columns']],
    ]);
  });

  it('ignores extra columns', () => {
    expect(shape(parseRosterPaste('1\tA\ta@b.jp\t1年A組\tメモ').rows)).toEqual([[1, 'A', 'a@b.jp', '']]);
  });

  it(`says when there are more than ${ROSTER_MAX_ROWS} rows`, () => {
    const lines = (n) => Array.from({ length: n }, (_, i) => `${(i % 99) + 1}\tName\tr${i}@b.jp`).join('\n');
    expect(parseRosterPaste(lines(ROSTER_MAX_ROWS)).tooMany).toBe(false);
    expect(parseRosterPaste(lines(ROSTER_MAX_ROWS + 1)).tooMany).toBe(true);
  });

  it('nothing pasted → no rows', () => {
    expect(parseRosterPaste('').rows).toEqual([]);
    expect(parseRosterPaste('\n \n').rows).toEqual([]);
    expect(parseRosterPaste('名前だけ').rows).toEqual([]); // only a header
  });
});

describe('emails', () => {
  it('cleans, checks and recognizes the school domain', () => {
    expect(cleanEmail('  A@B.JP ')).toBe('a@b.jp');
    expect(emailValid('a@b.jp')).toBe(true);
    expect(emailValid('a@b')).toBe(false);
    expect(emailValid('a b@c.jp')).toBe(false);
    expect(isSchoolEmail('Taro@RyukokuRG.ed.jp')).toBe(true);
    expect(isSchoolEmail('taro@gmail.com')).toBe(false);
    expect(isSchoolEmail('taro@x.ryukokurg.ed.jp.evil.com')).toBe(false);
  });
});

describe('rosterPayload', () => {
  it('sends only rows without problems, number as text ("" when empty)', () => {
    const p = parseRosterPaste('1\tA\ta@b.jp\nx\tB\tb@b.jp\n\tC\tc@b.jp');
    expect(rosterPayload(p)).toEqual([
      { student_number: '1', real_name: 'A', email: 'a@b.jp' },
      { student_number: '', real_name: 'C', email: 'c@b.jp' },
    ]);
  });
});

describe('previewRows', () => {
  const parsed = parseRosterPaste([
    '1\t新規\tnew@ryukokurg.ed.jp',
    'x\t番号ミス\tbad@ryukokurg.ed.jp',
    '2\tログイン済み\tin@ryukokurg.ed.jp',
    '3\t在籍\tmember@ryukokurg.ed.jp',
    '4\t更新\tpending@ryukokurg.ed.jp',
    '5\t外部\tsomeone@gmail.com',
    '6\t使用済み\tclaimed@ryukokurg.ed.jp',
  ].join('\n'));
  const results = [
    { row: 1, status: 'added_pending' },
    { row: 2, status: 'added_member' },
    { row: 3, status: 'already_member' },
    { row: 4, status: 'updated' },
    { row: 5, status: 'added_pending' },
    { row: 6, status: 'error', reason: 'already_claimed' },
  ];

  it('combines my checks with the database answers, in order', () => {
    const rows = previewRows(parsed, results);
    expect(rows.map((r) => [r.realName, r.status, r.reason])).toEqual([
      ['新規', 'added_pending', null],
      ['番号ミス', 'error', 'number'],
      ['ログイン済み', 'added_member', null],
      ['在籍', 'already_member', null],
      ['更新', 'updated', null],
      ['外部', 'added_pending', null],
      ['使用済み', 'error', 'alreadyClaimed'],
    ]);
    expect(previewSummary(rows)).toEqual({ add: 4, errors: 2, already: 1 });
  });

  it('before the check, rows are unchecked', () => {
    expect(previewRows(parsed, null).map((r) => r.status)).toEqual(['unchecked', 'error', 'unchecked', 'unchecked', 'unchecked', 'unchecked', 'unchecked']);
  });

  it('flags an address outside the school (allowed)', () => {
    const rows = previewRows(parsed, results);
    expect(rows.filter((r) => r.outsideSchool).map((r) => r.realName)).toEqual(['外部']);
  });

  it('an unknown database reason becomes "other"', () => {
    const p = parseRosterPaste('1\tA\ta@b.jp');
    expect(previewRows(p, [{ status: 'error', reason: 'something_new' }])[0].reason).toBe('other');
  });

  it('warns about the same 出席番号 in the paste, on the roster, or 未ログイン', () => {
    const p = parseRosterPaste('1\tA\ta@b.jp\n1\tB\tb@b.jp\n2\tC\tc@b.jp\n3\tD\td@b.jp\n4\tE\te@b.jp\n\tF\tf@b.jp');
    const res = Array.from({ length: 6 }, () => ({ status: 'added_pending' }));
    const members = [{ student_number: 2, email: 'member@b.jp' }, { student_number: 4, email: 'E@b.jp' }];
    const pending = [{ student_number: 3, email: 'p@b.jp' }];
    const rows = previewRows(p, res, members, pending);
    expect(rows.map((r) => [r.realName, r.sameNumber])).toEqual([
      ['A', true], ['B', true], // twice in the paste
      ['C', true], // a member has 2
      ['D', true], // a 未ログイン row has 3
      ['E', false], // the member with 4 IS this row (same email): no warning about itself
      ['F', false], // no number
    ]);
  });
});
