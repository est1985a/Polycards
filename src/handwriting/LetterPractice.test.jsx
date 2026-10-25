// Tests for what letter practice shows before anything is written (the pen and the model can't run
// here). The checking rules are in practiceCheck.test.js. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LetterPractice from './LetterPractice.jsx';
import { otherCase, practiceBoxWidth } from './letterGuides.js';
import StrokeGuide from './StrokeGuide.jsx';
import { needsPractice } from './checkAnswer.js';
import { HW_COLORS } from './config.js';

const render = (props) => renderToStaticMarkup(<LetterPractice letter="b" onClose={() => {}} {...props} />);

describe('LetterPractice', () => {
  it('shows the title, the B ⇄ b switch, 4 boxes, 消す and とじる', () => {
    const h = render();
    expect(h).toContain('「b」をれんしゅうしよう');
    expect(h).toMatch(/aria-pressed="false"[^>]*>B</);
    expect(h).toMatch(/aria-pressed="true"[^>]*>b</);
    for (const n of [1, 2, 3, 4]) expect(h).toContain(`aria-label="れんしゅう ${n}マス目"`);
    expect(h).toContain('>消す<');
    expect(h).toContain('>とじる<');
    expect(h).toContain('準備中…');
  });

  it('box 1 has the letter to trace, the others only the four lines', () => {
    const h = render();
    // the trace color appears in the guide and in box 1 only
    const boxes = h.split('aria-label="れんしゅう ').slice(1);
    expect(boxes[0]).toContain(`stroke="${HW_COLORS.trace}"`);
    expect(boxes[1].split('aria-label=')[0]).not.toContain(`stroke="${HW_COLORS.trace}"`);
    expect(h).toContain(`stroke="${HW_COLORS.guideBaseline}"`); // the red baseline
    expect(h).toContain('stroke-dasharray="5 4"'); // dashed line 2
  });

  it('shows the stroke-order guide with one line per stroke and もう一度見る', () => {
    const h = render();
    expect(h).toContain('「b」の書き順');
    expect(h).toContain('下へおりて、もどって右に丸く');
    expect(h).toContain('もう一度見る');
  });

  it('× only in the pop-up (closeRef given)', () => {
    expect(render()).not.toContain('閉じる (Close)');
    expect(render({ closeRef: { current: null } })).toMatch(/aria-label="[^"]+"[^>]*>×</);
  });

  it('a capital letter starts on B', () => {
    const h = render({ letter: 'B' });
    expect(h).toContain('「B」をれんしゅうしよう');
    expect(h).toMatch(/aria-pressed="true"[^>]*>B</);
  });
});

describe('StrokeGuide', () => {
  it('numbers every stroke (E has 4)', () => {
    const h = renderToStaticMarkup(<StrokeGuide letter="E" />);
    for (const n of [1, 2, 3, 4]) expect(h).toContain(`>${n}</text>`);
    expect(h).not.toContain('>5</text>');
  });

  it('i: the dot is its own numbered stroke', () => {
    const h = renderToStaticMarkup(<StrokeGuide letter="i" />);
    expect(h).toContain('点を打つ');
    expect(h).toContain('>2</text>');
  });
});

describe('helpers', () => {
  it('otherCase switches B ⇄ b', () => {
    expect(otherCase('B')).toBe('b');
    expect(otherCase('b')).toBe('B');
  });

  it('practiceBoxWidth fits 4 boxes, between 56 and 92 px', () => {
    expect(practiceBoxWidth(0)).toBe(84);
    expect(practiceBoxWidth(1000)).toBe(92);
    expect(practiceBoxWidth(200)).toBe(56);
    expect(practiceBoxWidth(360)).toBe(76);
  });

  it('the れんしゅう？ chip: red and orange boxes only', () => {
    expect(needsPractice('wrong')).toBe(true);
    expect(needsPractice('lenient')).toBe(true);
    expect(needsPractice('correct')).toBe(false);
    expect(needsPractice(null)).toBe(false);
    expect(needsPractice(undefined)).toBe(false);
  });
});
