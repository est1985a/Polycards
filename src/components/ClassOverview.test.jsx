// Tests for the teacher's class overview, class trouble words and honesty panel (static render;
// taps can't run here). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassOverview from './ClassOverview';
import ClassTroubleWords from './ClassTroubleWords';
import HonestyPanel from './HonestyPanel';
import ClassPage from './ClassPage';
import ja from '../i18n/ja';
import en from '../i18n/en';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const NOW = Date.parse('2026-10-30T12:00:00+09:00');
const FAST = { tap_answers: 0, tap_got_it: 0, typed_answers: 0, typed_correct: 0, timed_got_it: 40, fast_got_it: 30 };
const row = (id, number, name, extra = {}) => ({
  student_id: id, student_number: number, real_name: name, display_name: id, last_studied_at: '2026-10-29T03:00:00Z',
  reviews: 12, study_days: 3, streak: 2, player_level: 4, cards: 80, tickets: 2, honesty: {}, ...extra,
});
const ROWS = [row('b', 2, '高橋 次郎', { honesty: FAST }), row('a', 1, '佐藤 一郎', { reviews: 0, study_days: 0, last_studied_at: null })];
const overview = (props = {}) => renderToStaticMarkup(
  <ClassOverview rows={ROWS} days={7} sort={{ key: 'number', dir: 'asc' }} onSort={() => {}} now={NOW} {...props} />,
);

describe('ClassOverview', () => {
  it('lists students in 出席番号 order with every column on a wide screen', () => {
    const h = overview({ wide: true });
    expect(h.indexOf('佐藤 一郎')).toBeLessThan(h.indexOf('高橋 次郎'));
    for (const col of ['番号', '名前', '最終学習', 'レビュー', '学習日数', '連続', 'ランク', 'カード', 'ガチャ券']) expect(h).toContain(col);
    expect(h).toContain('昨日');
    expect(h.match(/data-overview-row/g)).toHaveLength(2);
  });

  it('marks the sorted column for screen readers', () => {
    const h = overview({ sort: { key: 'reviews', dir: 'desc' } });
    expect(h).toContain('aria-sort="descending"');
    expect(h.match(/aria-sort="none"/g).length).toBeGreaterThan(3);
  });

  it('shows 未学習 for a student with no reviews in the period', () => {
    const h = overview();
    expect(h).toContain('未学習');
    expect(h.match(/data-unstudied/g)).toHaveLength(1);
  });

  it('shows the flag only on a flagged student', () => {
    const h = overview();
    expect(h.match(/aria-label="確認したほうがいいかも"/g)).toHaveLength(1);
  });

  it('drops the less important columns on a phone', () => {
    const h = overview({ wide: false });
    for (const col of ['最終学習', '連続', 'ランク', 'カード', 'ガチャ券']) expect(h).not.toContain(`>${col}<`);
    expect(h).toContain('レビュー');
  });

  it('header and rows share one fixed set of columns, centered except the name', () => {
    const h = overview({ wide: true, selectable: true });
    expect(h).toContain('table-layout:fixed');
    expect(h.match(/<col[ />]/g)).toHaveLength(11); // checkbox + 10 columns
    const aligns = (tag) => [...h.matchAll(new RegExp(`<${tag}[^>]*text-align:(\\w+)`, 'g'))].map((m) => m[1]);
    expect(aligns('th')).toEqual(['center', 'left', ...Array(8).fill('center')]);
    expect(aligns('td').slice(0, 10)).toEqual(['center', 'left', ...Array(8).fill('center')]);
  });

  it('scrolls inside its card with a sticky header only for a long class', () => {
    expect(overview()).not.toContain('data-overview-scroll');
    expect(overview()).not.toContain('position:sticky');
    const many = Array.from({ length: 16 }, (_, i) => row(`s${i}`, i + 1, `生徒 ${i + 1}`));
    const h = overview({ rows: many });
    expect(h).toContain('data-overview-scroll');
    expect(h).toContain('max-height:70vh');
    expect(h).toContain('position:sticky');
  });

  it('has the Phase 2 checkboxes when giving is possible', () => {
    expect(overview({ selectable: true }).match(/role="checkbox"/g)).toHaveLength(2);
    expect(overview()).not.toContain('role="checkbox"');
  });

  it('says loading, and no students', () => {
    expect(overview({ rows: null })).toContain('読み込み中');
    expect(overview({ rows: [] })).toContain(ja['teacher.noStudents']);
  });
});

