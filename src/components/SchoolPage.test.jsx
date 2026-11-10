// Tests for the 学校 page in the 先生 tab (static render; taps can't run here). Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SchoolPage, { RequestRow, SchoolTeacherRow, TeacherAreaSwitch } from './SchoolPage';

const noop = async () => {};
const school = { id: 's1', name: '龍谷中学校・高等学校', prefecture: 'saga', school_type: 'jhs_hs', auto_approve_domain: false };
const teachers = [
  { user_id: 't1', display_name: 'アンドレ先生', role: 'admin', is_me: true, class_count: 3 },
  { user_id: 't2', display_name: '山田先生', role: 'teacher', is_me: false, class_count: 1 },
];
const requests = [{ user_id: 'r1', display_name: '佐藤先生', account_name: 'Sato Hanako', email: 'sato@ryukokurg.ed.jp', requested_at: '2026-11-09T01:00:00Z' }];
const page = (data) => renderToStaticMarkup(
  <SchoolPage data={data} onDecide={noop} onSetAdmin={noop} onRemove={noop} onAutoApprove={noop} />,
);

describe('SchoolPage', () => {
  it('an admin sees the school, its domain, the auto-approve switch (off) with its note, requests and teachers', () => {
    const h = page({ school, domains: ['ryukokurg.ed.jp'], is_admin: true, teachers, requests });
    expect(h).toContain('龍谷中学校・高等学校');
    expect(h).toContain('佐賀県・中高一貫校');
    expect(h).toContain('確認済みドメイン：@ryukokurg.ed.jp');
    expect(h).toMatch(/role="switch" aria-checked="false"[^>]*>.*同じドメインの先生を自動で承認/);
    expect(h).toContain('生徒も同じドメインを使う学校ではオフにしてください。');
    expect(h).toContain('参加リクエスト');
    expect(h).toContain('data-school-request="r1"');
    expect(h).toContain('sato@ryukokurg.ed.jp');
    expect(h).toContain('11月9日にリクエスト');
    expect(h).toContain('先生（2）');
    expect(h).toContain('管理者');
  });

  it('a teacher who is not an admin sees no requests, no switch and no buttons', () => {
    const h = page({ school, domains: ['ryukokurg.ed.jp'], is_admin: false, teachers, requests: [] });
    expect(h).not.toContain('参加リクエスト');
    expect(h).not.toContain('role="switch"');
    expect(h).not.toContain('学校から外す');
    expect(h).not.toContain('管理者にする');
  });

  it('a school with no verified domain says so, and has no auto-approve switch', () => {
    const h = page({ school, domains: [], is_admin: true, teachers, requests: [] });
    expect(h).toContain('確認済みドメイン：なし（名簿の貼り付けは使えません）');
    expect(h).not.toContain('role="switch"');
    expect(h).toContain('承認待ちのリクエストはありません。');
  });

  it('loading', () => {
    expect(page(null)).toContain('読み込み中');
  });
});

describe('rows', () => {
  it('a request: 承認する / 却下する; declining asks first', () => {
    const h = renderToStaticMarkup(<ul><RequestRow request={requests[0]} onDecide={noop} /></ul>);
    expect(h).toContain('>承認する<');
    expect(h).toContain('>却下する<');
    const ask = renderToStaticMarkup(<ul><RequestRow request={requests[0]} onDecide={noop} initialMode="decline" /></ul>);
    expect(ask).toContain('佐藤先生のリクエストを却下しますか？');
  });

  it('a teacher: admins manage others, never themselves; removing asks with the class warning', () => {
    const other = renderToStaticMarkup(<ul><SchoolTeacherRow teacher={teachers[1]} isAdmin onSetAdmin={noop} onRemove={noop} /></ul>);
    expect(other).toContain('>管理者にする<');
    expect(other).toContain('>学校から外す<');
    expect(other).toContain('クラス 1');
    const adminRow = renderToStaticMarkup(<ul><SchoolTeacherRow teacher={{ ...teachers[1], role: 'admin' }} isAdmin onSetAdmin={noop} onRemove={noop} /></ul>);
    expect(adminRow).toContain('>管理者を外す<');
    const me = renderToStaticMarkup(<ul><SchoolTeacherRow teacher={teachers[0]} isAdmin onSetAdmin={noop} onRemove={noop} /></ul>);
    expect(me).toContain('あなた');
    expect(me).not.toContain('学校から外す');
    const ask = renderToStaticMarkup(<ul><SchoolTeacherRow teacher={teachers[1]} isAdmin onSetAdmin={noop} onRemove={noop} initialMode="remove" /></ul>);
    expect(ask).toContain('山田先生を学校から外しますか？担当しているクラスは見られなくなります。');
  });
});

describe('TeacherAreaSwitch', () => {
  it('クラス | 学校, with the number of waiting requests', () => {
    const h = renderToStaticMarkup(<TeacherAreaSwitch value="classes" onChange={() => {}} />);
    expect(h).toMatch(/aria-pressed="true"[^>]*>クラス</);
    expect(h).toContain('>学校<');
    expect(renderToStaticMarkup(<TeacherAreaSwitch value="school" onChange={() => {}} requests={2} />)).toContain('学校（2）');
  });
});
