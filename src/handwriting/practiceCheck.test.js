// Tests for checking a letter-practice box: shape (model), height (four lines), the i / j dot and
// the look-alike pairs. Line units: 0 = line 1, 1 = line 2, 2 = red baseline, 3 = line 4.
// Run with: npm test
import { describe, it, expect } from 'vitest';
import { hasDot, heightProblem, inkBounds, practiceResult, strokesToUnits } from './practiceCheck.js';
import { LABELS } from './config.js';

// The model's 26 probabilities with `top` read at p, the target at targetP (if different).
function probs(top, p = 0.9, target = null, targetP = 0) {
  const out = Array(26).fill(0);
  out[LABELS.indexOf(top)] = p;
  if (target) out[LABELS.indexOf(target)] = targetP;
  return out;
}
// A vertical stroke from y0 to y1, at x.
const line = (y0, y1, x = 0.5) => [[x, y0], [x, (y0 + y1) / 2], [x, y1]];
const dotAt = (y, x = 0.5) => [[x, y], [x + 0.05, y + 0.05]];

describe('heightProblem', () => {
  it('capitals: line 1 to the baseline', () => {
    expect(heightProblem('B', 0, 2)).toBeNull();
    expect(heightProblem('B', 0.3, 2.2)).toBeNull(); // within the tolerance (0.4)
    expect(heightProblem('B', 1, 2)).toBe('capital'); // too short
    expect(heightProblem('B', -0.6, 2)).toBe('capital'); // too tall
    expect(heightProblem('B', 0, 1.5)).toBe('baseline'); // floating above the red line
  });

  it('x-height letters: line 2 to the baseline', () => {
    expect(heightProblem('a', 1, 2)).toBeNull();
    expect(heightProblem('a', 0, 2)).toBe('small'); // written as tall as a capital
    expect(heightProblem('o', 1.5, 2)).toBe('small'); // much too small
    expect(heightProblem('a', 1, 2.5)).toBe('baseline');
  });

  it('ascenders and t', () => {
    expect(heightProblem('b', 0, 2)).toBeNull();
    expect(heightProblem('b', 1, 2)).toBe('ascender');
    expect(heightProblem('l', 0.2, 1.9)).toBeNull();
    expect(heightProblem('t', 0.45, 2)).toBeNull();
    expect(heightProblem('t', 0, 2)).toBeNull();
    expect(heightProblem('t', 1, 2)).toBe('ascender'); // not above line 2
  });

  it('descenders: tail to line 4', () => {
    expect(heightProblem('g', 1, 3)).toBeNull();
    expect(heightProblem('p', 1, 2)).toBe('tail');
    expect(heightProblem('y', 0, 3)).toBe('small'); // body too tall
  });

  it('i and j: the top (dot) between line 1 and line 2', () => {
    expect(heightProblem('i', 0.5, 2)).toBeNull();
    expect(heightProblem('i', 1, 2)).toBe('dot');
    expect(heightProblem('j', 0.5, 3)).toBeNull();
    expect(heightProblem('j', 0.5, 2)).toBe('tail');
  });

  it('checks the bottom first, so there is one hint at a time', () => {
    expect(heightProblem('B', 1, 1.4)).toBe('baseline');
  });
});

describe('hasDot', () => {
  it('needs a short separate stroke above line 2', () => {
    expect(hasDot([line(1, 2), dotAt(0.5)])).toBe(true);
    expect(hasDot([line(1, 2)])).toBe(false);
    expect(hasDot([line(1, 2), dotAt(1.5)])).toBe(false); // the "dot" is down in the letter
    expect(hasDot([line(1, 2), line(0, 0.9)])).toBe(false); // too long to be a dot
  });
});

