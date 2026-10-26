// Tests for the 品詞 chip and its pop-up. Run with: npm test
// (No DOM here, so taps, Escape and focus are checked in the browser; see the e2e check.)
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PosChip from './PosChip';
import { PosSheetBox } from './PosSheet';
import { POS_KEYS } from '../lib/partsOfSpeech';
import { shouldCloseSheet } from '../lib/sheet';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const chip = (props) => renderToStaticMarkup(<PosChip pos="noun" {...props} />);
const sheet = (highlight = 'verb') => renderToStaticMarkup(<PosSheetBox highlight={highlight} onClose={() => {}} />);

describe('PosChip', () => {
  it('shows nothing when the word has no part of speech', () => {
    expect(renderToStaticMarkup(<PosChip pos={null} />)).toBe('');
    expect(renderToStaticMarkup(<PosChip pos={null} placeholder />)).toBe('');
  });

  it('is a button with the label, read aloud as a part of speech, at least 44 px to tap', () => {
    const html = chip();
    expect(html).toMatch(/^<button type="button" aria-label="品詞：名詞（説明を見る）" aria-haspopup="dialog"/);
    expect(html).toContain('>名詞</span>');
    expect(html).toContain('min-width:44px;min-height:44px');
    expect(html).toContain('margin:-11px -4px'); // the rows around it don't grow
  });

  it('uses theme colors only (muted text)', () => {
    expect(chip()).toContain('color:var(--muted)');
    expect(chip()).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
  });

  it('placeholder: same size, invisible, not a button, hidden from screen readers', () => {
    const html = chip({ placeholder: true });
    expect(html).not.toContain('<button');
    expect(html).toMatch(/^<span aria-hidden="true"[^>]*min-width:44px;min-height:44px[^>]*visibility:hidden/);
  });

  it('English labels', () => {
    setLang('en');
    expect(chip({ pos: 'auxiliary' })).toContain('>auxiliary verb</span>');
    expect(chip({ pos: 'auxiliary' })).toContain('aria-label="Part of speech: auxiliary verb. Tap to learn more"');
  });
});

describe('PosSheet', () => {
  it('is a dialog with the title, the subtitle and a × button, in the shared pop-up classes', () => {
    const html = sheet();
    expect(html).toContain('class="review-plan-sheet about-sheet"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('品詞とは？');
    expect(html).toContain('ことばのグループ分け');
    expect(html).toContain('aria-label="閉じる (Close)"');
    expect(html).toMatch(/position:sticky;top:0/);
  });

  it('lists all 12 parts of speech in order, each with both names, the explanation and examples', () => {
    const html = sheet();
    const names = ['名詞', '動詞', '形容詞', '副詞', '前置詞', '代名詞', '接続詞', '助動詞', '冠詞', '間投詞', '数詞', '表現'];
    let at = 0;
    names.forEach((name) => {
      const i = html.indexOf(`>${name}</span>`, at);
      expect(i).toBeGreaterThan(at);
      at = i;
    });
    expect(html).toContain('>adjective</span>');
    expect(html).toContain('人・もの・ことの名前を表すことば。');
    expect(html).toContain('>slowly</li>');
    expect(html).toContain('>a lot of</li>');
    expect(html.match(/<ul lang="en"/g)).toHaveLength(POS_KEYS.length);
  });

  it('highlights only the tapped part of speech', () => {
    const html = sheet('adverb');
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="true"[^>]*border:2px solid var\(--accent\)[^]*?>副詞</);
    expect(sheet('noun')).toMatch(/aria-current="true"[^>]*>(?:(?!<li).)*>名詞</s);
  });

  it('closes on Escape or a tap on the backdrop, not on a tap inside the box', () => {
    expect(shouldCloseSheet({ type: 'keydown', key: 'Escape' })).toBe(true);
    expect(shouldCloseSheet({ type: 'keydown', key: 'Enter' })).toBe(false);
    const backdrop = {};
    expect(shouldCloseSheet({ type: 'click', target: backdrop, currentTarget: backdrop })).toBe(true);
    expect(shouldCloseSheet({ type: 'click', target: {}, currentTarget: backdrop })).toBe(false);
  });

  it('English: name first, Japanese name after it', () => {
    setLang('en');
    const html = sheet('noun');
    expect(html).toContain('Parts of Speech');
    expect(html.indexOf('>noun</span>')).toBeLessThan(html.indexOf('>名詞</span>'));
    expect(html).toContain('A word for a person, place, or thing.');
  });
});
