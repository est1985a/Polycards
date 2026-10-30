-- =====================================================================
-- Polycards: teacher area Phase 3 — class overview, class trouble words, honesty hint (2026-10-30)
-- Run AFTER polycards-teacher-phase2.sql, BEFORE deploying the app code. Safe to run twice.
--   * answer_log gets 3 new columns, filled from now on by record_answer (old rows stay NULL):
--     answer_mode ('tap' | 'typing' | 'handwriting'), reveal_ms (card shown → flipped, tap only),
--     answer_ms (card shown → answer button). The student sees no change.
--   * Three teacher-only, read-only functions: class_overview, class_trouble_words, student_honesty.
--     Only aggregates leave the database, never answer_log rows.
-- =====================================================================

-- 0. New answer_log columns
alter table public.answer_log add column if not exists answer_mode text;
alter table public.answer_log add column if not exists reveal_ms int;
alter table public.answer_log add column if not exists answer_ms int;
alter table public.answer_log drop constraint if exists answer_log_answer_mode_check;
alter table public.answer_log add constraint answer_log_answer_mode_check
  check (answer_mode is null or answer_mode in ('tap', 'typing', 'handwriting'));

-- 1. record_answer: the live definition (checked with pg_get_functiondef on 2026-10-30; the same as
--    polycards-alt-answers.sql) plus p_mode / p_reveal_ms / p_answer_ms (all optional, marked "Phase 3").
--    The 5-argument version is dropped first (two versions would make the app's call ambiguous).
--    A bad mode or a time outside 0 ms – 1 hour is stored as NULL, never an error (an answer is never lost).
drop function if exists public.record_answer(uuid, text, text, uuid, text);
create or replace function public.record_answer(
  p_word_id    uuid,
  p_direction  text,
  p_result     text,
  p_session_id uuid,
  p_typed      text default null,
  p_mode       text default null,   -- Phase 3: 'tap' | 'typing' | 'handwriting'
  p_reveal_ms  int  default null,   -- Phase 3: card shown → flipped (tap), in ms
  p_answer_ms  int  default null    -- Phase 3: card shown → answer button, in ms
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_card     public.user_cards;
  v_hours    int[] := public.study_level_hours();
  v_mastered int := array_length(public.study_level_hours(), 1);   -- 8
  v_result   text := p_result;
  v_typed    text;
  v_english  text;
  v_alts     text[];                                            -- alt_answers
  v_spelling text;
  v_exact    boolean := false;
  v_repeat   boolean;
  v_start    int;
  v_misses   int;
  v_new      int;
  v_bonus    int := 0;
  v_first    int;
  v_day      date := (now() at time zone 'Asia/Tokyo')::date;
  v_total    int;
  -- Phase 3: a bad mode or a time outside 0 ms – 1 hour is saved as NULL, never an error.
  v_mode     text := case when p_mode in ('tap', 'typing', 'handwriting') then p_mode end;
  v_reveal   int  := case when p_reveal_ms between 0 and 3600000 then p_reveal_ms end;
  v_answerms int  := case when p_answer_ms between 0 and 3600000 then p_answer_ms end;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if p_result is null or p_result not in ('got_it', 'not_yet', 'dont_know')
     or p_direction is null or p_direction not in ('en2jp', 'jp2en')
     or p_session_id is null then
    raise exception 'bad_answer';
  end if;

  -- Lock the card so a double tap can't be counted twice.
  select * into v_card from public.user_cards c
  where c.user_id = v_user and c.word_id = p_word_id and c.direction = p_direction
  for update;
  if not found then raise exception 'card_not_found'; end if;

  -- Already answered in this session = a まだ card coming back.
  select min(l.id) into v_first from public.answer_log l
  where l.user_id = v_user and l.session_id = p_session_id
    and l.word_id = p_word_id and l.direction = p_direction;
  v_repeat := v_first is not null;

  -- A first answer is only allowed on a card that is due.
  if not v_repeat and (v_card.level >= v_mastered
                       or v_card.next_review_at is null
                       or v_card.next_review_at > now()) then
    raise exception 'not_due';
  end if;

  -- Typing (Japanese → English cards only). A correct spelling always counts as わかった.
  v_typed := nullif(btrim(left(p_typed, 200)), '');
  if v_typed is not null and p_direction = 'jp2en' then
    select w.english, w.alt_answers into v_english, v_alts               -- alt_answers
    from public.words w where w.id = p_word_id;
    v_spelling := public.spelling_check(v_typed, v_english, v_alts);  -- alt_answers
    v_exact := v_spelling = 'exact';
    if v_exact then v_result := 'got_it'; end if;
  else
    v_typed := null;
  end if;

  -- Level at the start of this session.
  if v_repeat then
    select l.level_before into v_start from public.answer_log l where l.id = v_first;
  else
    v_start := v_card.level;
  end if;

  -- New level (same as levelAfterCorrect / levelAfterWrong in src/lib/srs.js).
  if v_result = 'got_it' then
    if v_repeat then
      v_new := v_card.level;                       -- a card missed earlier doesn't move up again
    else
      v_new := least(v_card.level + 1, v_mastered);
    end if;
  else
    select count(*) + 1 into v_misses from public.answer_log l
    where l.user_id = v_user and l.session_id = p_session_id
      and l.word_id = p_word_id and l.direction = p_direction
      and l.result <> 'got_it';
    if v_start <= 0 then
      v_new := 0;
    else
      v_new := greatest(1, v_start - ceil(v_misses / 2.0)::int
                                     * (case when v_start >= 5 then 2 else 1 end));
    end if;
  end if;

  -- Save the card (a correct repeat changes nothing, same as before).
  if not (v_repeat and v_result = 'got_it') then
    update public.user_cards c
    set level          = v_new,
        next_review_at = case when v_new >= v_mastered then null
                              else now() + make_interval(hours => v_hours[v_new + 1]) end,
        mastered_at    = case when v_new >= v_mastered then now() else null end,
        updated_at     = now()
    where c.user_id = v_user and c.word_id = p_word_id and c.direction = p_direction;
  end if;

  -- Spelling bonus: first answer only.
  if v_exact and not v_repeat then
    v_bonus := public.study_setting('spelling_bonus')::int;
  end if;

  insert into public.answer_log
    (user_id, session_id, word_id, direction, result, is_repeat, typed, typed_answer,
     spelling, level_before, level_after, bonus_points, answer_mode, reveal_ms, answer_ms)
  values
    (v_user, p_session_id, p_word_id, p_direction, v_result, v_repeat, v_typed is not null, v_typed,
     v_spelling, v_card.level, v_new, v_bonus, v_mode, v_reveal, v_answerms);

  insert into public.user_study_daily as d
    (user_id, day, reviews, got_it, not_yet, dont_know, repeats, typed, spelled_correctly, bonus_points)
  values (v_user, v_day,
    (not v_repeat)::int,
    (not v_repeat and v_result = 'got_it')::int,
    (not v_repeat and v_result = 'not_yet')::int,
    (not v_repeat and v_result = 'dont_know')::int,
    v_repeat::int,
    (not v_repeat and v_typed is not null)::int,
    (not v_repeat and v_exact)::int,
    v_bonus)
  on conflict (user_id, day) do update set
    reviews = d.reviews + excluded.reviews, got_it = d.got_it + excluded.got_it,
    not_yet = d.not_yet + excluded.not_yet, dont_know = d.dont_know + excluded.dont_know,
    repeats = d.repeats + excluded.repeats, typed = d.typed + excluded.typed,
    spelled_correctly = d.spelled_correctly + excluded.spelled_correctly,
    bonus_points = d.bonus_points + excluded.bonus_points;

  insert into public.user_study_totals as t
    (user_id, reviews, got_it, not_yet, dont_know, repeats, typed, spelled_correctly, bonus_points)
  values (v_user,
    (not v_repeat)::int,
    (not v_repeat and v_result = 'got_it')::int,
    (not v_repeat and v_result = 'not_yet')::int,
    (not v_repeat and v_result = 'dont_know')::int,
    v_repeat::int,
    (not v_repeat and v_typed is not null)::int,
    (not v_repeat and v_exact)::int,
    v_bonus)
  on conflict (user_id) do update set
    reviews = t.reviews + excluded.reviews, got_it = t.got_it + excluded.got_it,
    not_yet = t.not_yet + excluded.not_yet, dont_know = t.dont_know + excluded.dont_know,
    repeats = t.repeats + excluded.repeats, typed = t.typed + excluded.typed,
    spelled_correctly = t.spelled_correctly + excluded.spelled_correctly,
    bonus_points = t.bonus_points + excluded.bonus_points,
    updated_at = now()
  returning t.bonus_points into v_total;

  return jsonb_build_object(
    'result', v_result,
    'is_repeat', v_repeat,
    'level_before', v_card.level,
    'level_after', v_new,
    'mastered', v_new >= v_mastered,
    'spelling', v_spelling,
    'bonus_points', v_bonus,
    'bonus_total', v_total
  );
end;
$$;
revoke execute on function public.record_answer(uuid, text, text, uuid, text, text, int, int) from public, anon, authenticated;
grant execute on function public.record_answer(uuid, text, text, uuid, text, text, int, int) to authenticated;


-- 2. Internal helpers (not callable from the app)

-- First Japan date of a period of p_days days that ends today (7 → today and the 6 days before). 1–365.
create or replace function public.jst_period_start(p_days int)
returns date language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Tokyo')::date - (greatest(least(coalesce(p_days, 7), 365), 1) - 1) $$;

-- Current streak, same rule as currentStreak() in src/lib/studyStats.js: consecutive Japan days with
-- reviews, ending today, or ending yesterday when today has no reviews yet.
create or replace function public.study_streak_for(p_user uuid)
returns int language sql stable security definer set search_path = ''
as $$
  with s as (
    select case when exists (select 1 from public.user_study_daily d
                             where d.user_id = p_user and d.reviews > 0
                               and d.day = (now() at time zone 'Asia/Tokyo')::date)
                then (now() at time zone 'Asia/Tokyo')::date
                else (now() at time zone 'Asia/Tokyo')::date - 1 end as start_day
  )
  select count(*)::int
  from (select d.day, row_number() over (order by d.day desc) as rn
        from public.user_study_daily d, s
        where d.user_id = p_user and d.reviews > 0 and d.day <= s.start_day) x, s
  where x.day = s.start_day - (x.rn - 1)::int
$$;

-- Honesty counts for one student over p_days Japan days, first answers only. Counts only; the
-- thresholds live in the app (src/lib/honesty.js). Old rows have no answer_mode, so it is inferred:
-- typed text or わからない = typing / handwriting, anything else = tap.
create or replace function public.honesty_counts_for(p_user uuid, p_days int default 30, p_fast_ms int default 1000)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with a as (
    select l.direction, l.result, l.spelling, l.reveal_ms,
           coalesce(l.answer_mode, case when l.typed or l.result = 'dont_know' then 'typing' else 'tap' end) as mode
    from public.answer_log l
    where l.user_id = p_user and l.is_repeat = false
      and l.answered_at >= (public.jst_period_start(p_days)::timestamp at time zone 'Asia/Tokyo')
  )
  select jsonb_build_object(
    'tap_answers',   count(*) filter (where mode = 'tap'  and direction = 'jp2en'),
    'tap_got_it',    count(*) filter (where mode = 'tap'  and direction = 'jp2en' and result = 'got_it'),
    'typed_answers', count(*) filter (where mode <> 'tap' and direction = 'jp2en'),
    'typed_correct', count(*) filter (where mode <> 'tap' and direction = 'jp2en' and spelling = 'exact'),
    'timed_got_it',  count(*) filter (where mode = 'tap' and direction = 'jp2en' and result = 'got_it'
                                        and reveal_ms is not null),
    'fast_got_it',   count(*) filter (where mode = 'tap' and direction = 'jp2en' and result = 'got_it'
                                        and reveal_ms < greatest(coalesce(p_fast_ms, 1000), 0)))
  from a
$$;

revoke execute on function public.jst_period_start(int), public.study_streak_for(uuid),
  public.honesty_counts_for(uuid, int, int) from public, anon, authenticated;


-- 3. Teacher: the whole class in one call (archived classes included). Period = p_days Japan days.
--    Honesty counts always cover p_honesty_days (the app sends 30).
create or replace function public.class_overview(p_class_id uuid, p_days int default 7,
                                                 p_fast_ms int default 1000, p_honesty_days int default 30)
returns table (student_id uuid, real_name text, student_number int, display_name text,
               last_studied_at timestamptz, reviews int, study_days int, streak int,
               player_level int, cards int, tickets int, honesty jsonb)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_from date := public.jst_period_start(p_days);
begin
  perform public.require_class_teacher(p_class_id);
  return query
    select m.student_id, m.real_name, m.student_number, public.user_display_name(m.student_id),
           (select max(a.answered_at) from public.answer_log a where a.user_id = m.student_id),
           coalesce(d.reviews, 0), coalesce(d.study_days, 0),
           public.study_streak_for(m.student_id),
           public.gacha_player_level(m.student_id),
           (select count(*)::int from public.user_cards c where c.user_id = m.student_id),
           coalesce(public.gacha_tickets_available(m.student_id), 0),
           public.honesty_counts_for(m.student_id, p_honesty_days, p_fast_ms)
    from public.class_members m
    left join lateral (
      select sum(x.reviews)::int as reviews, (count(*) filter (where x.reviews > 0))::int as study_days
      from public.user_study_daily x
      where x.user_id = m.student_id and x.day >= v_from
    ) d on true
    where m.class_id = p_class_id
    order by m.student_number nulls last, m.real_name;
end;
$$;

-- 4. Teacher: words the class missed most in the period (first answers, まだ / わからない), counting only
--    words the student still has below Mastered in at least one direction (like trouble_words_for).
--    Any miss counts (trouble_words_for needs 2 per student; here the class total does the sorting).
--    students: who missed it [{ student_id, real_name, student_number, misses }].
create or replace function public.class_trouble_words(p_class_id uuid, p_days int default 7, p_limit int default 20)
returns table (word_id uuid, english text, japanese text, pos text,
               student_count int, misses int, students jsonb)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_from timestamptz := public.jst_period_start(p_days)::timestamp at time zone 'Asia/Tokyo';
begin
  perform public.require_class_teacher(p_class_id);
  return query
    with members as (
      select m.student_id, m.real_name, m.student_number
      from public.class_members m where m.class_id = p_class_id
    ),
    missed as (
      select a.user_id, a.word_id, count(*)::int as n
      from public.answer_log a
      join members s on s.student_id = a.user_id
      where a.is_repeat = false and a.result in ('not_yet', 'dont_know') and a.answered_at >= v_from
      group by a.user_id, a.word_id
    ),
    still as (
      select x.* from missed x
      where (select min(c.level) from public.user_cards c
             where c.user_id = x.user_id and c.word_id = x.word_id) < 8
    )
    select w.id, w.english, w.japanese, w.pos, count(*)::int, sum(x.n)::int,
           jsonb_agg(jsonb_build_object('student_id', s.student_id, 'real_name', s.real_name,
                                        'student_number', s.student_number, 'misses', x.n)
                     order by x.n desc, s.student_number nulls last, s.real_name)
    from still x
    join members s on s.student_id = x.user_id
    join public.words w on w.id = x.word_id
    group by w.id, w.english, w.japanese, w.pos
    order by count(*) desc, sum(x.n) desc, w.english
    limit greatest(least(coalesce(p_limit, 20), 50), 1);
end;
$$;

-- 5. Teacher: honesty counts for one student of a class I teach (archived included).
create or replace function public.student_honesty(p_class_id uuid, p_student_id uuid,
                                                  p_days int default 30, p_fast_ms int default 1000)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  if not exists (select 1 from public.class_members m
                 where m.class_id = p_class_id and m.student_id = p_student_id) then
    raise exception 'not_member';
  end if;
  return public.honesty_counts_for(p_student_id, p_days, p_fast_ms);
end;
$$;

-- 6. Who may call what
revoke execute on function
  public.class_overview(uuid, int, int, int), public.class_trouble_words(uuid, int, int),
  public.student_honesty(uuid, uuid, int, int)
from public, anon;
grant execute on function
  public.class_overview(uuid, int, int, int), public.class_trouble_words(uuid, int, int),
  public.student_honesty(uuid, uuid, int, int)
to authenticated;

notify pgrst, 'reload schema';
