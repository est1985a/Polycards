-- =====================================================================
-- Polycards: checks for server-calculated peak points (2026-10-31)
--
-- PART A (read-only): run it BEFORE polycards-server-peak-points.sql and
--   again after. For every account it compares the saved peak with what the
--   server calculation gives, and the rank now vs after. The last column must
--   say "no" on every row, and the summary row must say 0 rank drops.
--   (Before: "server higher" rows will go up, "no row" rows will be created.
--   After: every row should say "same" or "saved higher (kept)".)
--
-- PART B (run AFTER polycards-server-peak-points.sql): pretends to be a
--   student and tries to write the peak and raise card levels directly.
--   Every row should say PASS. Everything it does is undone.
--
-- Run each part on its own (select it, then Run).
-- =====================================================================


-- ---------------------------------------------------------------------
-- PART A: saved peak vs server calculation, for every account
-- (the same points table as CARD_POINTS in src/lib/srs.js)
-- ---------------------------------------------------------------------
with totals as (
  select c.user_id,
         sum(coalesce((array[0, 1, 2, 3, 5, 8, 13, 21, 34])[c.level + 1], 0))::int as card_total
  from public.user_cards c
  group by c.user_id
),
people as (
  select coalesce(s.user_id, t.user_id) as user_id,
         s.peak_points                    as saved_peak,
         coalesce(t.card_total, 0)        as card_total,
         coalesce(b.bonus_points, 0)      as bonus
  from public.user_stats s
  full join totals t on t.user_id = s.user_id
  left join public.user_study_totals b on b.user_id = coalesce(s.user_id, t.user_id)
),
compared as (
  select p.*,
         greatest(coalesce(p.saved_peak, 0), p.card_total) as new_peak,
         floor(sqrt((coalesce(p.saved_peak, 0) + p.bonus) / 20.0))::int + 1 as rank_now,
         floor(sqrt((greatest(coalesce(p.saved_peak, 0), p.card_total) + p.bonus) / 20.0))::int + 1 as rank_after
  from people p
)
select coalesce(u.raw_user_meta_data->>'username', u.email, c.user_id::text) as account,
       c.saved_peak, c.card_total, c.new_peak, c.bonus, c.rank_now, c.rank_after,
       case when c.saved_peak is null          then 'no row (will be created)'
            when c.card_total > c.saved_peak   then 'server higher (will rise)'
            when c.card_total < c.saved_peak   then 'saved higher (kept)'
            else 'same' end as status,
       case when c.new_peak < coalesce(c.saved_peak, 0) or c.rank_after < c.rank_now
            then 'YES' else 'no' end as drops
from compared c
left join auth.users u on u.id = c.user_id
union all
select '— SUMMARY —', null, null, null, null, null, null,
       count(*) || ' accounts',
       count(*) filter (where new_peak < coalesce(saved_peak, 0) or rank_after < rank_now) || ' rank drops'
from compared
order by 1;


