// Tests for the honesty hint thresholds (teacher-only). Pure, never touches the database. Run with: npm test
import { describe, it, expect } from 'vitest';
import { HONESTY, honestyView } from './honesty';

const counts = (c) => ({
  tap_answers: 0, tap_got_it: 0, typed_answers: 0, typed_correct: 0, timed_got_it: 0, fast_got_it: 0, ...c,
});

describe('honestyView: tap vs spelling gap', () => {
  it('says データ不足 until both kinds have enough answers', () => {
    expect(honestyView(counts({ tap_answers: 29, tap_got_it: 29, typed_answers: 100 })).gap.enough).toBe(false);
    expect(honestyView(counts({ tap_answers: 100, tap_got_it: 100, typed_answers: 29 })).gap.enough).toBe(false);
    const ok = honestyView(counts({ tap_answers: 30, tap_got_it: 30, typed_answers: 30, typed_correct: 30 })).gap;
    expect(ok.enough).toBe(true);
    expect(ok.points).toBe(0);
    expect(ok.flagged).toBe(false);
  });

  it('flags a gap of exactly the threshold, not one point less', () => {
    // 100% tap vs 70% spelling = 30 points
    expect(honestyView(counts({ tap_answers: 40, tap_got_it: 40, typed_answers: 40, typed_correct: 28 })).gap).toMatchObject({ tapRate: 100, typedRate: 70, points: 30, flagged: true });
    // 100% vs 71% (rounded from 71.4) = 29 points
    expect(honestyView(counts({ tap_answers: 35, tap_got_it: 35, typed_answers: 35, typed_correct: 25 })).gap).toMatchObject({ points: 29, flagged: false });
  });

  it('never flags when spelling is better than tapping', () => {
    expect(honestyView(counts({ tap_answers: 50, tap_got_it: 20, typed_answers: 50, typed_correct: 50 })).gap.flagged).toBe(false);
  });
});

describe('honestyView: fast わかった', () => {
  it('says データ不足 until there are enough timed answers', () => {
    const v = honestyView(counts({ timed_got_it: HONESTY.minTimedGotIt - 1, fast_got_it: 29 })).speed;
    expect(v).toMatchObject({ enough: false, share: null, flagged: false });
  });

  it('flags at 50% fast, not below', () => {
    expect(honestyView(counts({ timed_got_it: 40, fast_got_it: 20 })).speed).toMatchObject({ share: 50, flagged: true });
    expect(honestyView(counts({ timed_got_it: 40, fast_got_it: 19 })).speed).toMatchObject({ share: 48, flagged: false });
  });

  it('is flagged overall when either part is', () => {
    expect(honestyView(counts({ timed_got_it: 40, fast_got_it: 40 })).flagged).toBe(true);
    expect(honestyView(counts({})).flagged).toBe(false);
  });

  it('copes with missing or odd counts', () => {
    const v = honestyView(null);
    expect(v.flagged).toBe(false);
    expect(v.gap.tapAnswers).toBe(0);
    expect(honestyView(counts({ timed_got_it: 30, fast_got_it: 99 })).speed.fast).toBe(30);
  });
});
