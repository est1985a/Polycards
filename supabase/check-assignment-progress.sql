-- =====================================================================
-- Polycards: check the assignment progress rule (2026-10-30)
-- Run AFTER polycards-teacher-phase4.sql. Read-only: everything it makes is rolled back at the end,
-- so nothing in the database changes.
--
-- 1. Put a student's username (or full email) on the line marked  <-- STUDENT  (e.g. aiden).
-- 2. Run the whole file. The result is one row per check: PASS or FAIL. Every row should say PASS.
--
-- It builds 5 made-up words and 3 made-up packs: A {w1, w2, w3}, B {w3, w4} (w3 is in both) and
-- C {w5}, a made-up class with the student in it, and an assignment for each pack. The student has
-- pack A in My Deck with these cards: w1 both directions at Lv2, w2 English → Japanese at Lv1 and
-- Japanese → English at Lv0, w3 both directions at Lv8 (Mastered). Expected:
--   A: added, 5 of 6 cards learned (Lv1 or higher)
--   B: not added, 2 of 4 (w3 was learned through pack A) → 学習中, not 未追加
--   C: not added, 0 of 2 → 未追加
--   then w2 Japanese → English goes to Lv1: A = 6 of 6 (完了)
--   my_pending_assignments() (as the student) counts B and C, not A
-- =====================================================================

do $$
declare
  v_who     text := 'aiden';   -- <-- STUDENT
  v_student uuid;
  v_out     text := '';
  v_class   uuid;
  v_w       uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_before  int;
  v_after   int;
  r         record;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;

  begin   -- everything in here is rolled back at the end
    -- Pending assignments before (the student may already have some in real classes)
    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_before := public.my_pending_assignments();
    reset role;

    -- Made-up words and packs
    for i in 1..5 loop
      insert into public.words (id, english, japanese) values (v_w[i], 'zz-check-' || i, 'チェック' || i);
    end loop;
    insert into public.decks (id, unit_id, name) values
      (v_a, null, 'zz check A'), (v_b, null, 'zz check B'), (v_c, null, 'zz check C');
    insert into public.deck_words (deck_id, word_id, position) values
      (v_a, v_w[1], 1), (v_a, v_w[2], 2), (v_a, v_w[3], 3),
      (v_b, v_w[3], 1), (v_b, v_w[4], 2),
      (v_c, v_w[5], 1);

    -- Made-up class with the student, and an assignment for each pack
    insert into public.classes (name, school_year, join_code) values ('zz check', 2026, public.new_join_code())
    returning id into v_class;
    insert into public.class_members (class_id, student_id, real_name) values (v_class, v_student, 'Check');
    insert into public.class_assignments (class_id, deck_id) values (v_class, v_a), (v_class, v_b), (v_class, v_c);

    -- The student's My Deck and cards
    insert into public.user_decks (user_id, deck_id) values (v_student, v_a);
    insert into public.user_cards (user_id, word_id, direction, level, next_review_at, mastered_at) values
      (v_student, v_w[1], 'en2jp', 2, now() + interval '1 day', null),
      (v_student, v_w[1], 'jp2en', 2, now() + interval '1 day', null),
      (v_student, v_w[2], 'en2jp', 1, now() + interval '1 day', null),
      (v_student, v_w[2], 'jp2en', 0, now(), null),
      (v_student, v_w[3], 'en2jp', 8, null, now()),
      (v_student, v_w[3], 'jp2en', 8, null, now());

    for r in
      select ca.deck_id, p.added, p.owned, p.learned, p.total
      from public.assignment_progress_for(v_class) p
      join public.class_assignments ca on ca.id = p.assignment_id
    loop
      if r.deck_id = v_a then
        v_out := v_out || (case when r.added and r.learned = 5 and r.total = 6 then 'PASS' else 'FAIL' end)
          || format('  pack A: added=%s, %s of %s learned (expected added, 5 of 6)', r.added, r.learned, r.total) || E'\n';
      elsif r.deck_id = v_b then
        v_out := v_out || (case when not r.added and r.owned = 2 and r.learned = 2 and r.total = 4 then 'PASS' else 'FAIL' end)
          || format('  pack B (shared word): added=%s, owned %s, %s of %s learned (expected not added, 2, 2 of 4)', r.added, r.owned, r.learned, r.total) || E'\n';
      else
        v_out := v_out || (case when not r.added and r.owned = 0 and r.learned = 0 and r.total = 2 then 'PASS' else 'FAIL' end)
          || format('  pack C: added=%s, owned %s, %s of %s learned (expected not added, 0, 0 of 2)', r.added, r.owned, r.learned, r.total) || E'\n';
      end if;
    end loop;

    -- The last card of pack A reaches Lv1: pack A is complete
    update public.user_cards set level = 1 where user_id = v_student and word_id = v_w[2] and direction = 'jp2en';
    select p.learned, p.total into r from public.assignment_progress_for(v_class) p
    join public.class_assignments ca on ca.id = p.assignment_id where ca.deck_id = v_a;
    v_out := v_out || (case when r.learned = 6 and r.total = 6 then 'PASS' else 'FAIL' end)
      || format('  pack A after one more card: %s of %s (expected 6 of 6)', r.learned, r.total) || E'\n';

    -- As the student: pending = B and C (not in My Deck, not done)
    set local role authenticated;
    v_after := public.my_pending_assignments();
    reset role;
    v_out := v_out || (case when v_after - v_before = 2 then 'PASS' else 'FAIL' end)
      || format('  my_pending_assignments: %s new (expected 2)', v_after - v_before) || E'\n';

    raise exception 'polycards_check_done';
  exception when others then
    reset role;
    if sqlerrm <> 'polycards_check_done' then
      v_out := v_out || 'FAIL  the check itself stopped: ' || sqlerrm || E'\n';
    end if;
  end;

  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
