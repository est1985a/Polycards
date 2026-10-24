-- Polycards: trouble words for the stats page (2026-10-24)
--
-- Adds ONE read-only function. It changes no tables and no data.
--
-- my_trouble_words() lists the signed-in student's most-missed words:
--   * counts first answers marked まだ or わからない (not the repeats inside a session)
--   * over the last 30 days (p_days)
--   * a word needs 2 or more misses to appear (p_min_misses)
--   * both directions of a word are added together into one row
--   * only words still in My Cards and not yet Mastered in both directions
--   * top 10 (p_limit), most misses first, then most recently missed
--
-- It runs as the student (security invoker), so the normal row-level security
-- applies: a student can only ever see their own answers and cards.
-- Safe to run again (create or replace).

create or replace function public.my_trouble_words(
  p_days       int default 30,
  p_min_misses int default 2,
  p_limit      int default 10
)
returns table (
  word_id      uuid,
  english      text,
  japanese     text,
  misses       int,
  last_missed  timestamptz,
  lowest_level int
)
language sql
stable
security invoker
set search_path = public
as $$
  with missed as (
    select a.word_id,
           count(*)::int      as misses,
           max(a.answered_at) as last_missed
    from public.answer_log a
    where a.user_id = auth.uid()
      and a.is_repeat = false
      and a.result in ('not_yet', 'dont_know')
      and a.answered_at > now() - make_interval(days => greatest(least(p_days, 365), 1))
    group by a.word_id
    having count(*) >= greatest(p_min_misses, 1)
  ),
  cards as (
    select c.word_id, min(c.level)::int as lowest_level
    from public.user_cards c
    where c.user_id = auth.uid()
    group by c.word_id
  )
  select m.word_id, w.english, w.japanese, m.misses, m.last_missed, c.lowest_level
  from missed m
  join cards c        on c.word_id = m.word_id
  join public.words w on w.id = m.word_id
  where c.lowest_level < 8
  order by m.misses desc, m.last_missed desc
  limit greatest(least(p_limit, 50), 1);
$$;

revoke all on function public.my_trouble_words(int, int, int) from public, anon;
grant execute on function public.my_trouble_words(int, int, int) to authenticated;

-- Check it worked (should list the function once):
-- select proname from pg_proc where proname = 'my_trouble_words';
