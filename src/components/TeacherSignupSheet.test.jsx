// Tests for 先生として登録 (static render of each step; taps can't run here). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeacherSignupBody } from './TeacherSignupSheet';
import { schoolLine } from '../lib/schools';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const ryukoku = { id: 's1', name: '龍谷中学校・高等学校', prefecture: 'saga', school_type: 'jhs_hs' };
const render = (initial) => renderToStaticMarkup(<TeacherSignupBody initial={initial} onClose={() => {}} />);

describe('TeacherSignupBody', () => {
  it('search: intro, name + every prefecture, and 新しい学校を登録', () => {
    const h = render({});
    expect(h).toContain('学校をさがして、参加をリクエストしてください。');
    expect(h).toContain('すべての都道府県');
    expect(h).toContain('>北海道<');
    expect(h).toContain('>沖縄県<');
    expect(h).toContain('>海外・その他<');
    expect(h).toContain('見つからない場合');
    expect(h).toContain('新しい学校を登録');
    // さがす is off until there is a name or a prefecture
    expect(h).toMatch(/<button type="submit" disabled=""[^>]*>さがす</);
  });

  it('search results: name, 都道府県・種類 and 選ぶ; or 見つかりませんでした', () => {
    const h = render({ results: [ryukoku], query: '龍谷' });
    expect(h).toContain('data-school-result="s1"');
    expect(h).toContain('龍谷中学校・高等学校');
    expect(h).toContain('佐賀県・中高一貫校');
    expect(h).toContain('>選ぶ<');
    expect(render({ results: [] })).toContain('見つかりませんでした。');
  });

  it('join: the school, 表示名 with its hint, and 参加をリクエスト (off until a name is typed)', () => {
    const h = render({ step: 'join', chosen: ryukoku });
    expect(h).toContain('龍谷中学校・高等学校');
    expect(h).toContain('生徒に見える名前です');
    expect(h).toMatch(/disabled=""[^>]*>参加をリクエスト</);
    expect(render({ step: 'join', chosen: ryukoku, displayName: 'アンドレ先生' })).not.toMatch(/disabled=""[^>]*>参加をリクエスト</);
  });

  it('new school: name, ふりがな, prefecture, type, display name, the note; 次へ only when all is filled in', () => {
    const empty = render({ step: 'new' });
    for (const text of ['学校名', 'ふりがな（任意）', '都道府県', '学校の種類', '表示名', 'Polyvoの管理者が確認してから', '>中高一貫校<', '>小学校<']) {
      expect(empty).toContain(text);
    }
    expect(empty).toMatch(/type="submit" disabled=""[^>]*>次へ</);
    const full = render({ step: 'new', form: { name: '新しい中学校', kana: '', prefecture: 'saga', type: 'jhs' }, displayName: 'A先生' });
    expect(full).not.toMatch(/disabled=""[^>]*>次へ</);
    const badKana = render({ step: 'new', form: { name: '新しい中学校', kana: 'atarashii', prefecture: 'saga', type: 'jhs' }, displayName: 'A先生' });
    expect(badKana).toMatch(/disabled=""[^>]*>次へ</);
  });

  it('similar schools first: この学校ではありませんか？ with 選ぶ, or register anyway', () => {
    const h = render({ step: 'similar', similar: [ryukoku] });
    expect(h).toContain('この学校ではありませんか？');
    expect(h).toContain('data-school-result="s1"');
    expect(h).toContain('どれでもない：新しく登録する');
  });

  it('done: approved at once, request sent, or new school sent', () => {
    expect(render({ step: 'done', done: { kind: 'approved', school: '龍谷中学校・高等学校' } })).toContain('龍谷中学校・高等学校の先生として登録しました！');
    expect(render({ step: 'done', done: { kind: 'pending', school: 'X' } })).toContain('リクエストを送りました。承認されると「先生」タブが表示されます。');
    expect(render({ step: 'done', done: { kind: 'school', school: 'X' } })).toContain('新しい学校の登録を送りました。');
  });

  it('English', () => {
    setLang('en');
    expect(schoolLine(ryukoku)).toBe('Saga · Junior and senior high school');
    expect(render({ step: 'join', chosen: ryukoku })).toContain('Request to join');
  });
});
