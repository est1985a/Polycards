// Tests for Polyvo管理 (static render; taps can't run here). Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminSchoolsView, PendingSchoolCard, AdminSchoolRow } from './AdminScreen';

const noop = async () => {};
const waiting = {
  id: 'p1', name: '新しい高校', name_kana: 'あたらしいこうこう', prefecture: 'okinawa', school_type: 'hs', status: 'pending',
  created_at: '2026-11-10T00:00:00Z', domains: [], teacher_count: 0, admin_count: 0, class_count: 0, pending_requests: 1,
  creator: { display_name: 'X先生', account_name: 'Taro X', email: 'x@new.ed.jp' },
};
const ryukoku = {
  id: 's1', name: '龍谷中学校・高等学校', prefecture: 'saga', school_type: 'jhs_hs', status: 'approved', auto_approve_domain: false,
  domains: ['ryukokurg.ed.jp'], teacher_count: 6, admin_count: 1, class_count: 5, pending_requests: 0,
};

describe('AdminSchoolsView', () => {
  it('waiting schools first, then every other school', () => {
    const h = renderToStaticMarkup(<AdminSchoolsView schools={[ryukoku, waiting]} onApprove={noop} onDecline={noop} onSetDomains={noop} onAutoApprove={noop} />);
    expect(h.indexOf('承認待ちの学校')).toBeLessThan(h.indexOf('すべての学校'));
    expect(h.indexOf('data-pending-school="p1"')).toBeLessThan(h.indexOf('data-admin-school="s1"'));
    expect(h).toContain('先生 6・クラス 5・リクエスト 0');
  });

  it('nothing waiting / loading', () => {
    expect(renderToStaticMarkup(<AdminSchoolsView schools={[ryukoku]} />)).toContain('承認待ちの学校はありません。');
    expect(renderToStaticMarkup(<AdminSchoolsView schools={null} />)).toContain('読み込み中');
  });
});

describe('PendingSchoolCard', () => {
  it('shows who registered it, a domain field with its hint, 承認する / 却下する', () => {
    const h = renderToStaticMarkup(<ul><PendingSchoolCard school={waiting} onApprove={noop} onDecline={noop} /></ul>);
    expect(h).toContain('新しい高校');
    expect(h).toContain('あたらしいこうこう');
    expect(h).toContain('沖縄県・高等学校');
    expect(h).toContain('登録：X先生 · Taro X · x@new.ed.jp');
    expect(h).toContain('確認済みドメイン（任意）');
    expect(h).toContain('Gmailや携帯電話会社のドメインは使えません');
    expect(h).toContain('>承認する<');
    expect(h).toContain('>却下する<');
    const ask = renderToStaticMarkup(<ul><PendingSchoolCard school={waiting} onApprove={noop} onDecline={noop} initialMode="decline" /></ul>);
    expect(ask).toContain('「新しい高校」の登録を却下しますか？');
  });
});

describe('AdminSchoolRow', () => {
  it('an approved school: status, domains, the auto-approve switch and ドメインを編集', () => {
    const h = renderToStaticMarkup(<ul><AdminSchoolRow school={ryukoku} onSetDomains={noop} onAutoApprove={noop} /></ul>);
    expect(h).toContain('data-admin-status="approved"');
    expect(h).toContain('確認済みドメイン：@ryukokurg.ed.jp');
    expect(h).toMatch(/role="switch" aria-checked="false"/);
    expect(h).toContain('>ドメインを編集<');
    const editing = renderToStaticMarkup(<ul><AdminSchoolRow school={ryukoku} onSetDomains={noop} onAutoApprove={noop} initialEditing /></ul>);
    expect(editing).toContain('value="ryukokurg.ed.jp"');
    expect(editing).toContain('>保存<');
  });

  it('a school without an admin is flagged; a declined school has no buttons', () => {
    expect(renderToStaticMarkup(<ul><AdminSchoolRow school={{ ...ryukoku, admin_count: 0 }} /></ul>)).toContain('管理者がいません');
    const declined = renderToStaticMarkup(<ul><AdminSchoolRow school={{ ...waiting, status: 'declined' }} /></ul>);
    expect(declined).toContain('data-admin-status="declined"');
    expect(declined).not.toContain('ドメインを編集');
  });
});
