// Tests for the Training tab's activity list and navigation (pure). Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  TRAINING_ACTIVITIES, TRAINING_START, alphabet, showTrainingTab, stepLetter, trainingActivities, trainingParent,
  letterPracticeId, doneLettersFromProgress,
} from './training';

describe('activities', () => {
  it('has ABCを書こう, shown while handwriting practice is on', () => {
    expect(TRAINING_ACTIVITIES.map((a) => a.id)).toEqual(['abc']);
    expect(trainingActivities().map((a) => a.id)).toEqual(['abc']);
  });

  it('leaves out activities that are switched off', () => {
    const list = [{ id: 'abc', available: false }, { id: 'words', available: true }];
    expect(trainingActivities(list).map((a) => a.id)).toEqual(['words']);
  });

  it('the tab shows only when switched on and something is in it', () => {
    expect(showTrainingTab(true)).toBe(true);
    expect(showTrainingTab(false)).toBe(false);
    expect(showTrainingTab(true, [{ id: 'abc', available: false }])).toBe(false);
  });
});

describe('alphabet / stepLetter', () => {
  it('A–Z and a–z', () => {
    expect(alphabet()).toHaveLength(26);
    expect(alphabet()[0]).toBe('A');
    expect(alphabet(true).join('')).toBe('abcdefghijklmnopqrstuvwxyz');
  });

  it('steps in the same case and stops at the ends', () => {
    expect(stepLetter('B', 1)).toBe('C');
    expect(stepLetter('b', -1)).toBe('a');
    expect(stepLetter('A', -1)).toBeNull();
    expect(stepLetter('Z', 1)).toBeNull();
    expect(stepLetter('z', 1)).toBeNull();
  });
});

describe('trainingParent', () => {
  it('letter → ABC grid in the same case, ABC grid → menu', () => {
    expect(trainingParent({ screen: 'letter', lowercase: true, letter: 'g' })).toEqual({ screen: 'abc', lowercase: true, letter: null });
    expect(trainingParent({ screen: 'abc', lowercase: true, letter: null })).toEqual({ ...TRAINING_START, lowercase: true });
  });
});

describe('saved progress ids', () => {
  it('gives one stable id per letter and case', () => {
    expect(letterPracticeId('B')).toBe('abc-upper-b');
    expect(letterPracticeId('b')).toBe('abc-lower-b');
    const ids = [...alphabet(), ...alphabet(true)].map(letterPracticeId);
    expect(new Set(ids).size).toBe(52);
    // Same rule as the CHECK in supabase/polycards-training-progress.sql
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,64}$/);
  });

  it('turns saved rows back into letters, ignoring other ids', () => {
    const rows = [{ practice_id: 'abc-upper-b' }, { practice_id: 'abc-lower-b' }, { practice_id: 'abc-lower-z' }, { practice_id: 'spelling-1' }, { practice_id: 'abc-upper-bb' }, {}];
    expect(doneLettersFromProgress(rows)).toEqual(new Set(['B', 'b', 'z']));
    expect(doneLettersFromProgress(null)).toEqual(new Set());
    for (const l of [...alphabet(), ...alphabet(true)]) {
      expect(doneLettersFromProgress([{ practice_id: letterPracticeId(l) }])).toEqual(new Set([l]));
    }
  });
});
