// Tests for the クラス tab (students): no class, the picker, choosing a nickname, the board, switched off.
// Static render (taps can't run here). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassTabView } from './ClassTab';
import { LeaveClassConfirm } from './LeaveClassSheet';
import Tabs from './Tabs';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const CLASSES = [{ id: 'c1', name: '1年A組' }, { id: 'c2', name: '英語クラブ' }];
const INFO = { id: 'c1', name: '1年A組', school_year: 2026, leaderboard_enabled: true, nickname: 'Aiden', teachers: ['アンドレ先生', 'test1先生'] };
const BOARD = { enabled: true, top: [{ rank: 1, nickname: 'Aiden', reviews: 5, is_me: true, avatar: null }], me: { nickname: 'Aiden', rank: 1, reviews: 5 }, last_week: [] };
const view = (props) => renderToStaticMarkup(<ClassTabView classes={CLASSES} selectedId="c1" info={INFO} board={BOARD} {...props} />);

describe('ClassTabView', () => {
  it('not in a class: a friendly message and クラスに参加', () => {
    const h = view({ classes: [], info: null, board: null });
    expect(h).toContain('まだクラスに入っていません');
    expect(h).toContain('＋ クラスに参加');
    expect(h).toContain('学校のGoogleアカウントでログインしているか確認してください。');
  });

  it('loading and a failed class list', () => {
    expect(view({ classes: null })).toContain('読み込み中');
    expect(view({ classes: 'failed' })).toContain('role="alert"');
  });

  it('several classes: a picker; one class: none', () => {
    expect(view()).toMatch(/aria-label="クラスを選ぶ"[^]*aria-pressed="true"[^>]*>1年A組/);
    expect(view({ classes: [CLASSES[0]] })).not.toContain('クラスを選ぶ');
    const many = [...CLASSES, { id: 'c3', name: 'C' }, { id: 'c4', name: 'D' }];
    expect(view({ classes: many })).toMatch(/<select aria-label="クラスを選ぶ"/);
  });

  it('the header: class name, teachers, my nickname with 変更, and the board', () => {
    const h = view();
    expect(h).toContain('先生：アンドレ先生、test1先生');
    expect(h).toContain('ニックネーム：Aiden');
    expect(h).toContain('aria-label="ニックネームを変更"');
    expect(h).toContain('今週のランキング');
  });

  it('no nickname yet: asks for one first, with no board', () => {
    const h = view({ info: { ...INFO, nickname: null }, board: null });
    expect(h).toContain('ニックネームを決めよう');
    expect(h).toContain('クラスのランキングで、クラスメイトに表示されます');
    expect(h).toContain('決める');
    expect(h).not.toContain('今週のランキング');
    expect(h).not.toContain('ニックネームを変更');
  });

  it('switched off by the teacher: class info only', () => {
    const h = view({ info: { ...INFO, leaderboard_enabled: false }, board: null });
    expect(h).toContain('1年A組');
    expect(h).toContain('今はランキングはお休みです');
    expect(h).not.toContain('今週のランキング');
    expect(view({ board: { enabled: false } })).toContain('今はランキングはお休みです');
  });

  it('works in English', () => {
    setLang('en');
    expect(view()).toContain('Teacher: アンドレ先生, test1先生');
    expect(view({ classes: [] })).toContain('Join a class');
  });
});

describe('leaving a class', () => {
  it('a small クラスをぬける button under the class, not on the no-class panel', () => {
    expect(view()).toContain('クラスをぬける');
    expect(view({ info: { ...INFO, nickname: null }, board: null })).toContain('クラスをぬける');
    expect(view({ classes: [], info: null, board: null })).not.toContain('クラスをぬける');
  });

  it('the confirm pop-up says what stays and what goes', () => {
    const h = renderToStaticMarkup(<LeaveClassConfirm name="1年A組" onLeave={() => {}} onCancel={() => {}} />);
    expect(h).toContain('「1年A組」からぬけますか？');
    for (const text of ['学習の記録', 'マイデッキ', 'ガチャ券', 'ポリアバター', 'ランキングと課題', '参加コード', 'キャンセル', 'ぬける']) {
      expect(h).toContain(text);
    }
    const busy = renderToStaticMarkup(<LeaveClassConfirm name="1年A組" busy error="だめ" onLeave={() => {}} onCancel={() => {}} />);
    expect(busy).toContain('ぬけています…');
    expect(busy).toContain('だめ');
  });

  it('works in English', () => {
    setLang('en');
    expect(view()).toContain('Leave this class');
    expect(renderToStaticMarkup(<LeaveClassConfirm name="1A" onLeave={() => {}} onCancel={() => {}} />)).toContain('Leave “1A”?');
  });
});

describe('the クラス tab button', () => {
  it('has its own icon, and 12 px labels with 5 tabs on a phone', () => {
    const five = ['myCards', 'cardSets', 'training', 'class', 'teacher'].map((id) => ({ id, label: `tabs.${id}` }));
    const h = renderToStaticMarkup(<Tabs tabs={five} active="class" onChange={() => {}} />);
    expect(h).toMatch(/aria-current="page"[^]*<svg[^]*クラス/);
    expect(h).toContain('font-size:12px');
    expect(renderToStaticMarkup(<Tabs tabs={five} active="class" onChange={() => {}} wide />)).toContain('font-size:14px');
    expect(renderToStaticMarkup(<Tabs tabs={five.slice(0, 4)} active="class" onChange={() => {}} />)).toContain('font-size:14px');
  });
});
