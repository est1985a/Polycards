// Tests for 名簿を貼り付け: the preview list (static render; taps can't run here). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RosterPastePreview, StatusPill } from './RosterPasteSheet';
import { parseRosterPaste, previewRows } from '../lib/rosterPaste';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const parsed = parseRosterPaste([
  '出席番号\t名前\tメールアドレス',
  '1\t山田 太郎\ttaro@ryukokurg.ed.jp',
  '1\t佐藤 花子\thanako@gmail.com',
  '3\t鈴木 一\tichi@ryukokurg.ed.jp',
  '4\t田中\tnot-an-email',
].join('\n'));
const results = [{ status: 'added_pending' }, { status: 'error', reason: 'outside_school_domain' }, { status: 'already_member' }];

describe('RosterPastePreview', () => {
  const h = renderToStaticMarkup(<RosterPastePreview rows={previewRows(parsed, results)} headerSkipped={parsed.headerSkipped} domains={['ryukokurg.ed.jp']} />);

  it('shows every row with its status', () => {
    expect(h).toContain('1行目は見出しとして読み飛ばしました。');
    expect(h).toContain('山田 太郎');
    expect(h).toContain('taro@ryukokurg.ed.jp');
    expect(h).toContain('新規');
    expect(h).toContain('すでにクラスにいる');
    expect(h).toContain('エラー');
    expect(h).toContain('メールアドレスの形が正しくありません');
    expect(h).toContain('エラーの行は追加されません。');
  });

  it('an address outside the school is an error row naming the school domain', () => {
    expect(h.match(/data-roster-reason="outsideSchool"/g)).toHaveLength(1);
    expect(h).toContain('学校のアドレス（@ryukokurg.ed.jp）ではないので、追加できません');
    expect(h).not.toContain('data-outside-school');
  });

  it('the same 出席番号 gets the gold 番号重複 tag (rows that will be saved only)', () => {
    const p = parseRosterPaste('1\tA\ta@ryukokurg.ed.jp\n1\tB\tb@ryukokurg.ed.jp');
    const html = renderToStaticMarkup(<RosterPastePreview rows={previewRows(p, [{ status: 'added_pending' }, { status: 'added_member' }])} />);
    expect(html.match(/data-duplicate-number/g)).toHaveLength(2);
    expect(html).toContain('すぐ追加（ログイン済み）');
  });

  it('a line that could not be split is shown as pasted, with nothing in the number column', () => {
    const p = parseRosterPaste('1\tA\ta@b.jp\n120 only');
    const html = renderToStaticMarkup(<RosterPastePreview rows={previewRows(p, [{ status: 'added_pending' }])} />);
    expect(html).toContain('120 only');
    expect(html).toContain('列が足りません。1行に「出席番号・名前・メールアドレス」を入れてください');
    const email = renderToStaticMarkup(<RosterPastePreview rows={previewRows(parseRosterPaste('kenta@ryukokurg.ed.jp'), [])} />);
    expect(email).toContain('名前がありません');
  });

  it('English', () => {
    setLang('en');
    expect(renderToStaticMarkup(<StatusPill status="added_member" />)).toContain('Added now (signed in)');
  });
});
