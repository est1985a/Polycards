// Tests for splitting an answer into letter boxes and printed characters. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  answerSlots, boxCount, boxLayout, fitsBoxes, fittingAlternates, printPosition, readText, slotFactor, writtenAnswer,
} from './answerLayout.js';
import { checkSpelling } from '../lib/spelling.js';

const show = (answer) => answerSlots(answer).map((s) => (s.type === 'box' ? s.letter : s.type === 'gap' ? '_' : `[${s.text}]`)).join('');

describe('answerSlots', () => {
  it('gives one box per letter', () => {
    expect(show('fish')).toBe('fish');
    expect(boxCount('fish')).toBe(4);
  });
  it('keeps capitals as they are', () => {
    expect(show('Japan')).toBe('Japan');
  });
  it('turns a space into one gap', () => {
    expect(show('get  up')).toBe('get_up');
  });
  it('prints "..." as one slot', () => {
    expect(show('Call me ...')).toBe('Call_me_[...]');
    expect(show('one of ...')).toBe('one_of_[...]');
    expect(show('one of …')).toBe('one_of_[…]');
  });
  it('prints punctuation, apostrophes, hyphens and digits', () => {
    expect(show('How about you?')).toBe('How_about_you[?]');
    expect(show("don't")).toBe("don[']t");
    expect(show('T-shirt')).toBe('T[-]shirt');
    expect(show('7th')).toBe('[7]th');
  });
  it('splits printed characters that sit at different heights', () => {
    expect(show('“Hi!”')).toBe('[“]Hi[!][”]');
    expect(show('Wait...!')).toBe('Wait[...!]');
  });
  it('ignores spaces at the ends', () => {
    expect(show('  hi ')).toBe('hi');
  });
  it('copes with an empty answer', () => {
    expect(answerSlots('')).toEqual([]);
    expect(answerSlots(null)).toEqual([]);
  });
});

describe('boxLayout', () => {
  const rowText = (layout) => layout.rows.map((r) => r.map((s) => (s.type === 'box' ? s.letter : s.type === 'gap' ? '_' : s.text)).join(''));

  it('numbers the boxes in order', () => {
    expect(answerSlots("it's").filter((s) => s.type === 'box').map((s) => s.index)).toEqual([0, 1, 2]);
  });
  it('a short word fits on one row, capped at the largest size', () => {
    const l = boxLayout(answerSlots('fish'), 900);
    expect(l.rows).toHaveLength(1);
    expect(l.size).toBe(96);
  });
  it('a long word that fits at a usable size stays on one row', () => {
    const l = boxLayout(answerSlots('international'), 900); // 13 boxes
    expect(l.rows).toHaveLength(1);
    expect(l.size).toBeGreaterThanOrEqual(56);
  });
  it('a phrase too long for one row splits at the space nearest the middle', () => {
    const l = boxLayout(answerSlots('take care of yourself'), 700);
    expect(rowText(l)).toEqual(['take_care', 'of_yourself']);
    expect(l.size).toBeGreaterThanOrEqual(56);
  });
  it('one very long word splits between its middle letters', () => {
    const l = boxLayout(answerSlots('responsibility'), 500);
    expect(rowText(l)).toEqual(['respons', 'ibility']);
  });
  it('printed characters stay with their row', () => {
    const l = boxLayout(answerSlots('What do you think about ...'), 700);
    expect(l.rows).toHaveLength(2);
    expect(rowText(l)[1].endsWith('_...')).toBe(true);
  });
});

describe('writtenAnswer', () => {
  it('leaves out the optional words in ( ) or [ ]', () => {
    expect(writtenAnswer('look (at)')).toBe('look');
    expect(writtenAnswer('(be) good at ~')).toBe('good at ~');
    expect(writtenAnswer('take [a] picture')).toBe('take picture');
  });
  it('keeps everything else, including "..." and "?"', () => {
    expect(writtenAnswer('Call me ...')).toBe('Call me ...');
    expect(writtenAnswer('How about you?')).toBe('How about you?');
    expect(writtenAnswer(" don't ")).toBe("don't");
  });
  it('is accepted as an exact spelling by typing mode (so the database gives the bonus)', () => {
    for (const en of ['look (at)', '(be) good at ~', 'Call me ...', 'How about you?', "don't", 'T-shirt', 'fish', 'Japan']) {
      expect(checkSpelling(writtenAnswer(en), en), en).toBe('exact');
    }
  });
});

describe('readText', () => {
  it('puts the read letters back between the printed characters', () => {
    const slots = answerSlots("don't stop!");
    expect(readText(slots, ['d', 'o', 'n', 'l', 's', 't', 'o', 'p'])).toBe("don'l stop!");
  });
  it('shows ? for an empty box', () => {
    expect(readText(answerSlots('fish'), ['f', null, 's', 'h'])).toBe('f?sh');
  });
});

describe('printPosition', () => {
  it('apostrophes and quotation marks go at the top', () => {
    for (const t of ["'", '’', '‘', '“', '”', '"']) expect(printPosition(t), t).toBe('top');
  });
  it('hyphens and dashes go in the middle', () => {
    for (const t of ['-', '–', '—']) expect(printPosition(t), t).toBe('middle');
  });
  it('everything else sits on the baseline', () => {
    for (const t of ['.', ',', '...', '…', '?', '!', '7']) expect(printPosition(t), t).toBe('baseline');
  });
  it('a mixed run sits on the baseline', () => {
    expect(printPosition('?”')).toBe('baseline');
  });
});

describe('slotFactor', () => {
  it("keeps an apostrophe narrow, so don't reads as one word", () => {
    const [apostrophe] = answerSlots("don't").filter((s) => s.type === 'print');
    expect(slotFactor(apostrophe)).toBeLessThan(0.2);
    expect(slotFactor({ type: 'print', text: '-' })).toBeGreaterThanOrEqual(0.3);
  });
});

describe('fitsBoxes / fittingAlternates', () => {
  it('fits only with the same letters per word, spaces and printed characters', () => {
    expect(fitsBoxes('big', 'top')).toBe(true);
    expect(fitsBoxes('look at', 'gaze up')).toBe(true);
    expect(fitsBoxes("don't", "can’t")).toBe(true);   // curly and straight apostrophes count as the same
    expect(fitsBoxes('pretty', 'cute')).toBe(false);     // fewer letters
    expect(fitsBoxes('look at', 'lookat')).toBe(false);  // no space
    expect(fitsBoxes('look at', 'loo kat')).toBe(false); // the space is elsewhere
    expect(fitsBoxes("don't", 'do-nt')).toBe(false);     // different punctuation
    expect(fitsBoxes('Hi!', 'Yo.')).toBe(false);
  });
  it('the main answer itself is not an alternate', () => {
    expect(fitsBoxes('big', 'Big')).toBe(false);
  });
  it('lists the alternates that fit, as written (optional words left out), once each', () => {
    expect(fittingAlternates('big', ['top', 'large', 'top', 'hot (stuff)'])).toEqual(['top', 'hot']);
    expect(fittingAlternates('look (at)', ['see', 'seek'])).toEqual(['seek']);
    expect(fittingAlternates('big', [])).toEqual([]);
    expect(fittingAlternates('big', null)).toEqual([]);
  });
});
