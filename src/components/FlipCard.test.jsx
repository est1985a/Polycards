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

  it('uses bigger text on wide screens', () => {
    const wide = faces(render({ revealed: true, wide: true })).back;
    expect(wide).toMatch(/font-size:48px[^>]*>もう、すでに</);
    expect(wide).toMatch(/font-size:24px[^>]*>.*She has/);
    const phone = faces(render({ revealed: true })).back;
    expect(phone).toMatch(/font-size:27px[^>]*>もう、すでに</);
    expect(phone).toMatch(/font-size:16px[^>]*>.*She has/);
  });

  it('shows the level chip only when asked (SRS review, not the drill)', () => {
    expect(render({ showLevel: true })).toContain('Lv 3');
    expect(render({ showLevel: false })).not.toContain('Lv ');
  });

  it('compact (typing mode): a short card that cannot be tapped and hides the answer', () => {
    const html = render({ compact: true, card: { ...CARD, direction: 'jp2en', front: 'もう、すでに', back: 'already' } });
    expect(html).not.toContain('<button');
    expect(html).not.toContain('タップしてめくる');
    expect(html).not.toContain('>already<');
    expect(html).toContain('min-height:150px');
  });

  describe('発音を聞く (speaker button)', () => {
    const SPEECH = { autoPlay: false, slow: false };
    const JP2EN = { ...CARD, direction: 'jp2en', front: 'もう、すでに', back: 'already' };
    const LISTEN = 'aria-label="発音を聞く"';
    // The front speaker is its own item after the back face (marked data-front-speaker).
    const parts = (html) => {
      const { front, back } = faces(html);
      const at = back.indexOf('data-front-speaker');
      return { front, back: at < 0 ? back : back.slice(0, at), frontSpeaker: at < 0 ? '' : back.slice(at) };
    };

    it('English → Japanese: on the front (turning away with it) and on the back', () => {
      const { front, back, frontSpeaker } = parts(render({ speech: SPEECH }));
      expect(front).not.toContain(LISTEN); // never inside the front button
      expect(frontSpeaker).toContain(LISTEN);
      expect(frontSpeaker).not.toMatch(/^data-front-speaker=""[^>]*inert/);
      expect(back).toContain(LISTEN);
      expect(parts(render({ speech: SPEECH, revealed: true })).frontSpeaker).toMatch(/^data-front-speaker="" inert=""/);
    });

    it('Japanese → English: never on the front, only on the back', () => {
      const { front, back, frontSpeaker } = parts(render({ speech: SPEECH, card: JP2EN }));
      expect(front).not.toContain(LISTEN);
      expect(frontSpeaker).toBe('');
      expect(back).toContain(LISTEN);
      expect(back).toMatch(/inert=""/); // the back can't be used until it flips
    });

    it('none in typing mode before answering (compact) and none without speech', () => {
      expect(render({ speech: SPEECH, card: JP2EN, compact: true })).not.toContain(LISTEN);
      expect(render()).not.toContain(LISTEN);
      expect(render({ card: JP2EN, revealed: true })).not.toContain(LISTEN);
    });

    it('is 52 px on wide screens, 44 px otherwise', () => {
      expect(render({ speech: SPEECH })).toMatch(/aria-label="発音を聞く"[^>]*width:44px;height:44px/);
      expect(render({ speech: SPEECH, wide: true })).toMatch(/aria-label="発音を聞く"[^>]*width:52px;height:52px/);
    });
  });
});
