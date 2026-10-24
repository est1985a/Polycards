// 設定 (settings) and 学習の記録 (stats) are full screens opened from the account menu (stats also
// from the player card). Each remembers the screen it was opened from, so 戻る goes back there, and
// they can stack one level: settings opened on the stats page goes back to the stats page, whose own
// 戻る still goes back to where stats was opened. Pure functions, used by App.jsx.
//
// state: { view, settingsFrom, statsFrom } (view as in App.jsx: 'dashboard', 'study', 'settings', …).

const OTHER = { settings: "stats", stats: "settings" };
const fromKey = (screen) => `${screen}From`;

// Opening settings or stats ('settings' | 'stats'). Returns the new state plus reload: true when the
// stats page is opened fresh and must load its data (not when it is shown again from settings).
export function openScreen(state, target) {
  const other = OTHER[target];
  if (state.view === target) return { ...state, reload: false };
  // No loops: settings opened over stats, then stats from the menu = back to the stats page (and the reverse).
  if (state.view === other && state[fromKey(other)] === target) return { ...state, view: target, reload: false };
  return { ...state, view: target, [fromKey(target)]: state.view, reload: target === "stats" };
}

// Where 戻る goes from the open settings or stats screen. A review that has ended
// (hasActiveSet false) can't be returned to, so that goes to the dashboard.
export function leaveScreen(state, hasActiveSet) {
  const from = state[fromKey(state.view)] ?? "dashboard";
  return from === "study" && !hasActiveSet ? "dashboard" : from;
}

// True when a review is open underneath settings and/or stats (study → stats → settings, or
// study → settings → stats), so the hidden StudySession stays mounted and continues on 戻る.
export function reviewKept(state, hasActiveSet) {
  if (!hasActiveSet) return false;
  let view = state.view;
  for (let step = 0; step < 3; step++) {
    if (view === "study") return true;
    if (!OTHER[view]) return false;
    view = state[fromKey(view)];
  }
  return false;
}
