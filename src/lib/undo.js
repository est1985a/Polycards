// Undo for the last まだ / わかった answer in a study session (StudySession.jsx). The answer itself is
// held back (holdAnswer in api.js); these helpers keep a copy of the session from just before the
// answer, so Undo can put it back exactly. Pure functions.

// The parts of the session an answer changes. typed / typedResult / retryUsed: typing and
// handwriting cards (the まだ / わかった choice after a close or wrong answer). mode: the answer mode the
// card was answered in (tap / typing / handwriting), so an undone card comes back the same way even if
// the student switched the mode after answering.
const FIELDS = ["pile", "counts", "wrongCounts", "clearedCount", "typed", "typedResult", "retryUsed", "mode"];

// A copy of the session state just before an answer. The arrays and objects are copied, so later
// changes to the session can't reach it.
export function takeSnapshot(state) {
  const snapshot = {};
  for (const key of FIELDS) {
    const value = state[key];
    snapshot[key] = Array.isArray(value) ? [...value]
      : value && typeof value === "object" ? { ...value }
      : value;
  }
  return snapshot;
}

// What Undo needs, plus what the "previous card" chip shows: the card's front word and the button
// that was pressed (knew: true = わかった, false = まだ).
export function makeUndo(snapshot, card, knew) {
  return { snapshot, cardId: card.id, front: card.front, knew };
}

// The session state to put back: the snapshot, with the card on its answer side (revealed) so
// まだ / わかった show again, and no other-meaning check running.
export function restoreState(undo) {
  return { ...takeSnapshot(undo.snapshot), revealed: true, checking: false };
}

// i18n key prefix of the pressed button's label (review.gotIt.en / .ja, review.notYet.en / .ja).
export function chipLabelKey(knew) {
  return knew ? "review.gotIt" : "review.notYet";
}
