// Tests for the pen debug overlay (?debugpen=1) and the read timeout. Run with: npm test
import { describe, it, expect } from 'vitest';
import { boxPosition, eventDelay, penDebugEnabled, penDebugLines, penLog } from './penDebug.js';
import { withTimeout } from './model.js';

describe('pen debug overlay', () => {
  it('is off unless the address asks for it (and logging then does nothing)', () => {
    expect(penDebugEnabled()).toBe(false);
    expect(() => penLog({ model: 'ready' })).not.toThrow();
  });

  it('gives the position inside the box in px and as a share of the box', () => {
    const p = boxPosition({ clientX: 150, clientY: 230 }, { left: 100, top: 200, width: 100, height: 120 });
    expect(p).toEqual({ x: 50, y: 30, fx: 0.5, fy: 0.25 });
  });

  it('gives no delay for an event without a usable time stamp', () => {
    expect(eventDelay({})).toBe(null);
    expect(eventDelay({ timeStamp: 0 })).toBe(null);
  });

  it('shows the pen-down, cancels, model, last read and the browser', () => {
    const lines = penDebugLines({
      down: { pointerType: 'pen', x: 40, y: 12, fx: 0.4, fy: 0.1, accepted: false, reason: 'box locked', delay: 850 },
      cancels: 2, lastCancel: 'pen, after 3 points',
      model: 'ready', backend: 'webgl', modelMs: 4200,
      recognition: { ms: 60, result: 'box 1: read "b" pass' },
    }, 'iPad Safari');
    expect(lines[0]).toBe('down: pen x=40 y=12 (40% across, 10% down) REJECTED - box locked, 850 ms late');
    expect(lines[1]).toBe('pointercancel: 2 (last: pen, after 3 points)');
    expect(lines[2]).toBe('model: ready [webgl] 4200 ms');
    expect(lines[3]).toBe('recognition: 60 ms - box 1: read "b" pass');
    expect(lines[4]).toBe('ua: iPad Safari');
  });

  it('shows a failed read and an empty start', () => {
    const lines = penDebugLines({ cancels: 0, model: 'error', modelError: 'no WebGL', recognition: { ms: 15000, error: 'timeout' } });
    expect(lines[0]).toBe('down: none yet');
    expect(lines[2]).toBe('model: error - no WebGL');
    expect(lines[3]).toBe('recognition: 15000 ms - ERROR timeout');
  });
});

describe('withTimeout', () => {
  it('passes a quick result through', async () => {
    await expect(withTimeout(Promise.resolve(7), 50)).resolves.toBe(7);
  });

  it('gives up on a read that never finishes', async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toThrow('timeout');
  });
});
