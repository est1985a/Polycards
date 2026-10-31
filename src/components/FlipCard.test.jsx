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
    expect(back).toContain('彼女はもう昼ご飯を食べました。');
    expect(back).not.toContain('辞書で調べる');
  });

  it('shows nothing under the answer when the word has no example', () => {
    const { back } = faces(render({ revealed: true, card: { ...CARD, exampleEn: null, exampleJa: null } }));
    expect(back).toContain('もう、すでに');
    expect(back).not.toContain('例文');
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
  describe('品詞 chip (part of speech)', () => {
    const JP2EN = { ...CARD, direction: 'jp2en', front: 'もう、すでに', back: 'already' };
    const CHIP = 'aria-label="品詞：副詞（説明を見る）"';
    // The chip layer is its own item after the front button (marked data-front-pos).
    const layer = (html) => { const at = html.indexOf('data-front-pos'); return at < 0 ? '' : html.slice(at, html.indexOf('</div>', html.indexOf(CHIP))); };

    it('is on the front in both directions, but never inside the front button (a tap can\'t flip)', () => {
      [CARD, JP2EN].forEach((card) => {
        const html = render({ card: { ...card, pos: 'adverb' } });
        const { front } = faces(html);
        expect(front).not.toContain(CHIP);
        expect(front).toContain('aria-hidden="true"'); // the front keeps the chip's space
        expect(layer(html)).toContain(CHIP);
        expect(html.match(new RegExp(CHIP, 'g'))).toHaveLength(1);
      });
    });

    it('the layer copies the top row invisibly, only the chip is visible and tappable', () => {
      const html = render({ card: { ...CARD, pos: 'adverb' } });
      expect(html).toMatch(/data-front-pos=""[^>]*visibility:hidden;pointer-events:none/);
      expect(html).toMatch(/visibility:visible;pointer-events:auto"><button type="button" aria-label="品詞：副詞/);
    });

    it('turns away with the front: inert once the card is flipped', () => {
      expect(render({ card: { ...CARD, pos: 'adverb' } })).not.toMatch(/data-front-pos="" inert/);
      expect(render({ card: { ...CARD, pos: 'adverb' }, revealed: true })).toMatch(/data-front-pos="" inert=""/);
    });

    it('nothing at all when pos is null', () => {
      const html = render();
      expect(html).not.toContain('data-front-pos');
      expect(html).not.toContain('品詞');
      expect(render({ card: { ...CARD, pos: null } })).toBe(render());
    });

    it('sits in the top row right after the direction label, before the word (normal and compact)', () => {
      const normal = render({ card: { ...CARD, pos: 'adverb' } });
      const layerHtml = layer(normal);
      expect(layerHtml).toMatch(/English to Japanese<\/span><span[^>]*visibility:visible[^>]*><button type="button" aria-label="品詞：副詞/);
      expect(layerHtml).not.toContain('>already<'); // the layer only copies the top row
      expect(faces(normal).front).toMatch(/English to Japanese<\/span><span aria-hidden="true"/); // placeholder in the same spot

      const compact = render({ compact: true, card: { ...JP2EN, pos: 'adverb' } });
      expect(compact).not.toContain('data-front-pos');
      expect(compact).toMatch(/Japanese to English<\/span><button type="button" aria-label="品詞：副詞/);
      expect(compact.indexOf(CHIP)).toBeLessThan(compact.indexOf('>もう、すでに<'));
      expect(compact).toContain('min-height:150px');
    });

    it('the word is always centered on its own, with or without a chip', () => {
      const word = (html) => html.match(/<span style="flex:1;display:flex;align-items:center;justify-content:center"><span[^>]*>already<\/span><\/span>/);
      expect(word(render({ card: { ...CARD, pos: 'adverb' } }))).toBeTruthy();
      expect(word(render())).toBeTruthy();
    });

    it('a long label wraps under the direction label instead of running into the Lv chip', () => {
      expect(render({ card: { ...CARD, pos: 'interjection' } })).toMatch(/flex:1;min-width:0;display:flex;flex-wrap:wrap/);
    });
  });
});

describe('FlipCard report flag', () => {
  const FLAG = 'aria-label="このカードの問題を報告"';

  it('is only on the back, so it never shows before the answer', () => {
    const { front, back } = faces(render({ onReport: () => {} }));
    expect(front).not.toContain(FLAG);
    expect(back).toContain(FLAG);
    // the back is inert (can't be reached) until the card is flipped
    expect(back).toMatch(/data-face="back" tabindex="-1" inert=""/);
    expect(faces(render({ onReport: () => {}, revealed: true })).back).not.toMatch(/data-face="back" tabindex="-1" inert=""/);
  });

  it('sits before the Lv chip in the back\'s top row (no extra row)', () => {
    const { back } = faces(render({ onReport: () => {} }));
    expect(back.indexOf(FLAG)).toBeLessThan(back.indexOf('Lv 3'));
    expect(back.indexOf('答え')).toBeLessThan(back.indexOf(FLAG));
  });

  it('is not there without onReport, nor on the compact typing card', () => {
    expect(render()).not.toContain(FLAG);
    expect(render({ onReport: () => {}, compact: true })).not.toContain(FLAG);
  });

  it('marks the faces so a report screenshot can draw the card flat', () => {
    expect(render()).toContain('data-flip-inner="front"');
    expect(render({ revealed: true })).toContain('data-flip-inner="back"');
  });
});