-- ---------------------------------------------------------------------
-- PART B: a student can't write the peak or raise card levels
-- 1. Put a student's username (or full email) on the line marked <-- STUDENT
--    (an account with at least one card at Lv1 or higher).
-- 2. Run this part. Every row should say PASS.
-- ---------------------------------------------------------------------
do $$
declare
  v_who      text := 'aiden';   -- <-- STUDENT
  v_student  uuid;
  v_card     record;            -- one of the student's cards at Lv1–Lv7
  v_new_word uuid;              -- a word the student doesn't have yet
  v_before   int;
  v_after    int;
  v_total    int;
  v_out      text := '';
  v_check    record;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;

  select c.word_id, c.direction, c.level into v_card from public.user_cards c
  where c.user_id = v_student and c.level between 1 and 7 limit 1;
  if v_card is null then raise exception '"%" has no card at Lv1–Lv7. Pick another student.', v_who; end if;
  select w.id into v_new_word from public.words w
  where not exists (select 1 from public.user_cards c where c.user_id = v_student and c.word_id = w.id) limit 1;
  if v_new_word is null then raise exception '"%" already has every word. Pick another student.', v_who; end if;

  -- Server side (as the SQL editor): a level going up refreshes the peak to greatest(old, total).
  begin
    select coalesce((select s.peak_points from public.user_stats s where s.user_id = v_student), 0) into v_before;
    insert into public.user_cards (user_id, word_id, direction, level, next_review_at, mastered_at)
    values (v_student, v_new_word, 'en2jp', 8, null, now());
    select s.peak_points into v_after from public.user_stats s where s.user_id = v_student;
    v_total := public.card_points_total(v_student);
    v_out := v_out || (case when v_after = greatest(v_before, v_total) then 'PASS' else 'FAIL' end)
                   || '  a Mastered card added on the server: peak ' || v_before || ' → ' || v_after
                   || ' (card total ' || v_total || ')' || E'\n';
    raise exception 'undo_ok';
  exception when others then
    if sqlerrm <> 'undo_ok' then v_out := v_out || 'FAIL  server-side level up: ' || sqlerrm || E'\n'; end if;
  end;

  -- From here on: signed in as the student
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Each must fail with the expected error. If one doesn't, 'no_error' is
  -- raised so that its change is undone.
  for v_check in
    select * from (values
      ('insert my own peak',     format('insert into public.user_stats (user_id, peak_points) values (%L, 999999)', v_student), 'permission denied'),
      ('update my own peak',     'update public.user_stats set peak_points = 999999',                                             'permission denied'),
      ('delete my stats row',    'delete from public.user_stats',                                                                 'permission denied'),
      ('add a card at Lv5',      format('insert into public.user_cards (user_id, word_id, direction, level) values (%L, %L, %L, 5)', v_student, v_new_word, 'jp2en'), 'level_locked'),
      ('add a Mastered card',    format('insert into public.user_cards (user_id, word_id, direction, level, mastered_at) values (%L, %L, %L, 0, now())', v_student, v_new_word, 'jp2en'), 'level_locked'),
      ('raise a card one level', format('update public.user_cards set level = level + 1 where user_id = %L and word_id = %L and direction = %L', v_student, v_card.word_id, v_card.direction), 'level_locked'),
      ('set a card to Mastered', format('update public.user_cards set level = 8, next_review_at = null, mastered_at = now() where user_id = %L and word_id = %L and direction = %L', v_student, v_card.word_id, v_card.direction), 'level_locked'),
      ('call refresh_peak_points', format('select public.refresh_peak_points(%L)', v_student),                                    'permission denied')
    ) as t(name, stmt, expected)
  loop
    begin
      execute v_check.stmt;
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position(v_check.expected in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  ' || v_check.name || ' (' || sqlerrm || ')' || E'\n';
    end;
  end loop;

  -- These must still work (the app needs them); each is undone straight away.
  for v_check in
    select * from (values
      ('read my own peak',          'select 1 from public.user_stats'),
      ('add a new card at Lv0 (adding a pack)', format('insert into public.user_cards (user_id, word_id, direction) values (%L, %L, %L)', v_student, v_new_word, 'jp2en')),
      ('lower a card one level',    format('update public.user_cards set level = level - 1 where user_id = %L and word_id = %L and direction = %L', v_student, v_card.word_id, v_card.direction)),
      ('remove a card (removing a pack)', format('delete from public.user_cards where user_id = %L and word_id = %L and direction = %L', v_student, v_card.word_id, v_card.direction))
    ) as t(name, stmt)
  loop
    begin
      execute v_check.stmt;
      raise exception 'undo_ok';
    exception when others then
      v_out := v_out || (case when sqlerrm = 'undo_ok' then 'PASS' else 'FAIL' end)
                     || '  ' || v_check.name || (case when sqlerrm = 'undo_ok' then '' else ' (' || sqlerrm || ')' end) || E'\n';
    end;
  end loop;

  reset role;
  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
