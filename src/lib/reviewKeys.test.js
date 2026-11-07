// Tests for the review's keyboard shortcuts (src/lib/reviewKeys.js). Run with: npm test
// The tests have no browser, so a key press is a plain object and the handlers are mocks: this is the
// same function StudySession's window listener calls with the real event.
import { describe, it, expect, vi } from 'vitest';
import {
  reviewKeyAction, reviewPhase, dispatchReviewKey, reviewBlocked, targetKind, backspaceUndoes,
  isPhysicalKey, initialKeyHints, rememberKeyHints, scheduleFocus, PHASE_GUARD_MS, CONTINUE_FOCUS_DELAY_MS,
  KEY_HINTS_STORAGE, KEY_HINTS,
} from './reviewKeys';

const CODES = { Enter: 'Enter', ' ': 'Space', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Backspace: 'Backspace', '1': 'Digit1', '2': 'Digit2', z: 'KeyZ', p: 'KeyP' };
const key = (k, extra = {}) => ({ key: k, code: CODES[k], preventDefault: vi.fn(), ...extra });
const state = (phase, extra = {}) => ({ phase, canUndo: true, canSpeak: true, sincePhaseChangeMs: 1000, target: 'page', ...extra });
const act = (k, phase, extra = {}, stateExtra = {}) => reviewKeyAction(key(k, extra), state(phase, stateExtra));

function handlers() {
  return { flip: vi.fn(), notYet: vi.fn(), gotIt: vi.fn(), next: vi.fn(), dontKnow: vi.fn(), undo: vi.fn(), speak: vi.fn() };
}

