// Tests for the ticket-award helpers. Run with: npm test
import { describe, it, expect } from 'vitest';
import { clampAmount, cleanAwardMessage, messageLength, messageTooLong, combineAwards, AWARD_MAX } from './awards';

describe('amount and message', () => {
  it('keeps the amount between 1 and 10', () => {
    expect(clampAmount(0)).toBe(1);
    expect(clampAmount(3)).toBe(3);
    expect(clampAmount(11)).toBe(AWARD_MAX);
    expect(clampAmount('x')).toBe(1);
  });

  it('tidies the message; blank = no message', () => {
    expect(cleanAwardMessage('  よく  がんばったね ')).toBe('よく がんばったね');
    expect(cleanAwardMessage('   ')).toBe(null);
    expect(cleanAwardMessage(null)).toBe(null);
  });

  it('counts characters like the database (max 60)', () => {
    expect(messageLength('🎉ok')).toBe(3);
    expect(messageTooLong('あ'.repeat(60))).toBe(false);
    expect(messageTooLong('あ'.repeat(61))).toBe(true);
  });
});

describe('combineAwards', () => {
  it('adds up several awards into one pop-up', () => {
    const c = combineAwards([
      { id: 1, teacher_name: 'アンドレ先生', amount: 3, message: 'よくがんばったね' },
      { id: 2, teacher_name: '山田先生', amount: 1, message: null },
      { id: 3, teacher_name: 'アンドレ先生', amount: 2, message: 'Great job!' },
    ]);
    expect(c.ids).toEqual([1, 2, 3]);
    expect(c.total).toBe(6);
    expect(c.teachers).toEqual(['アンドレ先生', '山田先生']);
    expect(c.messages.map((m) => [m.teacher, m.text])).toEqual([['アンドレ先生', 'よくがんばったね'], ['アンドレ先生', 'Great job!']]);
  });

  it('nothing unseen = nothing to show', () => {
    expect(combineAwards([])).toEqual({ ids: [], total: 0, teachers: [], messages: [] });
  });
});
