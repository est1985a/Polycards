// Tests for the card report rules (pure). Run with: npm test
import { describe, it, expect } from 'vitest';
import { REPORT_REASONS, screenshotDefault, showsAnswerField, reportedAnswer, fitWithin, ANSWER_MAX } from './cardReports';
import ja from '../i18n/ja';
import en from '../i18n/en';
import { readFileSync } from 'node:fs';

describe('card report reasons', () => {
  it('are the 9 keys of the SQL CHECK, in the order the sheet shows them', () => {
    expect(REPORT_REASONS).toEqual(['spelling', 'meaning', 'example', 'accept_answer', 'handwriting', 'audio', 'pos', 'display', 'other']);
    const sql = readFileSync(new URL('../../supabase/polycards-card-reports.sql', import.meta.url), 'utf8');
    for (const key of REPORT_REASONS) expect(sql).toContain(`'${key}'`);
  });

  it('each have a name in both languages', () => {
    for (const key of REPORT_REASONS) {
      expect(ja[`report.reason.${key}`]).toBeTruthy();
      expect(en[`report.reason.${key}`]).toBeTruthy();
    }
    expect(ja['report.reason.accept_answer']).toBe('わたしの答えも正しいはず');
    expect(en['report.reason.handwriting']).toBe('Handwriting not recognized correctly');
  });

  it('tick the screenshot box only for display, other and handwriting', () => {
    expect(REPORT_REASONS.filter(screenshotDefault)).toEqual(['handwriting', 'display', 'other']);
    expect(screenshotDefault(null)).toBe(false);
  });

  it('ask for the answer only for accept_answer and handwriting', () => {
    expect(REPORT_REASONS.filter(showsAnswerField)).toEqual(['accept_answer', 'handwriting']);
  });
});

describe('reportedAnswer (the pre-filled answer)', () => {
  it('is empty in tap mode (nothing typed)', () => {
    expect(reportedAnswer(null, '', 'cat')).toBe('');
  });
  it('is what was typed (trimmed) in typing mode', () => {
    expect(reportedAnswer({ spelling: 'wrong' }, '  colour ', 'color')).toBe('colour');
  });
  it('is what the model read for a wrong handwriting answer', () => {
    expect(reportedAnswer({ handwriting: { allCorrect: false, text: 'flsh' } }, 'flsh', 'fish')).toBe('flsh');
  });
  it('is the accepted word for a right handwriting answer', () => {
    expect(reportedAnswer({ handwriting: { allCorrect: true, accepted: null } }, '', 'fish')).toBe('fish');
    expect(reportedAnswer({ handwriting: { allCorrect: true, accepted: 'cute' } }, '', 'pretty')).toBe('cute');
  });
  it('is cut to 100 characters (the database limit)', () => {
    expect(reportedAnswer({ spelling: 'wrong' }, 'a'.repeat(150), 'x')).toHaveLength(ANSWER_MAX);
  });
});

describe('fitWithin (screenshot size)', () => {
  it('keeps a small picture as it is', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it('makes a wide picture 1200 px wide, keeping its shape', () => {
    expect(fitWithin(2360, 1640)).toEqual({ width: 1200, height: 834 });
  });
  it('limits a very tall photo to 2400 px tall', () => {
    expect(fitWithin(1000, 6000)).toEqual({ width: 400, height: 2400 });
  });
  it('gives 0 for an empty picture', () => {
    expect(fitWithin(0, 100)).toEqual({ width: 0, height: 0 });
  });
});
