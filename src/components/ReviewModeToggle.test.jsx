// Tests for the 答え方 toggle in the review's top row. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReviewModeToggle from './ReviewModeToggle';
import { setLang } from '../i18n';

const render = (props) => renderToStaticMarkup(<ReviewModeToggle mode="off" onChange={() => {}} {...props} />);

describe('ReviewModeToggle', () => {
  afterEach(() => setLang('ja'));

  it('タップ / タイピング / 手書き with icons, the chosen one pressed', () => {
    const html = render({ mode: 'typing', handwritingEnabled: true });
    expect(html).toContain('aria-label="答え方"');
    for (const label of ['タップ', 'タイピング', '手書き']) expect(html).toContain(`aria-label="${label}"`);
    expect(html.match(/<svg/g)).toHaveLength(3);
    expect(html).toMatch(/aria-pressed="true" aria-label="タイピング"/);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it('labels can be hidden on narrow screens; the buttons keep their names', () => {
    const html = render();
    expect(html).toContain('class="mode-toggle-label"');
  });

  it('no 手書き when handwriting is off (a saved 手書き shows タップ chosen)', () => {
    const html = render({ mode: 'handwriting', handwritingEnabled: false });
    expect(html).not.toContain('手書き');
    expect(html).toMatch(/aria-pressed="true" aria-label="タップ"/);
  });

  it('English: Tap / Typing / Handwriting', () => {
    setLang('en');
    const html = render({ handwritingEnabled: true });
    for (const label of ['Tap', 'Typing', 'Handwriting']) expect(html).toContain(`aria-label="${label}"`);
  });

  it('every button is at least 44 px tall', () => {
    expect(render().match(/min-height:44px/g)).toHaveLength(2);
  });
});
