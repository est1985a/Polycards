-- =====================================================================
-- Polycards fix (2026-10-16): word ids are uuids, not numbers.
-- Run once in the Supabase SQL editor. Fixes the 保存できませんでした error
-- and the gacha review counter (both were set up for number ids).
-- Nothing is lost: the two tables changed here can only be empty, because
-- every save into them failed until now. Step 1 checks that first.
-- =====================================================================

-- 1. Safety check: stop if either table has rows (then tell Claude).
do $check$
begin
  if exists (select 1 from public.counted_cards) or exists (select 1 from public.answer_log) then
    raise exception 'STOP: counted_cards or answer_log already has rows. Nothing was changed. Tell Claude.';
  end if;
end
$check$;

-- 2. Change the word id columns to uuid.
alter table public.counted_cards alter column word_id type uuid using word_id::text::uuid;
alter table public.answer_log    alter column word_id type uuid using word_id::text::uuid;

-- 3. Replace record_answer with the uuid version.
drop function public.record_answer(bigint, text, text, uuid, text);

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

revoke execute on function public.record_answer(uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.record_answer(uuid, text, text, uuid, text) to authenticated;

-- 4. Tell the app's connection about the new function.
notify pgrst, 'reload schema';