describe('reviewKeyAction: the key table', () => {
  it('question: Enter and Space flip; answer keys do nothing', () => {
    expect(act('Enter', 'question')).toBe('flip');
    expect(act(' ', 'question')).toBe('flip');
    expect(act('ArrowLeft', 'question')).toBe(null);
    expect(act('ArrowRight', 'question')).toBe(null);
    expect(act('1', 'question')).toBe(null);
  });

  it('choose: ← / 1 = まだ, → / 2 = わかった', () => {
    expect(act('ArrowLeft', 'choose')).toBe('notYet');
    expect(act('1', 'choose')).toBe('notYet');
    expect(act('ArrowRight', 'choose')).toBe('gotIt');
    expect(act('2', 'choose')).toBe('gotIt');
    expect(reviewKeyAction(key('1', { code: 'Numpad1' }), state('choose'))).toBe('notYet');
    expect(reviewKeyAction(key('2', { code: 'Numpad2' }), state('choose'))).toBe('gotIt');
  });

  it('Enter and Space never answer まだ / わかった', () => {
    expect(act('Enter', 'choose')).toBe(null);
    expect(act(' ', 'choose')).toBe(null);
  });

  it('next: Enter and → go on; ← does nothing', () => {
    expect(act('Enter', 'next')).toBe('next');
    expect(act('ArrowRight', 'next')).toBe('next');
    expect(act('2', 'next')).toBe('next');
    expect(act('ArrowLeft', 'next')).toBe(null);
    expect(act(' ', 'next')).toBe(null);
  });

  it('typing: Shift+Enter = わからない, in the box or on a handwriting card', () => {
    expect(act('Enter', 'typing', { shiftKey: true }, { target: 'editable' })).toBe('dontKnow');
    expect(act('Enter', 'typing', { shiftKey: true }, { target: 'page' })).toBe('dontKnow');
    expect(act('Enter', 'typing', { shiftKey: true }, { target: 'control' })).toBe(null);
    expect(act('Enter', 'choose', { shiftKey: true })).toBe(null);
    expect(act('Enter', 'question', { shiftKey: true })).toBe(null);
  });

  it('typing: plain Enter in the box is left to the form (答える)', () => {
    expect(act('Enter', 'typing', {}, { target: 'editable' })).toBe(null);
  });

  it('Shift+Enter that belongs to Japanese input is skipped', () => {
    expect(act('Enter', 'typing', { shiftKey: true, isComposing: true }, { target: 'editable' })).toBe(null);
    expect(act('Enter', 'typing', { shiftKey: true, keyCode: 229 }, { target: 'editable' })).toBe(null);
    expect(act('Enter', 'question', { keyCode: 229 })).toBe(null);
  });

  it('digits and P work while Japanese input is on (key "Process", matched by code)', () => {
    expect(reviewKeyAction(key('Process', { code: 'Digit1', keyCode: 229 }), state('choose'))).toBe('notYet');
    expect(reviewKeyAction(key('Process', { code: 'Digit2', keyCode: 229 }), state('choose'))).toBe('gotIt');
    expect(reviewKeyAction(key('Process', { code: 'KeyP', keyCode: 229 }), state('choose'))).toBe('speak');
  });

  it('a browser with no event.code falls back to event.key', () => {
    expect(reviewKeyAction({ key: '1' }, state('choose'))).toBe('notYet');
    expect(reviewKeyAction({ key: 'ArrowRight' }, state('choose'))).toBe('gotIt');
  });

  it('Backspace undoes only in question, choose and done', () => {
    expect(act('Backspace', 'question')).toBe('undo');
    expect(act('Backspace', 'choose')).toBe('undo');
    expect(act('Backspace', 'done')).toBe('undo');
    expect(act('Backspace', 'next')).toBe(null);
    expect(act('Backspace', 'typing')).toBe(null);
    expect(act('Backspace', 'typing', {}, { target: 'editable' })).toBe(null);
    expect(backspaceUndoes('next')).toBe(false);
    expect(backspaceUndoes('typing')).toBe(false);
  });

  it('⌘Z / Ctrl+Z undo in every phase, but not inside a text field', () => {
    for (const phase of ['question', 'choose', 'next', 'typing', 'done']) {
      expect(act('z', phase, { metaKey: true })).toBe('undo');
      expect(act('z', phase, { ctrlKey: true })).toBe('undo');
    }
    expect(act('z', 'typing', { metaKey: true }, { target: 'editable' })).toBe(null);
    expect(act('z', 'choose', { metaKey: true, shiftKey: true })).toBe(null); // ⌘⇧Z is redo
  });

  it('nothing to undo: undo keys do nothing', () => {
    expect(act('Backspace', 'choose', {}, { canUndo: false })).toBe(null);
    expect(act('z', 'choose', { metaKey: true }, { canUndo: false })).toBe(null);
  });

  it('P plays the word only when the English is showing', () => {
    expect(act('p', 'choose')).toBe('speak');
    expect(act('p', 'question', {}, { canSpeak: false })).toBe(null);
    expect(act('p', 'done')).toBe(null);
    expect(act('p', 'typing', {}, { target: 'editable', canSpeak: false })).toBe(null);
  });

  it('a held-down key, Alt, or ⌘ / Ctrl with another key does nothing', () => {
    expect(act('ArrowRight', 'choose', { repeat: true })).toBe(null);
    expect(act('ArrowRight', 'choose', { altKey: true })).toBe(null);
    expect(act('ArrowRight', 'choose', { metaKey: true })).toBe(null);
    expect(act('1', 'choose', { ctrlKey: true })).toBe(null);
    expect(act('ArrowRight', 'choose', { shiftKey: true })).toBe(null);
  });

  it('a key another handler already stopped (defaultPrevented) does nothing', () => {
    expect(act('Enter', 'next', { defaultPrevented: true })).toBe(null);
  });

  it('inside a text field only Shift+Enter and the field\'s own keys work', () => {
    expect(act('ArrowLeft', 'choose', {}, { target: 'editable' })).toBe(null);
    expect(act('p', 'choose', {}, { target: 'editable' })).toBe(null);
    expect(act('Backspace', 'choose', {}, { target: 'editable' })).toBe(null);
  });

  it('Enter / Space on a focused button are left to the button (it clicks itself)', () => {
    expect(act('Enter', 'question', {}, { target: 'control' })).toBe(null);
    expect(act(' ', 'question', {}, { target: 'control' })).toBe(null);
    expect(act('Enter', 'next', {}, { target: 'control' })).toBe(null);
    // Arrows aren't a button's own key, so they still work with a button focused.
    expect(act('ArrowRight', 'next', {}, { target: 'control' })).toBe('next');
    expect(act('ArrowLeft', 'choose', {}, { target: 'control' })).toBe('notYet');
  });

  it('busy (reading / checking) and unknown phases do nothing', () => {
    expect(act('Enter', 'busy', { shiftKey: true })).toBe(null);
    expect(act('z', 'busy', { metaKey: true })).toBe(null);
    expect(reviewKeyAction(key('Enter'), state(null))).toBe(null);
  });
});

