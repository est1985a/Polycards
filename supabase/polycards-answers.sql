-- =====================================================================
-- Polycards: answer log, study stats and spelling bonus
-- Run once in the Supabase SQL editor, AFTER polycards-gacha.sql.
--
-- Safe to run on the live database: it only ADDS new tables and
-- functions, and updates one gacha helper so that spelling bonus points
-- count toward rank. The current app keeps working exactly as before
-- until its code is switched over to record_answer().
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Settings in one place (change a number here, then re-run just
--    this function to apply it)
-- ---------------------------------------------------------------------
create or replace function public.study_setting(p_key text)
returns numeric
language sql immutable
set search_path = ''
as $$
  select case p_key
    when 'spelling_bonus'        then 1     -- points for a correctly typed first answer
    when 'answer_log_keep_days'  then 365   -- how long detailed answers are kept (when cleanup is on)
    when 'answer_log_cleanup_on' then 0     -- 0 = cleanup OFF (nothing is ever deleted), 1 = ON
  end
$$;

-- Wait in hours before a card is due again, by the level it just reached.
-- MUST match LEVEL_HOURS in src/lib/srs.js. Mastered = one level above the last entry (8).
create or replace function public.study_level_hours()
returns int[]
language sql immutable
set search_path = ''
as $$
  select array[0, 4, 24, 72, 168, 336, 720, 2880]
$$;


-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

-- One row per answer (every tap of まだ / わかった / わからない in a review).
create table public.answer_log (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid not null,                 -- one review session (made by the app)
  word_id      bigint not null,
  direction    text not null check (direction in ('en2jp', 'jp2en')),
  result       text not null check (result in ('got_it', 'not_yet', 'dont_know')),
  is_repeat    boolean not null,              -- true = a まだ card coming back in the same session
  typed        boolean not null default false,
  typed_answer text,                          -- what the student typed (typing mode only)
  spelling     text check (spelling in ('exact', 'close', 'wrong')),
  level_before int not null,
  level_after  int not null,
  bonus_points int not null default 0,
  answered_at  timestamptz not null default now()
);
create index answer_log_user_time on public.answer_log (user_id, answered_at);
create index answer_log_session   on public.answer_log (user_id, session_id, word_id, direction);
create index answer_log_time      on public.answer_log (answered_at);
alter table public.answer_log enable row level security;
create policy "Read own answers" on public.answer_log
  for select to authenticated using (user_id = auth.uid());

-- Totals per student per day (Japan date). Small, kept forever.
-- reviews = first answers to due cards; got_it + not_yet + dont_know = reviews.
-- repeats = まだ cards answered again in the same session (not counted as reviews).
create table public.user_study_daily (
  user_id           uuid not null references auth.users(id) on delete cascade,
  day               date not null,
  reviews           int not null default 0,
  got_it            int not null default 0,
  not_yet           int not null default 0,
  dont_know         int not null default 0,
  repeats           int not null default 0,
  typed             int not null default 0,
  spelled_correctly int not null default 0,
  bonus_points      int not null default 0,
  primary key (user_id, day)
);
alter table public.user_study_daily enable row level security;
create policy "Read own daily stats" on public.user_study_daily
  for select to authenticated using (user_id = auth.uid());

-- All-time totals per student (same counters). bonus_points feeds rank.
create table public.user_study_totals (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  reviews           int not null default 0,
  got_it            int not null default 0,
  not_yet           int not null default 0,
  dont_know         int not null default 0,
  repeats           int not null default 0,
  typed             int not null default 0,
  spelled_correctly int not null default 0,
  bonus_points      int not null default 0,
  updated_at        timestamptz not null default now()
);
alter table public.user_study_totals enable row level security;
create policy "Read own study totals" on public.user_study_totals
  for select to authenticated using (user_id = auth.uid());

-- Students may only read these tables; only record_answer() writes them.
revoke insert, update, delete, truncate, references, trigger
  on public.answer_log, public.user_study_daily, public.user_study_totals
  from anon, authenticated;
revoke select on public.answer_log, public.user_study_daily, public.user_study_totals from anon;


