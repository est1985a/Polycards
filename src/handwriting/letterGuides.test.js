// Tests for the letter-practice guides: every letter is there, its strokes are drawable and sit on
// the right lines, and every stroke description exists in both languages. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  FOUR_LINES, LETTER_GUIDES, STROKE_KINDS, guideBounds, letterCategory, letterMapper, lineMetrics, phraseParts, strokePath,
} from './letterGuides.js';
import { hasDot, heightProblem, needsDot } from './practiceCheck.js';
import ja from '../i18n/ja.js';
import en from '../i18n/en.js';

const ALL = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'];

describe('LETTER_GUIDES', () => {
  it('has all 26 capitals and 26 small letters, nothing else', () => {
    expect(Object.keys(LETTER_GUIDES).sort()).toEqual([...ALL].sort());
  });

  it('every stroke has a kind, a start and a drawable path', () => {
    for (const letter of ALL) {
      const { strokes, width } = LETTER_GUIDES[letter];
      expect(strokes.length, letter).toBeGreaterThan(0);
      expect(width, letter).toBeGreaterThanOrEqual(0);
      for (const st of strokes) {
        expect(st.kind, letter).toBeTruthy();
        expect(st.start, letter).toHaveLength(2);
        if (st.dot) expect(strokePath(st)).toBeNull();
        else expect(strokePath(st), letter).toMatch(/^M [-\d.]+ [-\d.]+( [LC]( [-\d.]+ [-\d.]+)+)+$/);
      }
    }
  });

  it('every letter passes its own height check (the guide sits on the right lines)', () => {
    for (const letter of ALL) {
      const { top, bottom } = guideBounds(letter);
      expect(heightProblem(letter, top, bottom), letter).toBeNull();
    }
  });

  it('stays inside the four lines (a little room for the Q tail)', () => {
    for (const letter of ALL) {
      const { top, bottom } = guideBounds(letter);
      expect(top, letter).toBeGreaterThanOrEqual(-0.01);
      expect(bottom, letter).toBeLessThanOrEqual(3.01);
      const xs = LETTER_GUIDES[letter].strokes.flatMap((st) => st.points.map((p) => p[0]));
      expect(Math.min(...xs), letter).toBeGreaterThanOrEqual(-0.05);
      expect(Math.max(...xs), letter).toBeLessThanOrEqual(LETTER_GUIDES[letter].width + 0.05);
    }
  });

  it('small i and j have their dot as a separate stroke, which counts as a dot', () => {
    for (const letter of ['i', 'j']) {
      const { strokes } = LETTER_GUIDES[letter];
      expect(strokes.some((st) => st.kind === 'dot'), letter).toBe(true);
      expect(needsDot(letter)).toBe(true);
      expect(hasDot(strokes.map((st) => st.points)), letter).toBe(true);
    }
    expect(needsDot('I')).toBe(false);
    expect(needsDot('l')).toBe(false);
  });

  it('textbook print style: single-story a and g (one stroke), q with a straight tail', () => {
    expect(LETTER_GUIDES.a.strokes).toHaveLength(1);
    expect(LETTER_GUIDES.g.strokes).toHaveLength(1);
    expect(strokePath(LETTER_GUIDES.q.strokes[0])).toMatch(/L 0\.9 3$/);
  });

  it('every stroke kind has its description in Japanese and English', () => {
    for (const kind of STROKE_KINDS) {
      expect(ja[`practice.stroke.${kind}`], kind).toBeTruthy();
      expect(en[`practice.stroke.${kind}`], kind).toBeTruthy();
    }
  });
});

describe('phraseParts', () => {
  it('splits a stroke description only after 、 or ", " (each part stays on one line)', () => {
    expect(phraseParts('下へおりて、もどって右に丸く')).toEqual(['下へおりて、', 'もどって右に丸く']);
    expect(phraseParts('上から下へまっすぐ')).toEqual(['上から下へまっすぐ']);
    expect(phraseParts('Down, back up, then one hump')).toEqual(['Down, ', 'back up, ', 'then one hump']);
  });

  it('no part of any Japanese stroke description is longer than the column (16 characters)', () => {
    for (const kind of STROKE_KINDS) {
      for (const part of phraseParts(ja[`practice.stroke.${kind}`])) expect(part.length, kind).toBeLessThanOrEqual(16);
    }
  });
});

describe('letterCategory', () => {
  it('sorts letters by the lines they use', () => {
    expect(letterCategory('B')).toBe('capital');
    expect(['b', 'd', 'f', 'h', 'k', 'l'].map(letterCategory)).toEqual(Array(6).fill('ascender'));
    expect(['g', 'p', 'q', 'y'].map(letterCategory)).toEqual(Array(4).fill('descender'));
    expect([...'acemnorsuvwxz'].map(letterCategory)).toEqual(Array(13).fill('xheight'));
    expect(letterCategory('t')).toBe('t');
    expect(letterCategory('i')).toBe('i');
    expect(letterCategory('j')).toBe('j');
  });
});

describe('four lines', () => {
  it('are evenly spaced, and line units map onto the box', () => {
    const { lines, gap, top } = lineMetrics(130);
    expect(lines[0]).toBeCloseTo(FOUR_LINES[0] * 130);
    expect(lines[3] - lines[2]).toBeCloseTo(gap);
    expect(lines[2] - lines[1]).toBeCloseTo(gap);
    const map = letterMapper('I', 90, 130);
    expect(map([0, 0])).toEqual([45, top]);
    expect(map([0, 2])[1]).toBeCloseTo(lines[2]);
  });
});