describe('the phase-change guard', () => {
  it(`ignores every action key for ${PHASE_GUARD_MS} ms after a phase change`, () => {
    const soon = { sincePhaseChangeMs: PHASE_GUARD_MS - 1 };
    expect(act('Enter', 'question', {}, soon)).toBe(null);
    expect(act('ArrowRight', 'choose', {}, soon)).toBe(null);
    expect(act('ArrowRight', 'next', {}, soon)).toBe(null);
    expect(act('Backspace', 'choose', {}, soon)).toBe(null);
    expect(act('z', 'choose', { metaKey: true }, soon)).toBe(null);
    expect(act('Enter', 'typing', { shiftKey: true }, soon)).toBe(null);
    expect(act('ArrowRight', 'choose', {}, { sincePhaseChangeMs: PHASE_GUARD_MS })).toBe('gotIt');
  });

  it('→ → on a close typing answer answers わかった but does not skip the next card', () => {
    // choose → (わかった) → the next card's phase starts, the second → comes 120 ms later.
    const h = handlers();
    expect(dispatchReviewKey(key('ArrowRight'), state('choose'), h)).toBe('gotIt');
    expect(dispatchReviewKey(key('ArrowRight'), state('next', { sincePhaseChangeMs: 120 }), h)).toBe(null);
    expect(dispatchReviewKey(key('ArrowRight'), state('question', { sincePhaseChangeMs: 120 }), h)).toBe(null);
    expect(h.gotIt).toHaveBeenCalledTimes(1);
    expect(h.next).not.toHaveBeenCalled();
  });
});

describe('reviewPhase', () => {
  it('maps StudySession state to a phase', () => {
    expect(reviewPhase({ done: true })).toBe('done');
    expect(reviewPhase({ done: false, busy: true, typingPhase: 'typing' })).toBe('busy');
    expect(reviewPhase({ done: false, typingPhase: 'typing' })).toBe('typing');
    expect(reviewPhase({ done: false, typingPhase: 'next', revealed: true })).toBe('next');
    expect(reviewPhase({ done: false, typingPhase: 'choose', revealed: true })).toBe('choose');
    expect(reviewPhase({ done: false, revealed: false })).toBe('question');
    expect(reviewPhase({ done: false, revealed: true })).toBe('choose');
  });
});

