// Tests for what the info area shows after a card is flipped. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WordInfo from './WordInfo';

const EN = 'She has already eaten lunch.';
const JA = '彼女はもう昼ご飯を食べました。';

describe('WordInfo', () => {
  it('shows the English example, then the Japanese, then the dictionary link', () => {
    const html = renderToStaticMarkup(<WordInfo english="already" exampleEn={EN} exampleJa={JA} />);
    const text = html.replace(/<[^>]*>/g, ''); // words only, without the highlight tags
    const en = text.indexOf(EN);
    const ja = text.indexOf(JA);
    const link = text.indexOf('辞書で調べる');
    expect(en).toBeGreaterThan(-1);
    expect(ja).toBeGreaterThan(en);
    expect(link).toBeGreaterThan(ja);
    expect(html).toContain('href="https://eow.alc.co.jp/search?q=already"');
  });

  it('highlights the word in the English example', () => {
    const html = renderToStaticMarkup(<WordInfo english="already" exampleEn={EN} exampleJa={JA} />);
    expect(html).toMatch(/<strong[^>]*>already<\/strong>/);
    expect(html).toContain('例文');
  });

  it('shows only the dictionary link when there is no example', () => {
    for (const props of [{}, { exampleEn: null, exampleJa: null }, { exampleEn: '', exampleJa: '' }]) {
      const html = renderToStaticMarkup(<WordInfo english="herb" {...props} />);
      expect(html).toContain('辞書で調べる');
      expect(html.match(/<div/g)).toHaveLength(1); // just the wrapper, no sentence lines
    }
  });

  it('does not show a Japanese sentence without an English one', () => {
    const html = renderToStaticMarkup(<WordInfo english="herb" exampleJa={JA} />);
    expect(html).not.toContain(JA);
    expect(html).toContain('辞書で調べる');
  });
});
