// Keyboard shortcuts in the review and the Card Sets drill (StudySession.jsx). Pure functions, so the
// whole key table can be tested without a browser.
//
// Phases (what the card on screen is waiting for):
//   question  tap-mode front showing (答えを見る)
//   choose    まだ / わかった showing (tap, drill, or typing / handwriting after a close or wrong answer)
//   next      次へ showing (typing / handwriting after a correct spelling or わからない)
//   typing    the typing box, or a handwriting card before こたえる
//   done      the 全部クリア panel
//   busy      waiting (handwriting being read, typing answer being checked): no keys
//
// Keys:
//   Enter / Space   question → flip
//   ← / 1           choose → まだ
//   → / 2           choose → わかった; next → 次へ
//   Enter           next → 次へ (only when focus isn't on a button: a focused 次へ clicks itself)
//   Shift+Enter     typing → わからない (also inside the typing box)
//   Backspace       undo, only in question / choose / done (never next or typing, so fixing a typo
//                   right after answering can't take back the previous card)
//   ⌘Z / Ctrl+Z     undo in every phase (not inside a text field: that's the field's own undo)
//   P               play the pronunciation again
// Digits and P are matched by event.code, so they still work while Japanese input is on.
// Enter never answers まだ / わかった: answering always takes a deliberate ← / → / 1 / 2.
import { NEXT_KEY_GUARD_MS } from './spelling';
import { isImeKey } from './dictionary';

// Every key is ignored for this long after the phase changes (by a key, a tap or a click), so a quick
// → → can't answer わかった and then skip the result, and a double Enter can't flip and run on.
export const PHASE_GUARD_MS = NEXT_KEY_GUARD_MS;

// Each key by its physical position (event.code); event.key only when the browser sends no code.
const NOT_YET = { codes: ['ArrowLeft', 'Digit1', 'Numpad1'], keys: ['ArrowLeft', '1'] };
const GOT_IT = { codes: ['ArrowRight', 'Digit2', 'Numpad2'], keys: ['ArrowRight', '2'] };
const KEY_Z = { codes: ['KeyZ'], keys: ['z', 'Z'] };
const KEY_P = { codes: ['KeyP'], keys: ['p', 'P'] };
const matches = (event, { codes, keys }) => (event.code ? codes.includes(event.code) : keys.includes(event.key));
const BACKSPACE_PHASES = ['question', 'choose', 'done'];

// The keycap glyphs shown on the buttons (KeyHint.jsx). Symbols, not words, so the same in both languages.
export const KEY_HINTS = { flip: '↵', notYet: '←', gotIt: '→', next: '↵', undo: '⌫' };

// aria-keyshortcuts for each button (read by screen readers; the keycaps themselves are aria-hidden).
export const ARIA_KEYS = {
  flip: 'Enter Space',
  notYet: 'ArrowLeft 1',
  gotIt: 'ArrowRight 2',
  next: 'Enter ArrowRight',
  undo: 'Meta+Z Control+Z Backspace',
  undoNoBackspace: 'Meta+Z Control+Z',
};

// Backspace undoes in this phase (the ⌫ keycap shows on 元に戻す only then).
export function backspaceUndoes(phase) {
  return BACKSPACE_PHASES.includes(phase);
}

// Where the key press happened: 'editable' (a text field), 'control' (a button or link, which Enter /
// Space already click) or 'page' (anything else: the page, the card back, a handwriting box).
export function targetKind(el) {
  if (!el || typeof el !== 'object') return 'page';
  const tag = String(el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable) return 'editable';
  if (tag === 'button' || tag === 'a' || tag === 'summary') return 'control';
  const role = el.getAttribute?.('role');
  if (role === 'button' || role === 'switch' || role === 'link' || role === 'menuitem') return 'control';
  return 'page';
}