describe('practiceResult', () => {
  it('passes a right shape at the right height', () => {
    const r = practiceResult({ target: 'b', probs: probs('b'), strokes: [line(0, 2)] });
    expect(r).toMatchObject({ pass: true, hint: null, read: 'b' });
  });

  it('passes when the target got at least the minimum probability', () => {
    const r = practiceResult({ target: 'n', probs: probs('h', 0.6, 'n', 0.3), strokes: [line(1, 2)] });
    expect(r.pass).toBe(true);
  });

  it('a wrong shape gets the shape hint, even at the right height', () => {
    const r = practiceResult({ target: 'b', probs: probs('k', 0.9, 'b', 0.05), strokes: [line(0, 2)] });
    expect(r).toMatchObject({ pass: false, hint: { key: 'shape', letter: 'b' } });
  });

  it('a right shape at the wrong height gets the height hint', () => {
    const r = practiceResult({ target: 'b', probs: probs('b'), strokes: [line(1, 2)] });
    expect(r.hint).toEqual({ key: 'ascender', letter: 'b' });
  });

  it('capital vs small letter is decided by the height (the model ignores case)', () => {
    expect(practiceResult({ target: 'O', probs: probs('o'), strokes: [line(0, 2)] }).pass).toBe(true);
    expect(practiceResult({ target: 'O', probs: probs('o'), strokes: [line(1, 2)] }).hint.key).toBe('capital');
    expect(practiceResult({ target: 'o', probs: probs('o'), strokes: [line(0, 2)] }).hint.key).toBe('small');
  });

  it('nothing written = shape', () => {
    expect(practiceResult({ target: 'a', probs: null, strokes: [] }).hint.key).toBe('shape');
  });

  describe('look-alike pairs (i ↔ l, g ↔ q)', () => {
    it('i read as l passes with the right height and a dot', () => {
      const r = practiceResult({ target: 'i', probs: probs('l'), strokes: [line(1, 2), dotAt(0.5)] });
      expect(r.pass).toBe(true);
    });

    it('i read as l fails without its dot', () => {
      const r = practiceResult({ target: 'i', probs: probs('l'), strokes: [line(1, 2)] });
      expect(r).toMatchObject({ pass: false, hint: { key: 'dot' } });
    });

    it('i read as l fails when it is as tall as an l (that is an l)', () => {
      const r = practiceResult({ target: 'i', probs: probs('l'), strokes: [line(0, 2), dotAt(-0.6)] });
      expect(r.pass).toBe(false);
    });

    it('l read as i passes with the right height, and fails when too short', () => {
      expect(practiceResult({ target: 'l', probs: probs('i'), strokes: [line(0, 2)] }).pass).toBe(true);
      expect(practiceResult({ target: 'l', probs: probs('i'), strokes: [line(1, 2)] }).hint.key).toBe('ascender');
    });

    it('capital I read as l passes when it has its bars', () => {
      expect(practiceResult({ target: 'I', probs: probs('l'), strokes: [line(0, 2), [[0, 0], [0.8, 0]], [[0, 2], [0.8, 2]]] }).pass).toBe(true);
    });

    it('g ↔ q pass or fail by the height', () => {
      expect(practiceResult({ target: 'g', probs: probs('q'), strokes: [line(1, 3)] }).pass).toBe(true);
      expect(practiceResult({ target: 'g', probs: probs('q'), strokes: [line(1, 2)] }).hint.key).toBe('tail');
      expect(practiceResult({ target: 'q', probs: probs('g'), strokes: [line(1, 3)] }).pass).toBe(true);
      expect(practiceResult({ target: 'q', probs: probs('g'), strokes: [line(0, 3)] }).hint.key).toBe('small');
    });

    it('other wrong reads are not look-alikes', () => {
      expect(practiceResult({ target: 'i', probs: probs('j'), strokes: [line(1, 2), dotAt(0.5)] }).hint.key).toBe('shape');
    });

    it('with the height check off, a look-alike read does not pass', () => {
      const r = practiceResult({ target: 'i', probs: probs('l'), strokes: [line(1, 2), dotAt(0.5)] }, { heightCheck: false });
      expect(r.pass).toBe(false);
    });
  });

  describe('capital I needs its top and bottom bars', () => {
    const stem = line(0, 2, 0.4);
    const topBar = [[0, 0], [0.8, 0]];
    const bottomBar = [[0, 2], [0.8, 2]];

    it('the line and both bars, from line 1 to the baseline, passes (read as i)', () => {
      expect(practiceResult({ target: 'I', probs: probs('i'), strokes: [stem, topBar, bottomBar] }).pass).toBe(true);
    });

    it('a single line fails with the bars hint, even though it is read as l', () => {
      const r = practiceResult({ target: 'I', probs: probs('l'), strokes: [stem] });
      expect(r).toMatchObject({ pass: false, hint: { key: 'capitalI' } });
    });

    it('only one bar (2 strokes) is not enough', () => {
      expect(practiceResult({ target: 'I', probs: probs('i'), strokes: [stem, topBar] }).hint.key).toBe('capitalI');
    });

    it('with the bars but too short fails on the height', () => {
      const short = [line(1, 2, 0.4), [[0, 1], [0.8, 1]], [[0, 2], [0.8, 2]]];
      expect(practiceResult({ target: 'I', probs: probs('i'), strokes: short }).hint.key).toBe('capital');
    });

    it('small l and small i don\'t need bars', () => {
      expect(practiceResult({ target: 'l', probs: probs('l'), strokes: [line(0, 2)] }).pass).toBe(true);
    });
  });

  it('j without its dot fails, with it passes', () => {
    expect(practiceResult({ target: 'j', probs: probs('j'), strokes: [line(1, 3)] }).hint.key).toBe('dot');
    expect(practiceResult({ target: 'j', probs: probs('j'), strokes: [line(1, 3), dotAt(0.5)] }).pass).toBe(true);
  });

  it('with the height check off, only the shape counts', () => {
    expect(practiceResult({ target: 'b', probs: probs('b'), strokes: [line(1, 2)] }, { heightCheck: false }).pass).toBe(true);
  });
});

describe('strokesToUnits / inkBounds', () => {
  it('turns box pixels into line units', () => {
    const units = strokesToUnits([[{ x: 30, y: 20 }, { x: 30, y: 80 }]], { top: 20, gap: 30 });
    expect(units).toEqual([[[1, 0], [1, 2]]]);
    expect(inkBounds(units)).toEqual({ top: 0, bottom: 2 });
    expect(inkBounds([])).toBeNull();
  });
});
