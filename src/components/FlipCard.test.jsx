// Tests for the two-sided study card. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FlipCard from './FlipCard';

const CARD = {
  front: 'already', back: 'もう、すでに', direction: 'en2jp', level: 3,
  en: 'already', exampleEn: 'She has already eaten lunch.', exampleJa: '彼女はもう昼ご飯を食べました。',
};
const render = (props) => renderToStaticMarkup(<FlipCard card={CARD} showLevel revealed={false} onFlip={() => {}} {...props} />);

// The front is the <button>; the back is the <div> after it.
function faces(html) {
  const split = html.indexOf('</button>') + '</button>'.length;
  return { front: html.slice(0, split), back: html.slice(split) };
}

describe('FlipCard', () => {
  it('shows the direction, the word and the hint on the front', () => {
    const { front } = faces(render());
    expect(front).toContain('English to Japanese');
    expect(front).toContain('>already<');
    expect(front).toContain('タップしてめくる');
    expect(front).not.toContain('もう、すでに');
  });

  it('labels a Japanese-to-English card', () => {
    const html = render({ card: { ...CARD, direction: 'jp2en', front: 'もう、すでに', back: 'already' } });
    expect(faces(html).front).toContain('Japanese to English');
  });

  it('keeps the answer side unreachable until the card is flipped', () => {
    const before = faces(render({ revealed: false }));
    expect(before.back).toMatch(/^<div[^>]*\binert=""/);
    expect(before.front).not.toContain('inert');

    const after = faces(render({ revealed: true }));
    expect(after.back).not.toMatch(/^<div[^>]*\binert=""/);
    expect(after.front).toMatch(/<button[^>]*\binert=""/);
  });

  it('shows the answer, the 答え pill and the example on the back', () => {
    const { back } = faces(render({ revealed: true }));
    expect(back).toContain('答え');
    expect(back).toContain('もう、すでに');
    expect(back).toContain('例文');
    expect(back).toContain('辞書で調べる');
  });

  it('shows the level chip only when asked (SRS review, not the drill)', () => {
    expect(render({ showLevel: true })).toContain('Lv 3');
    expect(render({ showLevel: false })).not.toContain('Lv ');
  });
});