describe('dispatchReviewKey (what the window listener does with one key press)', () => {
  const cases = [
    ['question', key('Enter'), 'flip'],
    ['question', key(' '), 'flip'],
    ['choose', key('ArrowLeft'), 'notYet'],
    ['choose', key('ArrowRight'), 'gotIt'],
    ['next', key('Enter'), 'next'],
    ['next', key('ArrowRight'), 'next'],
    ['typing', key('Enter', { shiftKey: true }), 'dontKnow'],
    ['done', key('Backspace'), 'undo'],
    ['done', key('z', { ctrlKey: true }), 'undo'],
  ];
  for (const [phase, event, action] of cases) {
    it(`${phase}: ${event.shiftKey ? 'Shift+' : ''}${event.ctrlKey ? 'Ctrl+' : ''}${event.key} runs ${action} once and stops the browser's own action`, () => {
      const h = handlers();
      expect(dispatchReviewKey(event, state(phase, { target: phase === 'typing' ? 'editable' : 'page' }), h)).toBe(action);
      expect(h[action]).toHaveBeenCalledTimes(1);
      const others = Object.keys(h).filter((k) => k !== action);
      for (const k of others) expect(h[k]).not.toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });
  }

  it('Shift+Enter in the typing box stops the form being submitted (preventDefault)', () => {
    const event = key('Enter', { shiftKey: true });
    dispatchReviewKey(event, state('typing', { target: 'editable' }), handlers());
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('Backspace on the typing 次へ and on a handwriting card does nothing (and doesn\'t stop the key)', () => {
    const h = handlers();
    const a = key('Backspace');
    const b = key('Backspace');
    expect(dispatchReviewKey(a, state('next'), h)).toBe(null);
    expect(dispatchReviewKey(b, state('typing'), h)).toBe(null);
    expect(h.undo).not.toHaveBeenCalled();
    expect(a.preventDefault).not.toHaveBeenCalled();
  });

  it('one Enter on a focused 次へ runs handleNext exactly once (the button clicks; the listener skips)', () => {
    // The button's own click is the one call; the listener sees the same key press with a button target.
    const h = handlers();
    const event = key('Enter');
    const clicked = () => h.next(); // the browser's click on the focused 次へ
    dispatchReviewKey(event, state('next', { target: 'control' }), h);
    clicked();
    expect(h.next).toHaveBeenCalledTimes(1);
  });

  it('one Enter with focus on the page (not on 次へ) also runs handleNext exactly once', () => {
    const h = handlers();
    dispatchReviewKey(key('Enter'), state('next', { target: 'page' }), h);
    expect(h.next).toHaveBeenCalledTimes(1);
  });

  it('an early Enter that 次へ itself stopped (ignoreNextKey) runs nothing', () => {
    const h = handlers();
    dispatchReviewKey(key('Enter', { defaultPrevented: true }), state('next'), h);
    expect(h.next).not.toHaveBeenCalled();
  });

  it('a pop-up open or the review hidden: nothing runs and the key is left alone', () => {
    const h = handlers();
    const event = key('ArrowRight');
    expect(dispatchReviewKey(event, state('choose'), h, true)).toBe(null);
    expect(h.gotIt).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

// A tiny stand-in for document.querySelectorAll: elements with or without client rects.
function fakeDoc(elements) {
  return { querySelectorAll: () => elements };
}
const shown = (extra = {}) => ({ hidden: false, getClientRects: () => [{}], ...extra });
const notShown = (extra = {}) => ({ hidden: false, getClientRects: () => [], ...extra });

describe('reviewBlocked', () => {
  it('an open aria-modal pop-up or menu blocks the keys', () => {
    expect(reviewBlocked(fakeDoc([shown()]))).toBe(true);
  });

  it('a closed menu / dialog still in the page (no client rects, or hidden) does not', () => {
    expect(reviewBlocked(fakeDoc([notShown()]))).toBe(false);
    expect(reviewBlocked(fakeDoc([shown({ hidden: true })]))).toBe(false);
    expect(reviewBlocked(fakeDoc([]))).toBe(false);
  });

  it('asks for dialogs, aria-modal, menus and the pop-up backdrop', () => {
    const querySelectorAll = vi.fn(() => []);
    reviewBlocked({ querySelectorAll });
    const selector = querySelectorAll.mock.calls[0][0];
    expect(selector).toContain('[aria-modal="true"]');
    expect(selector).toContain('[role="dialog"]');
    expect(selector).toContain('[role="menu"]');
    expect(selector).toContain('.review-plan-backdrop');
  });

  it('keys still run when a closed menu is in the page', () => {
    const h = handlers();
    dispatchReviewKey(key('ArrowRight'), state('choose'), h, reviewBlocked(fakeDoc([notShown()])));
    expect(h.gotIt).toHaveBeenCalledTimes(1);
  });

  it('keys do nothing while an aria-modal pop-up is open', () => {
    const h = handlers();
    dispatchReviewKey(key('ArrowRight'), state('choose'), h, reviewBlocked(fakeDoc([shown()])));
    expect(h.gotIt).not.toHaveBeenCalled();
  });
});

describe('targetKind', () => {
  const el = (tagName, extra = {}) => ({ tagName, getAttribute: () => null, ...extra });
  it('sorts where the key was pressed', () => {
    expect(targetKind(el('INPUT'))).toBe('editable');
    expect(targetKind(el('TEXTAREA'))).toBe('editable');
    expect(targetKind(el('DIV', { isContentEditable: true }))).toBe('editable');
    expect(targetKind(el('BUTTON'))).toBe('control');
    expect(targetKind(el('A'))).toBe('control');
    expect(targetKind(el('DIV', { getAttribute: (n) => (n === 'role' ? 'switch' : null) }))).toBe('control');
    expect(targetKind(el('DIV'))).toBe('page');
    expect(targetKind(el('CANVAS'))).toBe('page');
    expect(targetKind(el('BODY'))).toBe('page');
    expect(targetKind(null)).toBe('page');
  });
});

describe('keyboard hints', () => {
  it('a key outside a text field means a real keyboard (the iPad\'s on-screen one needs a text field)', () => {
    expect(isPhysicalKey(key('ArrowRight'), 'page')).toBe(true);
    expect(isPhysicalKey(key('a'), 'editable')).toBe(false);
    expect(isPhysicalKey(key('ArrowRight', { repeat: true }), 'page')).toBe(false);
  });

  it('on from the start with a mouse or trackpad, else once remembered for this tab', () => {
    const store = {};
    const sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
    expect(initialKeyHints({ matchMedia: () => ({ matches: true }), sessionStorage })).toBe(true);
    const touch = { matchMedia: () => ({ matches: false }), sessionStorage };
    expect(initialKeyHints(touch)).toBe(false);
    rememberKeyHints(touch);
    expect(store[KEY_HINTS_STORAGE]).toBe('1');
    expect(initialKeyHints(touch)).toBe(true);
  });

  it('blocked storage never throws', () => {
    const broken = { matchMedia: () => ({ matches: false }), get sessionStorage() { throw new Error('blocked'); } };
    expect(initialKeyHints(broken)).toBe(false);
    expect(() => rememberKeyHints(broken)).not.toThrow();
    expect(initialKeyHints(undefined)).toBe(false);
  });

  it('keycaps use ↵, not the word Enter', () => {
    expect(KEY_HINTS.flip).toBe('↵');
    expect(KEY_HINTS.next).toBe('↵');
    expect(Object.values(KEY_HINTS).join('')).not.toMatch(/Enter|Return/);
  });
});

describe('scheduleFocus (続けて復習する on the 全部クリア panel)', () => {
  it('focuses only when keyboard hints are on, and only after the delay', () => {
    vi.useFakeTimers();
    try {
      const focus = vi.fn();
      scheduleFocus(true, focus);
      vi.advanceTimersByTime(CONTINUE_FOCUS_DELAY_MS - 1);
      expect(focus).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(focus).toHaveBeenCalledTimes(1);

      const off = vi.fn();
      scheduleFocus(false, off);
      vi.advanceTimersByTime(CONTINUE_FOCUS_DELAY_MS * 2);
      expect(off).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a panel that goes away before the delay (undo) cancels the focus', () => {
    vi.useFakeTimers();
    try {
      const focus = vi.fn();
      const cancel = scheduleFocus(true, focus);
      cancel();
      vi.advanceTimersByTime(CONTINUE_FOCUS_DELAY_MS * 2);
      expect(focus).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
