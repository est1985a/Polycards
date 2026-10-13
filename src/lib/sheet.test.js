// Tests for the pop-up closing rule. Run with: npm test
import { describe, it, expect } from 'vitest';
import { shouldCloseSheet } from './sheet';

describe('closing the review plan pop-up', () => {
  it('closes on Escape', () => {
    expect(shouldCloseSheet({ type: 'keydown', key: 'Escape' })).toBe(true);
  });

  it('ignores other keys', () => {
    expect(shouldCloseSheet({ type: 'keydown', key: 'Enter' })).toBe(false);
    expect(shouldCloseSheet({ type: 'keydown', key: 'Tab' })).toBe(false);
  });

  it('closes on a tap on the backdrop, but not on a tap inside the box', () => {
    const backdrop = {};
    expect(shouldCloseSheet({ type: 'click', target: backdrop, currentTarget: backdrop })).toBe(true);
    expect(shouldCloseSheet({ type: 'click', target: {}, currentTarget: backdrop })).toBe(false);
  });
});
