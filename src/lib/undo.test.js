// Tests for the undo snapshot helpers. Run with: npm test
import { describe, it, expect } from 'vitest';
import { takeSnapshot, makeUndo, restoreState, chipLabelKey, questionShowing } from './undo';
import { reinsert } from './drill';

const card = { id: "w1-j2e", front: "犬", back: "dog" };

const before = {
  pile: ["w1-j2e", "w2-e2j", "w3-e2j"],
  wrongCounts: { "w3-e2j": 1 },
  clearedCount: 4,
  typed: "dgo",
  typedResult: { spelling: "close", next: false, again: false },
  retryUsed: true,
  mode: "typing",
  revealed: true,
};

describe('undo snapshot', () => {
  it('puts back the pile from before a まだ, with the card on top and the re-inserted copy gone', () => {
    const undo = makeUndo(takeSnapshot(before), card, false);
    const afterPile = reinsert(before.pile.slice(1), card.id);
    expect(afterPile).toContain(card.id);
    const restored = restoreState(undo);
    expect(restored.pile).toEqual(["w1-j2e", "w2-e2j", "w3-e2j"]);
    expect(restored.pile.filter((id) => id === card.id)).toHaveLength(1);
  });

  it('puts back miss counts, and the cleared count', () => {
    const restored = restoreState(makeUndo(takeSnapshot(before), card, true));
    expect(restored.wrongCounts).toEqual({ "w3-e2j": 1 });
    expect(restored.clearedCount).toBe(4);
  });

  it('puts back the typing fields, so the まだ / わかった choice shows again', () => {
    const restored = restoreState(makeUndo(takeSnapshot(before), card, false));
    expect(restored.typed).toBe("dgo");
    expect(restored.typedResult).toEqual({ spelling: "close", next: false, again: false });
    expect(restored.retryUsed).toBe(true);
  });

  it('brings the card back on its answer side, with no check running', () => {
    const restored = restoreState(makeUndo(takeSnapshot({ ...before, typedResult: null }), card, true));
    expect(restored.revealed).toBe(true);
    expect(restored.checking).toBe(false);
    expect(restored.typedResult).toBe(null);
  });

  it('is not changed by later changes to the session', () => {
    const state = { ...before, pile: [...before.pile], wrongCounts: { ...before.wrongCounts } };
    const undo = makeUndo(takeSnapshot(state), card, false);
    state.pile.push("w9-e2j");
    state.wrongCounts["w1-j2e"] = 1;
    const restored = restoreState(undo);
    expect(restored.pile).toEqual(["w1-j2e", "w2-e2j", "w3-e2j"]);
    expect(restored.wrongCounts).toEqual({ "w3-e2j": 1 });
  });

  it('remembers what the chip shows', () => {
    const undo = makeUndo(takeSnapshot(before), card, true);
    expect(undo).toMatchObject({ cardId: "w1-j2e", front: "犬", knew: true });
    expect(chipLabelKey(true)).toBe("review.gotIt");
    expect(chipLabelKey(false)).toBe("review.notYet");
  });
});

describe('undo keeps the answer mode', () => {
  it('brings back the mode the card was answered in', () => {
    const restored = restoreState(makeUndo(takeSnapshot(before), card, false));
    expect(restored.mode).toBe("typing");
  });
});

describe('questionShowing (the dictionary search is off while it is true)', () => {
  it('is true for a card not answered yet, false once flipped or answered, false when done', () => {
    expect(questionShowing({ done: false, revealed: false, typedResult: null })).toBe(true);
    expect(questionShowing({ done: false, revealed: true, typedResult: null })).toBe(false);
    expect(questionShowing({ done: false, revealed: false, typedResult: { spelling: 'wrong' } })).toBe(false);
    expect(questionShowing({ done: true, revealed: false, typedResult: null })).toBe(false);
  });

  it('follows Undo: a restored card shows its answer side, a card restored to its question is locked again', () => {
    const undo = makeUndo(takeSnapshot({ pile: ['a'], wrongCounts: {}, clearedCount: 0, typed: '', typedResult: null, retryUsed: false, mode: 'off' }), { id: 'a', front: 'dog' }, true);
    const restored = restoreState(undo);
    expect(questionShowing({ done: false, ...restored })).toBe(false);
    expect(questionShowing({ done: false, ...restored, revealed: false })).toBe(true);
  });
});
