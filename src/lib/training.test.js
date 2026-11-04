// Tests for the Training tab's activity list and navigation (pure). Run with: npm test
import { describe, it, expect, vi } from 'vitest';
import {
  TRAINING_ACTIVITIES, TRAINING_START, alphabet, showTrainingTab, stepLetter, trainingActivities, trainingParent,
  letterPracticeId, doneLettersFromProgress, abcRewardId, abcRewardState, abcRewardsLeft, claimRewardSteps,
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

describe('ABC ticket rewards', () => {
  const capitals = new Set(alphabet(false));
  it('reward ids per case', () => {
    expect(abcRewardId(false)).toBe('abc-upper');
    expect(abcRewardId(true)).toBe('abc-lower');
  });

  it('hidden while the claimed list is unknown (null), even with every letter done', () => {
    expect(abcRewardState(capitals, false, null)).toBe('hidden');
    expect(abcRewardsLeft(null)).toBeNull();
  });

  it('locked at 25, ready at 26, in the same case only', () => {
    const almost = new Set(capitals); almost.delete('Z'); almost.add('z');
    expect(abcRewardState(almost, false, new Set())).toBe('locked');
    almost.add('Z');
    expect(abcRewardState(almost, false, new Set())).toBe('ready');
    expect(abcRewardState(almost, true, new Set())).toBe('locked');
  });

  it('claimed once the id is in the set, whatever the letters', () => {
    expect(abcRewardState(new Set(), false, new Set(['abc-upper']))).toBe('claimed');
    expect(abcRewardState(new Set(), true, new Set(['abc-upper']))).toBe('locked');
  });

  it('tickets left for the menu pill', () => {
    expect(abcRewardsLeft(new Set())).toBe(2);
    expect(abcRewardsLeft(new Set(['abc-lower']))).toBe(1);
    expect(abcRewardsLeft(new Set(['abc-upper', 'abc-lower']))).toBe(0);
  });
});

describe('claimRewardSteps (ガチャ券をもらう)', () => {
  it('waits for letter saves, claims, marks claimed, then refreshes', async () => {
    const order = [];
    let finishSave;
    const save = new Promise((r) => { finishSave = r; }).then(() => order.push('save'));
    const run = claimRewardSteps('abc-upper', {
      pending: [save],
      claim: async (id) => { order.push('claim ' + id); return { claimed: true, already: false }; },
      markClaimed: (id) => order.push('mark ' + id),
      refresh: async () => order.push('refresh'),
    });
    await Promise.resolve();
    expect(order).toEqual([]);
    finishSave();
    expect(await run).toEqual({ claimed: true, already: false });
    expect(order).toEqual(['save', 'claim abc-upper', 'mark abc-upper', 'refresh']);
  });

  it('marks claimed also when it was claimed before', async () => {
    const markClaimed = vi.fn();
    await claimRewardSteps('abc-lower', { claim: async () => ({ claimed: true, already: true }), markClaimed, refresh: async () => {} });
    expect(markClaimed).toHaveBeenCalledWith('abc-lower');
  });

  it('a failed gacha refresh is only logged: the claim still counts', async () => {
    const markClaimed = vi.fn();
    const log = vi.fn();
    await expect(claimRewardSteps('abc-upper', {
      claim: async () => ({ claimed: true, already: false }), markClaimed,
      refresh: async () => { throw new Error('offline'); }, log,
    })).resolves.toEqual({ claimed: true, already: false });
    expect(markClaimed).toHaveBeenCalledWith('abc-upper');
    expect(log).toHaveBeenCalled();
  });

  it('a failed claim throws and marks nothing', async () => {
    const markClaimed = vi.fn();
    const refresh = vi.fn();
    await expect(claimRewardSteps('abc-upper', {
      claim: async () => { throw new Error('not_complete'); }, markClaimed, refresh,
    })).rejects.toThrow('not_complete');
    expect(markClaimed).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
