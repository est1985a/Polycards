// Tests for the card report pop-up's form (no state, so it renders as plain markup). Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportForm, ReportToast } from './ReportHost';

const TARGET = { wordId: 'w1', english: 'color', direction: 'jp2en', deckId: null, source: 'review', answerMode: 'typing', answer: 'colour' };
const noop = () => {};
const render = (props) => renderToStaticMarkup(
  <ReportForm
    target={TARGET} reason={null} note="" answer="colour" attach={false} shot={null} photoFailed={false} sending={false} error={null}
    onReason={noop} onNote={noop} onAnswer={noop} onAttach={noop} onChoosePhoto={noop} onSend={noop} {...props}
  />,
);

describe('ReportForm', () => {
  it('shows the word and all 9 reasons, none chosen', () => {
    const html = render();
    expect(html).toContain('>color<');
    expect(html.match(/role="radio"/g)).toHaveLength(9);
    expect(html).not.toContain('aria-checked="true"');
    expect(html).toContain('スペルがまちがっている');
    expect(html).toContain('その他');
  });

  it('keeps 送る disabled until a reason is chosen', () => {
    expect(render()).toMatch(/<button type="button" disabled=""[^>]*>送る</);
    expect(render({ reason: 'spelling' })).not.toMatch(/disabled=""[^>]*>送る</);
  });

  it('is disabled and says 送信中… while sending', () => {
    expect(render({ reason: 'spelling', sending: true })).toMatch(/disabled=""[^>]*>送信中…</);
  });

  it('asks for the answer only for accept_answer / handwriting, pre-filled', () => {
    expect(render({ reason: 'spelling' })).not.toContain('あなたの答え');
    const html = render({ reason: 'accept_answer' });
    expect(html).toContain('あなたの答え');
    expect(html).toContain('value="colour"');
  });

  it('says どんな答え？ when nothing was typed (tap mode)', () => {
    const html = render({ reason: 'accept_answer', target: { ...TARGET, answerMode: 'tap', answer: '' }, answer: '' });
    expect(html).toContain('どんな答え？');
  });

  it('shows the thumbnail and the checkbox only when there is a screenshot', () => {
    expect(render()).not.toContain('スクリーンショットを付ける');
    const html = render({ shot: 'blob:x', attach: true });
    expect(html).toContain('src="blob:x"');
    expect(html).toMatch(/role="checkbox" aria-checked="true" aria-label="スクリーンショットを付ける"/);
  });

  it('always offers 写真をえらぶ, and says when a photo could not be used', () => {
    expect(render()).toContain('写真をえらぶ');
    expect(render({ photoFailed: true })).toContain('この写真は使えませんでした');
  });

  it('shows an error as an alert', () => {
    expect(render({ error: '今日はもう報告できません' })).toMatch(/role="alert"[^>]*>今日はもう報告できません/);
  });

  it('counts the note up to 500', () => {
    expect(render({ note: 'abc' })).toContain('3/500');
  });
});

describe('ReportToast', () => {
  it('is read aloud and kept out of screenshots', () => {
    const html = renderToStaticMarkup(<ReportToast text="ありがとう！報告しました" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('data-report-ui');
    expect(html).toContain('ありがとう！報告しました');
  });
});