// What one keydown should do, or null.
// state: { phase, canUndo, canSpeak, sincePhaseChangeMs, target ('editable' | 'control' | 'page') }
export function reviewKeyAction(event, state) {
  if (!event || !state) return null;
  if (event.repeat || event.defaultPrevented || event.altKey) return null;
  const { phase, canUndo = false, canSpeak = false, sincePhaseChangeMs = Infinity, target = 'page' } = state;
  if (!phase || phase === 'busy') return null;

  const mod = event.metaKey || event.ctrlKey;
  const undoCombo = mod && !event.shiftKey && matches(event, KEY_Z);
  if (mod && !undoCombo) return null;
  if (sincePhaseChangeMs < PHASE_GUARD_MS) return null;

  if (undoCombo) return canUndo && target !== 'editable' ? 'undo' : null;

  if (event.key === 'Enter' && event.shiftKey) {
    if (isImeKey(event)) return null;
    return phase === 'typing' && target !== 'control' ? 'dontKnow' : null;
  }
  if (event.shiftKey) return null;
  if (target === 'editable') return null;

  if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') {
    if (isImeKey(event) || target === 'control') return null; // a focused button clicks itself
    if (phase === 'question') return 'flip';
    if (phase === 'next' && event.key === 'Enter') return 'next';
    return null;
  }
  if (matches(event, NOT_YET)) return phase === 'choose' ? 'notYet' : null;
  if (matches(event, GOT_IT)) {
    if (phase === 'choose') return 'gotIt';
    if (phase === 'next') return 'next';
    return null;
  }
  if (event.key === 'Backspace') return canUndo && backspaceUndoes(phase) ? 'undo' : null;
  if (matches(event, KEY_P)) return canSpeak && phase !== 'done' ? 'speak' : null;
  return null;
}

// The phase of the card on screen, from StudySession's own state.
export function reviewPhase({ done, typingPhase = null, revealed = false, busy = false }) {
  if (done) return 'done';
  if (busy) return 'busy';
  if (typingPhase === 'typing') return 'typing';
  if (typingPhase === 'next') return 'next';
  if (typingPhase === 'choose') return 'choose';
  return revealed ? 'choose' : 'question';
}

const BLOCKING = '[aria-modal="true"], [role="dialog"], [role="menu"], .review-plan-backdrop';

// A pop-up or menu is open over the review (only ones actually on screen: hidden ones don't count).
export function reviewBlocked(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc?.querySelectorAll) return false;
  return Array.from(doc.querySelectorAll(BLOCKING)).some((el) => !el.hidden && el.getClientRects().length > 0);
}

// The key press came from a real keyboard: on an iPad the on-screen keyboard only appears while a
// text field has focus, so a key pressed anywhere else means a keyboard is attached.
export function isPhysicalKey(event, target) {
  return Boolean(event) && !event.repeat && target !== 'editable';
}

// What StudySession's window listener does with one keydown: runs the matching handler and stops the
// browser's own action. handlers: { flip, notYet, gotIt, next, dontKnow, undo, speak }.
// Returns the action that ran (or null). blocked: a pop-up is open or the review is hidden.
export function dispatchReviewKey(event, state, handlers, blocked = false) {
  if (blocked) return null;
  const action = reviewKeyAction(event, state);
  if (!action || !handlers?.[action]) return null;
  event.preventDefault?.();
  handlers[action]();
  return action;
}

// Keyboard hints: on from the start where there is a mouse or trackpad (computers), else from the first
// physical key press in a review (remembered for this tab).
export const KEY_HINTS_STORAGE = 'polycards.keyHints';

export function initialKeyHints(win = typeof window !== 'undefined' ? window : undefined) {
  try {
    if (win?.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches) return true;
  } catch { /* no matchMedia */ }
  try {
    return win?.sessionStorage?.getItem(KEY_HINTS_STORAGE) === '1';
  } catch {
    return false;
  }
}

export function rememberKeyHints(win = typeof window !== 'undefined' ? window : undefined) {
  try {
    win?.sessionStorage?.setItem(KEY_HINTS_STORAGE, '1');
  } catch { /* storage blocked: hints still show for this review */ }
}

// The 全部クリア panel focuses 続けて復習する (so Enter starts the next set) only for keyboard users,
// and only after this delay, so a double Enter on the last 次へ can't start a new set.
export const CONTINUE_FOCUS_DELAY_MS = 400;

// Calls focus() after the delay when enabled. Returns a function that cancels it.
export function scheduleFocus(enabled, focus, delay = CONTINUE_FOCUS_DELAY_MS, timers = globalThis) {
  if (!enabled) return () => {};
  const id = timers.setTimeout(focus, delay);
  return () => timers.clearTimeout(id);
}
