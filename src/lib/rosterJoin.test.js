// Tests for the student's pre-filled roster pop-up steps. Run with: npm test
import { describe, it, expect } from 'vitest';
import { rosterJoinStart, rosterJoinNext, rosterJoinClass } from './rosterJoin';

describe('rosterJoin', () => {
  it('nothing joined → no pop-up', () => {
    expect(rosterJoinStart([])).toBeNull();
    expect(rosterJoinStart(null)).toBeNull();
    expect(rosterJoinStart([{ id: 'c1', name: 'A', needs_nickname: false }])).toBeNull();
  });

  it('one class: joined → nickname → done', () => {
    let s = rosterJoinStart([{ id: 'c1', name: '1年A組', needs_nickname: true }]);
    expect(s.step).toBe('joined');
    expect(rosterJoinClass(s)).toEqual({ id: 'c1', name: '1年A組' });
    s = rosterJoinNext(s);
    expect(s.step).toBe('nickname');
    expect(rosterJoinClass(s).id).toBe('c1');
    expect(rosterJoinNext(s)).toBeNull();
  });

  it('several classes, one after another (a class listed twice once)', () => {
    let s = rosterJoinStart([
      { id: 'c1', name: 'A', needs_nickname: true },
      { id: 'c2', name: 'B', needs_nickname: true },
      { id: 'c1', name: 'A', needs_nickname: true },
    ]);
    const seen = [];
    while (s) {
      seen.push(`${rosterJoinClass(s).name}:${s.step}`);
      s = rosterJoinNext(s);
    }
    expect(seen).toEqual(['A:joined', 'A:nickname', 'B:joined', 'B:nickname']);
  });

  it('no state → nothing', () => {
    expect(rosterJoinNext(null)).toBeNull();
    expect(rosterJoinClass(null)).toBeNull();
  });
});
