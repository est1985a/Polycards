-- =====================================================================
-- Polycards: alternate answers for Japanese → English typing / handwriting
-- Run once in the Supabase SQL editor, AFTER polycards-answers.sql,
-- polycards-fix-word-id.sql and polycards-other-meaning.sql.
--
-- Adds words.alt_answers: other English answers that are also accepted
-- (かわいい → "pretty", alternates {cute}). A correctly spelled alternate
-- counts exactly like the main answer: わかった plus the spelling bonus.
-- Keep these rules in step with src/lib/spelling.js (spellingAnswers /
-- checkSpelling).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The new column (empty list = no alternates)
-- ---------------------------------------------------------------------
alter table public.words add column if not exists alt_answers text[] not null default '{}';

-- Readable like the other words columns (harmless if the whole table is
-- already granted; the existing RLS read policies cover the new column).
grant select (alt_answers) on public.words to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. Every accepted spelling of a word, cleaned up by spelling_normalize():
--    for the main english and each alternate, the form without the ( ) / [ ]
--    words and the form with them. Blanks are dropped.
--    'look (at)', {see} → {look, look at, see}
-- ---------------------------------------------------------------------
create or replace function public.spelling_answers(p_english text, p_alts text[])
returns text[]
language sql immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct f) filter (where f <> ''), '{}')
  from unnest(array[p_english] || coalesce(p_alts, '{}')) as a(answer),
  lateral (values
    (public.spelling_normalize(regexp_replace(a.answer, '[(\[][^)\]]*[)\]]', ' ', 'g'))),  -- without ( ) words
    (public.spelling_normalize(regexp_replace(a.answer, '[()\[\]]', '', 'g')))             -- with them
  ) as v(f)
$$;


-- ---------------------------------------------------------------------
-- 3. Spelling check with alternates
--    'exact' = the main answer or an alternate (bonus), 'close' = one change
--    away from any of them (おしい), 'wrong' = anything else.
--    The two-argument version stays (no alternates), so nothing else breaks.
-- ---------------------------------------------------------------------
create or replace function public.spelling_check(p_typed text, p_english text, p_alts text[])
returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  v_typed text := public.spelling_normalize(left(p_typed, 200));
  v_answers text[] := public.spelling_answers(p_english, p_alts);
  v_best int;
begin
  if v_typed = '' then return 'wrong'; end if;
  if v_typed = any (v_answers) then return 'exact'; end if;
  select min(public.spelling_distance(v_typed, x)) into v_best from unnest(v_answers) x;
  if v_best is not null and v_best <= 1 then return 'close'; end if;
  return 'wrong';
end;
$$;

create or replace function public.spelling_check(p_typed text, p_english text)
returns text
language sql immutable
set search_path = ''
as $$
  select public.spelling_check(p_typed, p_english, '{}'::text[])
$$;


-- ---------------------------------------------------------------------
-- 4. record_answer(): same as before, except the spelling check now also
--    accepts the word's alternates (marked "alt_answers" below).
-- ---------------------------------------------------------------------
create or replace function public.record_answer(
  p_word_id    uuid,
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
-- 5. other_meaning_check(): same as before, plus
--    - typing this word's own answer or an alternate is never "another
--      meaning" (it is accepted, so no retry), and
--    - another word's alternates count as that word's spellings.
-- ---------------------------------------------------------------------
create or replace function public.other_meaning_check(p_word_id uuid, p_typed text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_typed    text := public.spelling_normalize(left(p_typed, 200));
  v_meanings text[];
  v_answers  text[];
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if v_typed = '' then return false; end if;

  select public.japanese_meanings(w.japanese), public.spelling_answers(w.english, w.alt_answers)
    into v_meanings, v_answers
  from public.words w where w.id = p_word_id;
  if v_typed = any (coalesce(v_answers, '{}')) then return false; end if;
  if v_meanings is null or cardinality(v_meanings) = 0 then return false; end if;

  return exists (
    select 1 from public.words w
    where w.id <> p_word_id
      and v_typed = any (public.spelling_answers(w.english, w.alt_answers))
      and public.japanese_meanings(w.japanese) && v_meanings
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 6. Permissions: the helpers are for the database only
-- ---------------------------------------------------------------------
revoke execute on function
  public.spelling_answers(text, text[]),
  public.spelling_check(text, text, text[]),
  public.spelling_check(text, text)
  from public, anon, authenticated;
revoke execute on function public.record_answer(uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.record_answer(uuid, text, text, uuid, text) to authenticated;
revoke execute on function public.other_meaning_check(uuid, text) from public, anon, authenticated;
grant execute on function public.other_meaning_check(uuid, text) to authenticated;

notify pgrst, 'reload schema';


-- Test (remove the -- to run): accept "cute" on the かわいい card.
-- update public.words set alt_answers = '{cute}' where english = 'pretty' and japanese = 'かわいい、きれい';
