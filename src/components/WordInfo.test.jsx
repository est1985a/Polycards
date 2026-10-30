// Tests for what the info area shows after a card is flipped. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WordInfo from './WordInfo';

const EN = 'She has already eaten lunch.';
const JA = '彼女はもう昼ご飯を食べました。';

describe('WordInfo', () => {
  it('shows the English example, then the Japanese, and no dictionary link', () => {
    const html = renderToStaticMarkup(<WordInfo english="already" exampleEn={EN} exampleJa={JA} />);
    const text = html.replace(/<[^>]*>/g, ''); // words only, without the highlight tags
    const en = text.indexOf(EN);
    const ja = text.indexOf(JA);
    expect(en).toBeGreaterThan(-1);
    expect(ja).toBeGreaterThan(en);
    expect(html).not.toContain('辞書で調べる');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('eow.alc.co.jp');
  });

  it('highlights the word in the English example', () => {
    const html = renderToStaticMarkup(<WordInfo english="already" exampleEn={EN} exampleJa={JA} />);
    expect(html).toMatch(/<strong[^>]*>already<\/strong>/);
    expect(html).toContain('例文');
  });

  it('shows nothing when there is no English example', () => {
    for (const props of [{}, { exampleEn: null, exampleJa: null }, { exampleEn: '', exampleJa: '' }]) {
      expect(renderToStaticMarkup(<WordInfo english="herb" {...props} />)).toBe('');
    }
  });

  it('does not show a Japanese sentence without an English one', () => {
    expect(renderToStaticMarkup(<WordInfo english="herb" exampleJa={JA} />)).toBe('');
  });
});