describe('ClassTroubleWords', () => {
  const WORDS = [{
    word_id: 'w1', english: 'borrow', japanese: '借りる', pos: 'verb', student_count: 2, misses: 5,
    students: [{ student_id: 'a', real_name: '佐藤 一郎', student_number: 1, misses: 3 }, { student_id: 'b', real_name: '高橋 次郎', student_number: 2, misses: 2 }],
  }];

  it('lists each word with how many students and misses', () => {
    const h = renderToStaticMarkup(<ClassTroubleWords words={WORDS} days={7} />);
    for (const text of ['borrow', '借りる', '動詞', '2人', '計5回', 'コピー', 'よく間違えた単語（7日間）']) expect(h).toContain(text);
    expect(h).toContain('aria-expanded="false"');
    expect(h).not.toContain('佐藤 一郎');
  });

  it('shows who missed an opened word', () => {
    const h = renderToStaticMarkup(<ClassTroubleWords words={WORDS} days={7} initialOpen={['w1']} />);
    expect(h).toContain('aria-expanded="true"');
    expect(h.indexOf('佐藤 一郎')).toBeLessThan(h.indexOf('高橋 次郎'));
    expect(h).toContain('×3');
  });

  it('empty and loading', () => {
    const empty = renderToStaticMarkup(<ClassTroubleWords words={[]} days={30} />);
    expect(empty).toContain('この期間によく間違えた単語はありません');
    expect(empty).not.toContain('コピー');
    expect(renderToStaticMarkup(<ClassTroubleWords words={null} days={7} />)).toContain('読み込み中');
  });
});

describe('HonestyPanel', () => {
  it('says データ不足 for both parts when there is little data', () => {
    const h = renderToStaticMarkup(<HonestyPanel counts={{ tap_answers: 12, typed_answers: 3, timed_got_it: 4 }} />);
    expect(h.match(/データ不足/g)).toHaveLength(2);
    expect(h).not.toContain('確認したほうがいいかも');
    expect(h).not.toContain('特に気になるところはありません');
    expect(h).toContain('これはヒントで、証拠ではありません');
  });

  it('shows the numbers and the gentle flag', () => {
    const h = renderToStaticMarkup(<HonestyPanel counts={{
      tap_answers: 120, tap_got_it: 110, typed_answers: 45, typed_correct: 18, timed_got_it: 80, fast_got_it: 50,
    }} />);
    expect(h).toContain('タップでわかった 92% ／ スペル正解 40%');
    expect(h).toContain('差 52ポイント');
    expect(h).toContain('めくるまで1秒未満のわかった 63%');
    expect(h).toContain('80回中50回');
    expect(h).toContain('data-honesty-flag');
  });

  it('says nothing stands out when there is enough data and no flag', () => {
    const h = renderToStaticMarkup(<HonestyPanel counts={{ tap_answers: 40, tap_got_it: 30, typed_answers: 40, typed_correct: 28 }} />);
    expect(h).toContain('特に気になるところはありません');
    expect(h).not.toContain('data-honesty-flag');
  });

  it('loading and error', () => {
    expect(renderToStaticMarkup(<HonestyPanel counts={null} />)).toContain('読み込み中');
    expect(renderToStaticMarkup(<HonestyPanel counts={null} error="だめ" />)).toContain('だめ');
  });

  it('works in English', () => {
    setLang('en');
    const h = renderToStaticMarkup(<HonestyPanel counts={{ timed_got_it: 40, fast_got_it: 40 }} />);
    expect(h).toContain('Might be worth a check');
    expect(h).toContain('under 1 s: 100%');
  });
});

describe('gentle wording', () => {
  it('never uses blaming words in the teacher hint text', () => {
    for (const dict of [ja, en]) {
      for (const [key, value] of Object.entries(dict)) {
        if (!/^(honesty|overview|classTrouble)\./.test(key)) continue;
        const text = typeof value === 'function' ? value({ n: 2, count: 2 }) : value;
        expect(text).not.toMatch(/不正|ズル|ずる|うそ|嘘|cheat|lie|dishonest/i);
      }
    }
  });
});

describe('ClassPage views', () => {
  const DETAIL = {
    class: { id: 'c1', name: '1年A組', school_year: 2026, join_code: 'ABC234', archived: false },
    students: [{ student_id: 'a', real_name: '佐藤 一郎', student_number: 1, display_name: 'aiden', email: 'a@x' }],
    teachers: [{ teacher_id: 't1', display_name: 'test1', is_me: true }],
  };
  const page = (props) => renderToStaticMarkup(
    <ClassPage detail={DETAIL} onBack={() => {}} onUpdateClass={() => {}} onSetArchived={() => {}} onRegenerate={() => {}}
      onUpdateMember={() => {}} onRemoveMember={() => {}} onOpenSearch={() => {}} onShowLarge={() => {}} {...props} />,
  );

  it('opens on 一覧 with the period switch, the table and trouble words', () => {
    const h = page({ overview: [row('a', 1, '佐藤 一郎')], troubleWords: [] });
    expect(h).toContain('data-overview');
    expect(h).toContain('30日間');
    expect(h).toContain('よく間違えた単語');
    expect(h).not.toContain('data-roster');
    expect(h).toContain('参加コード');
  });

  it('名簿 shows the Phase 2 roster without the period switch', () => {
    const h = page({ view: 'roster' });
    expect(h).toContain('data-roster');
    expect(h).not.toContain('30日間');
    expect(h).not.toContain('data-overview');
  });
});

describe('ClassOverview: same 出席番号', () => {
  it('marks only the rows that share a number', () => {
    const rows = [...ROWS, row('c', 2, '木村 三郎')];
    expect(overview({ rows }).match(/data-same-number=""/g)).toHaveLength(2);
    expect(overview()).not.toContain('data-same-number');
  });
});
