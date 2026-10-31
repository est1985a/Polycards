// Tests for the student's pre-filled roster pop-up (static render; taps can't run here). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RosterJoinCard } from './RosterJoinPopup';
import { rosterJoinStart, rosterJoinNext } from '../lib/rosterJoin';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));
const noop = () => {};
const start = rosterJoinStart([{ id: 'c1', name: '1年A組', needs_nickname: true }, { id: 'c2', name: '英語特講', needs_nickname: true }]);

describe('RosterJoinCard', () => {
  it('first says which class the student is in, with 次へ', () => {
    const h = renderToStaticMarkup(<RosterJoinCard state={start} onNext={noop} onSaveNickname={noop} />);
    expect(h).toContain('1年A組に入りました！');
    expect(h).toContain('本名と出席番号は、先生だけに見えます');
    expect(h).toContain('次へ');
    expect(h).not.toContain('ニックネーム（12文字まで）');
  });

  it('then the nickname step: the field and 決める, no キャンセル (it can\'t be skipped)', () => {
    const h = renderToStaticMarkup(<RosterJoinCard state={rosterJoinNext(start)} onNext={noop} onSaveNickname={noop} />);
    expect(h).toContain('ニックネームを決めよう');
    expect(h).toContain('1年A組のランキングでは');
    expect(h).toContain('ニックネーム（12文字まで）');
    expect(h).toContain('決める');
    expect(h).not.toContain('キャンセル');
  });

  it('the second class comes next', () => {
    const h = renderToStaticMarkup(<RosterJoinCard state={rosterJoinNext(rosterJoinNext(start))} onNext={noop} onSaveNickname={noop} />);
    expect(h).toContain('英語特講に入りました！');
  });

  it('nothing when done', () => {
    expect(renderToStaticMarkup(<RosterJoinCard state={null} onNext={noop} onSaveNickname={noop} />)).toBe('');
  });

  it('English', () => {
    setLang('en');
    const h = renderToStaticMarkup(<RosterJoinCard state={start} onNext={noop} onSaveNickname={noop} />);
    expect(h).toContain('You&#x27;re in 1年A組!');
    expect(h).toContain('Next');
  });
});
