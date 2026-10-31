// The student's pop-up after sign-in when a teacher's pre-filled roster put them in a class
// (RosterJoinPopup.jsx): for each class, 「{name}に入りました！」 then the nickname step. Pure functions.

// claim_my_roster()'s answer ([{ id, name, needs_nickname }]) → the first step, or null (nothing to show).
// A class listed twice is shown once; a class that doesn't need a nickname is left out.
export function rosterJoinStart(result) {
  const seen = new Set();
  const queue = [];
  for (const c of Array.isArray(result) ? result : []) {
    if (!c?.id || seen.has(c.id) || c.needs_nickname === false) continue;
    seen.add(c.id);
    queue.push({ id: c.id, name: c.name ?? '' });
  }
  return queue.length > 0 ? { queue, index: 0, step: 'joined' } : null;
}

// The step after this one: joined → nickname → the next class (joined) → … → null (done).
// Moving on from 'nickname' happens only after the nickname was saved.
export function rosterJoinNext(state) {
  if (!state) return null;
  if (state.step === 'joined') return { ...state, step: 'nickname' };
  const index = state.index + 1;
  return index < state.queue.length ? { ...state, index, step: 'joined' } : null;
}

// The class the pop-up is about now.
export const rosterJoinClass = (state) => (state ? state.queue[state.index] : null);
