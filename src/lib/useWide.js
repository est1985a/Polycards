// Is the screen wide (landscape iPad or bigger)? Used to switch between the phone and wide layouts.
import { useSyncExternalStore } from 'react';

export const WIDE_QUERY = '(min-width: 900px)';

// Room for the review's "previous card" chip beside the 780 px study column: a chip up to 150 px
// wide + a 16 px gap + 16 px from the screen edge on each side = 780 + 2 × 182 = 1144, rounded up.
export const SIDE_CHIP_QUERY = '(min-width: 1150px)';

// A short screen (a landscape iPad with the browser bars showing is about 650–700 px tall): the review
// tightens its spacing, buttons and handwriting boxes so the card and its buttons fit without scrolling.
export const SHORT_QUERY = '(max-height: 820px)';

// Does the screen match a media query? False when there is no browser window or no matchMedia
// (tests, server rendering).
export function matches(query, win = typeof window === 'undefined' ? undefined : window) {
  if (!win || typeof win.matchMedia !== 'function') return false;
  return win.matchMedia(query).matches;
}

export function isWide(win = typeof window === 'undefined' ? undefined : window) {
  return matches(WIDE_QUERY, win);
}

function subscribeTo(query) {
  return (onChange) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  };
}

const subscribers = {};

// true while the screen matches the query; updates when the screen is rotated or resized.
export function useMedia(query) {
  subscribers[query] ??= subscribeTo(query);
  return useSyncExternalStore(subscribers[query], () => matches(query), () => false);
}

// true on wide screens.
export function useWide() {
  return useMedia(WIDE_QUERY);
}

// true when the "previous card" chip fits beside the study card.
export function useSideChip() {
  return useMedia(SIDE_CHIP_QUERY);
}

// true on short screens (see SHORT_QUERY).
export function useShort() {
  return useMedia(SHORT_QUERY);
}
