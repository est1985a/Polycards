// Teacher area, Phase 3: the honesty hint (答え方のようす) on the student page and the flag in the class
// overview. Pure functions. Teacher-only: nothing here is ever shown to students.
//
// The database (honesty_counts_for() in supabase/polycards-teacher-phase3.sql) only counts; every
// threshold lives here, so tuning never needs SQL. Counts cover HONESTY.days Japan days, first answers
// only, Japanese → English cards only:
//   tap_answers / tap_got_it        tap-mode まだ + わかった / わかった
//   typed_answers / typed_correct   typing + handwriting answers (わからない included) / correct spelling
//                                   (spelling = 'exact': the main word or an accepted alternate)
//   timed_got_it / fast_got_it      tap わかった with a recorded time / flipped in under HONESTY.fastMs
// Times are only recorded since Phase 3, so the speed part shows データ不足 until enough exist.

export const HONESTY = {
  days: 30,            // period of the hint (Japan days)
  minTapAnswers: 30,   // tap answers needed before the gap is shown
  minTypedAnswers: 30, // typing / handwriting answers needed before the gap is shown
  gapPoints: 30,       // flag when tap わかった % − spelling correct % is at least this
  fastMs: 1000,        // "fast" = the card was flipped less than this after it appeared
  minTimedGotIt: 30,   // timed tap わかった needed before the speed share is shown
  fastShare: 50,       // flag when at least this % of timed tap わかった were fast
};

const count = (counts, key) => Math.max(0, Number(counts?.[key]) || 0);
const percent = (part, whole) => (whole > 0 ? Math.round((100 * part) / whole) : null);

// counts (from class_overview's honesty or student_honesty) → what the page shows.
// gap:   { enough, tapAnswers, typedAnswers, tapRate, typedRate, points, flagged }
// speed: { enough, timed, fast, share, flagged }
// Rates are whole percents; the flag uses the same rounded numbers the teacher sees.
export function honestyView(counts) {
  const tapAnswers = count(counts, 'tap_answers');
  const typedAnswers = count(counts, 'typed_answers');
  const tapRate = percent(count(counts, 'tap_got_it'), tapAnswers);
  const typedRate = percent(count(counts, 'typed_correct'), typedAnswers);
  const gapEnough = tapAnswers >= HONESTY.minTapAnswers && typedAnswers >= HONESTY.minTypedAnswers;
  const points = gapEnough ? tapRate - typedRate : null;

  const timed = count(counts, 'timed_got_it');
  const fast = Math.min(count(counts, 'fast_got_it'), timed);
  const speedEnough = timed >= HONESTY.minTimedGotIt;
  const share = speedEnough ? percent(fast, timed) : null;

  const gap = { enough: gapEnough, tapAnswers, typedAnswers, tapRate, typedRate, points, flagged: gapEnough && points >= HONESTY.gapPoints };
  const speed = { enough: speedEnough, timed, fast, share, flagged: speedEnough && share >= HONESTY.fastShare };
  return { gap, speed, flagged: gap.flagged || speed.flagged };
}
