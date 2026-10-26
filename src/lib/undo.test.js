// Tests for the undo snapshot helpers. Run with: npm test
import { describe, it, expect } from 'vitest';
import { takeSnapshot, makeUndo, restoreState, chipLabelKey } from './undo';
import { reinsert } from './drill';

const card = { id: "w1-j2e", front: "犬", back: "dog" };

const before = {
  pile: ["w1-j2e", "w2-e2j", "w3-e2j"],
  counts: { "w2-e2j": 1 },
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

  it('puts back miss counts, the cleared count and drill counts', () => {
    const restored = restoreState(makeUndo(takeSnapshot(before), card, true));
    expect(restored.wrongCounts).toEqual({ "w3-e2j": 1 });
    expect(restored.counts).toEqual({ "w2-e2j": 1 });
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