-- ---------------------------------------------------------------------
-- 3. Spelling check
-- ---------------------------------------------------------------------
-- The app has its own copy of these rules (to show ✓ instantly); the
-- database decides the bonus. Keep both in step.
--
-- Ignored: capitals, extra spaces, full-width letters (Japanese keyboard),
-- curly apostrophes, commas, "..." / "…" / "~" blanks, and punctuation
-- at the start or end (so "Ms" = "Ms." and "how about you" = "How about you?").
-- Words in ( ) or [ ] are optional: "look (at)" accepts "look" and "look at".
create or replace function public.spelling_normalize(p_text text)
returns text
language sql immutable
set search_path = ''
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 lower(normalize(coalesce(p_text, ''), NFKC)),
                 '[’‘`´]', '''', 'g'),
               '(\.\.\.|…|~|〜|,|、)', ' ', 'g'),
             '\s+', ' ', 'g'),
           '^[\s.!?。！？]+|[\s.!?。！？]+$', '', 'g')
$$;

-- Number of small changes between two answers: one letter added, removed or
-- changed, or two letters next to each other swapped ("appel" → "apple") = 1.
create or replace function public.spelling_distance(a text, b text)
returns int
language plpgsql immutable
set search_path = ''
as $$
declare
  la int := char_length(a);
  lb int := char_length(b);
  pprev int[];
  prev int[];
  cur int[];
  i int; j int; cost int; v int;
begin
  if la = 0 then return lb; end if;
  if lb = 0 then return la; end if;
  prev := array(select generate_series(0, lb));
  for i in 1..la loop
    cur := array[i];
    for j in 1..lb loop
      cost := case when substr(a, i, 1) = substr(b, j, 1) then 0 else 1 end;
      v := least(prev[j + 1] + 1, cur[j] + 1, prev[j] + cost);
      if i > 1 and j > 1 and substr(a, i, 1) = substr(b, j - 1, 1)
         and substr(a, i - 1, 1) = substr(b, j, 1) then
        v := least(v, pprev[j - 1] + 1);
      end if;
      cur := cur || v;
    end loop;
    pprev := prev;
    prev := cur;
  end loop;
  return prev[lb + 1];
end;
$$;

-- 'exact' = right (bonus), 'close' = one letter off (おしい), 'wrong' = anything else.
create or replace function public.spelling_check(p_typed text, p_english text)
returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  v_typed text := public.spelling_normalize(left(p_typed, 200));
  v_answers text[];
  v_best int;
begin
  if v_typed = '' then return 'wrong'; end if;
  v_answers := array[
    public.spelling_normalize(regexp_replace(p_english, '[(\[][^)\]]*[)\]]', ' ', 'g')),  -- without ( ) words
    public.spelling_normalize(regexp_replace(p_english, '[()\[\]]', '', 'g'))             -- with them
  ];
  if v_typed = any (v_answers) then return 'exact'; end if;
  select min(public.spelling_distance(v_typed, x)) into v_best
  from unnest(v_answers) x where x <> '';
  if v_best is not null and v_best <= 1 then return 'close'; end if;
  return 'wrong';
end;
$$;


-- ---------------------------------------------------------------------
-- 4. record_answer(): the app calls this for every answer in a review.
--    It works out the new card level (same rules as src/lib/srs.js),
--    checks spelling, gives the bonus, logs the answer and adds to the
--    stats. The gacha review counter still runs automatically.
-- ---------------------------------------------------------------------
-- p_result: 'got_it' (わかった), 'not_yet' (まだ), 'dont_know' (わからない)
-- p_session_id: a new id the app makes at the start of each review session
-- p_typed: what the student typed (Japanese → English typing mode), else NULL
create or replace function public.record_answer(
  p_word_id    bigint,
  p_direction  text,
  p_result     text,
  p_session_id uuid,
  p_typed      text default null
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
    select w.english into v_english from public.words w where w.id = p_word_id;
    v_spelling := public.spelling_check(v_typed, v_english);
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
     spelling, level_before, level_after, bonus_points)
  values
    (v_user, p_session_id, p_word_id, p_direction, v_result, v_repeat, v_typed is not null, v_typed,
     v_spelling, v_card.level, v_new, v_bonus);

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


-- ---------------------------------------------------------------------
-- 5. Rank now includes spelling bonus points
--    rank = floor(sqrt((peak points + bonus points) / 20)) + 1
--    (keep in step with playerRank() in src/lib/points.js)
-- ---------------------------------------------------------------------
create or replace function public.gacha_player_level(p_user uuid)
returns int
language sql stable
security definer
set search_path = ''
as $$
  select floor(sqrt((
           coalesce((select s.peak_points from public.user_stats s where s.user_id = p_user), 0)
         + coalesce((select t.bonus_points from public.user_study_totals t where t.user_id = p_user), 0)
         ) / 20.0))::int + 1
$$;


-- ---------------------------------------------------------------------
-- 6. Cleanup of old detailed answers (built, but OFF)
--    Deletes answer_log rows older than answer_log_keep_days, only when
--    answer_log_cleanup_on is 1. Never touches daily/total stats or cards.
-- ---------------------------------------------------------------------
create or replace function public.answer_log_cleanup()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted int;
begin
  if public.study_setting('answer_log_cleanup_on') <> 1 then
    return 0;
  end if;
  delete from public.answer_log
  where answered_at < now() - make_interval(days => public.study_setting('answer_log_keep_days')::int);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- To run it automatically later (once a day at 3:00 Japan time = 18:00 UTC):
-- 1) turn on the pg_cron extension (Database → Extensions → pg_cron),
-- 2) set answer_log_cleanup_on to 1 in study_setting() above and re-run it,
-- 3) run:
--    select cron.schedule('polycards-answer-log-cleanup', '0 18 * * *',
--                         $job$select public.answer_log_cleanup()$job$);


-- ---------------------------------------------------------------------
-- 7. Permissions: only record_answer() is for the app
-- ---------------------------------------------------------------------
revoke execute on function
  public.study_setting(text), public.study_level_hours(),
  public.spelling_normalize(text), public.spelling_distance(text, text),
  public.spelling_check(text, text),
  public.record_answer(bigint, text, text, uuid, text),
  public.answer_log_cleanup()
  from public, anon, authenticated;
grant execute on function public.record_answer(bigint, text, text, uuid, text) to authenticated;
