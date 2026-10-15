// Is the screen wide (landscape iPad or bigger)? Used to switch between the phone and wide layouts.
import { useSyncExternalStore } from 'react';

export const WIDE_QUERY = '(min-width: 900px)';

// False when there is no browser window or no matchMedia (tests, server rendering).
export function isWide(win = typeof window === 'undefined' ? undefined : window) {
  if (!win || typeof win.matchMedia !== 'function') return false;
  return win.matchMedia(WIDE_QUERY).matches;
}

function subscribe(onChange) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

// true on wide screens; updates when the screen is rotated or resized.
export function useWide() {
  return useSyncExternalStore(subscribe, () => isWide(), () => false);
}
