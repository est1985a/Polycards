// Tests for the teacher's CSV files: Japanese headers (even in English mode), Japan times,
// roster order, escaping. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { overviewCsv, assignmentCsv, awardsCsv, classCsvName } from './classCsv';
import { assignmentStudents } from './assignments';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const lines = (text) => text.replace(/^\uFEFF/, '').split('\r\n');

describe('overviewCsv', () => {
  const rows = [
    { student_id: 'b', student_number: 2, real_name: '鈴木', nickname: '=evil', last_studied_at: null, reviews: 0, study_days: 0, streak: 0, player_level: 1, cards: 0, tickets: 0, honesty: {} },
    { student_id: 'a', student_number: 1, real_name: '佐藤', nickname: 'Sato', last_studied_at: '2026-10-30T09:05:00Z', reviews: 42, study_days: 3, streak: 2, player_level: 4, cards: 120, tickets: 1, honesty: {} },
  ];

  it('has Japanese headers with the period, roster order and Japan times', () => {
    const out = lines(overviewCsv(rows, 7));
    expect(out[0]).toBe('番号,名前,ニックネーム,最終学習,レビュー（7日）,学習日数（7日）,連続,ランク,カード,ガチャ券,要確認');
    expect(out[1]).toBe('1,佐藤,Sato,2026-10-30 18:05,42,3,2,4,120,1,いいえ');
    expect(out[2]).toBe("2,鈴木,'=evil,,0,0,0,1,0,0,いいえ");
    expect(out[3]).toBe(''); // the file ends with CRLF
  });

  it('stays Japanese in English mode', () => {
    setLang('en');
    expect(lines(overviewCsv(rows, 30))[0]).toBe('番号,名前,ニックネーム,最終学習,レビュー（30日）,学習日数（30日）,連続,ランク,カード,ガチャ券,要確認');
  });
});

describe('assignmentCsv', () => {
  it('one row per student with status, percent and cards', () => {
    const rows = assignmentStudents(
      { word_count: 2, students: [
        { student_id: 'a', added: true, owned: 4, learned: 3, total: 4 },
        { student_id: 'b', added: false, owned: 0, learned: 0, total: 4 },
      ] },
      [{ student_id: 'b', real_name: '鈴木', student_number: 2 }, { student_id: 'a', real_name: '佐藤, 花子', student_number: 1, nickname: 'Hana' }],
    );
    const out = lines(assignmentCsv(rows));
    expect(out[0]).toBe('番号,名前,ニックネーム,状態,進み具合（%）,覚えたカード,全カード,マイデッキ追加');
    expect(out[1]).toBe('1,"佐藤, 花子",Hana,学習中,75,3,4,はい');
    expect(out[2]).toBe('2,鈴木,,未追加,0,0,4,いいえ');
  });
});

describe('awardsCsv', () => {
  it('one row per give; messages with line breaks and quotes are escaped', () => {
    const out = awardsCsv([{
      created_at: '2026-10-29T23:30:00Z', teacher_name: 'アンドレ先生', amount: 2, student_count: 2,
      student_names: ['佐藤', '鈴木'], message: 'よくがんばった！\n"すごい"',
    }]);
    expect(out).toBe('\uFEFF日時,先生,枚数,人数,生徒,メッセージ\r\n2026-10-30 08:30,アンドレ先生,2,2,佐藤、鈴木,"よくがんばった！\n""すごい"""\r\n');
  });
});

describe('classCsvName', () => {
  it('uses the Japan date and Japanese kinds', () => {
    const now = Date.parse('2026-10-29T16:00:00Z'); // Oct 30, 01:00 in Japan
    setLang('en');
    expect(classCsvName('1年A組', 'overview', now)).toBe('1年A組_一覧_2026-10-30.csv');
    expect(classCsvName('1年A組', 'assignment', now, 'Lesson 1')).toBe('1年A組_課題_Lesson 1_2026-10-30.csv');
    expect(classCsvName('1年A組', 'awards', now)).toBe('1年A組_チケット_2026-10-30.csv');
  });
});
