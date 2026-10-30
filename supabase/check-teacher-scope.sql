-- =====================================================================
-- Polycards: check that a TEACHER only reaches students in their own classes (2026-10-30)
-- Run AFTER polycards-teacher-phase2.sql (and polycards-teacher-phase3.sql, polycards-class-tab.sql). Read-only: every check that could write
-- something is undone straight away, so nothing in the database changes.
--
-- 1. Put a teacher's username (or full email) on the line marked  <-- TEACHER
--    (an account in public.teachers that teaches at least one class, e.g. test1).
-- 2. Run the whole file. The result is one row per check: PASS or FAIL.
--    Every row should say PASS.
--
-- It picks one class the teacher teaches (not archived) and one "outsider": an account that
-- is in none of the teacher's classes. Then, pretending to be the teacher,
-- it tries to read and award the outsider.
-- =====================================================================

do $$
declare
  v_who      text := 'test1';   -- <-- TEACHER
  v_teacher  uuid;
  v_class    uuid;   -- a class the teacher teaches
  v_other    uuid;   -- a class the teacher does NOT teach (or a made-up id)
  v_outsider uuid;   -- an account in none of the teacher's classes
  v_out      text := '';
  v_n        int;
  v_check    record;
begin
  select u.id into v_teacher from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_teacher is null then raise exception 'No account found for "%"', v_who; end if;
  if not exists (select 1 from public.teachers t where t.user_id = v_teacher) then
    raise exception '"%" is not a teacher. Use a teacher account for this check.', v_who;
  end if;
  select ct.class_id into v_class from public.class_teachers ct
  join public.classes c on c.id = ct.class_id
  where ct.teacher_id = v_teacher and not c.archived limit 1;
  if v_class is null then raise exception '"%" teaches no class that is not archived. Create one first.', v_who; end if;
  select c.id into v_other from public.classes c
  where not exists (select 1 from public.class_teachers ct where ct.class_id = c.id and ct.teacher_id = v_teacher)
  limit 1;
  v_other := coalesce(v_other, gen_random_uuid());
  select u.id into v_outsider from auth.users u
  where u.id <> v_teacher
    and not exists (select 1 from public.class_members m
                    join public.class_teachers ct on ct.class_id = m.class_id
                    where m.student_id = u.id and ct.teacher_id = v_teacher)
  limit 1;
  if v_outsider is null then raise exception 'Every account is in one of "%"''s classes; no outsider to test with.', v_who; end if;

  -- From here on: signed in as the teacher
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);
  set local role authenticated;

  for v_check in
    select * from (values
      ('student_detail: outsider in my class',     format('select public.student_detail(%L, %L)', v_class, v_outsider),                             'not_member'),
      ('award_tickets: outsider in my class',      format('select public.award_tickets(%L, array[%L]::uuid[], 1, null)', v_class, v_outsider),     'not_member'),
      ('student_detail: class I don''t teach',     format('select public.student_detail(%L, %L)', v_other, v_outsider),                             'not_class_teacher'),
      ('award_tickets: class I don''t teach',      format('select public.award_tickets(%L, array[%L]::uuid[], 1, null)', v_other, v_outsider),     'not_class_teacher'),
      ('class_awards: class I don''t teach',       format('select * from public.class_awards(%L)', v_other),                                        'not_class_teacher'),
      ('class_detail: class I don''t teach',       format('select public.class_detail(%L)', v_other),                                               'not_class_teacher'),
      ('class_overview: class I don''t teach',     format('select * from public.class_overview(%L)', v_other),                                      'not_class_teacher'),
      ('class_trouble_words: class I don''t teach', format('select * from public.class_trouble_words(%L)', v_other),                                'not_class_teacher'),
      ('student_honesty: outsider in my class',    format('select public.student_honesty(%L, %L)', v_class, v_outsider),                            'not_member'),
      ('student_honesty: class I don''t teach',    format('select public.student_honesty(%L, %L)', v_other, v_outsider),                            'not_class_teacher'),
      ('set_member_nickname: class I don''t teach', format('select public.set_member_nickname(%L, %L, %L)', v_other, v_outsider, 'X'),            'not_class_teacher'),
      ('set_member_nickname: outsider in my class', format('select public.set_member_nickname(%L, %L, %L)', v_class, v_outsider, 'X'),            'not_member'),
      ('set_class_leaderboard: class I don''t teach', format('select public.set_class_leaderboard(%L, false)', v_other),                           'not_class_teacher'),
      ('class_leaderboard: class I don''t teach',  format('select public.class_leaderboard(%L)', v_other),                                          'not_member'),
      ('award_tickets: 11 tickets',                format('select public.award_tickets(%L, array[%L]::uuid[], 11, null)', v_class, v_outsider),    'bad_amount'),
      ('change a student''s cards directly',       format('update public.user_cards set level = 7 where user_id = %L', v_outsider),                 'no_error'),
      ('read teachers table',                      'select count(*) from public.teachers',                                                          'permission denied')
    ) as c(label, stmt, expected)
  loop
    begin
      if v_check.expected = 'no_error' then
        -- RLS on user_cards: an update of someone else's rows touches 0 rows (no error)
        execute v_check.stmt;
        get diagnostics v_n = row_count;
        raise exception 'rows=%', v_n;
      end if;
      execute v_check.stmt;
      raise exception 'no_error';
    exception when others then
      if v_check.expected = 'no_error' then
        v_out := v_out || (case when sqlerrm = 'rows=0' or position('permission denied' in sqlerrm) > 0 then 'PASS  ' else 'FAIL  ' end) || v_check.label || ' (' || sqlerrm || ')' || E'\n';
      elsif sqlerrm = 'no_error' then
        v_out := v_out || 'FAIL  ' || v_check.label || ': it was allowed' || E'\n';
      elsif position(v_check.expected in sqlerrm) > 0 then
        v_out := v_out || 'PASS  ' || v_check.label || ' (' || sqlerrm || ')' || E'\n';
      else
        v_out := v_out || 'FAIL  ' || v_check.label || ': unexpected error: ' || sqlerrm || E'\n';
      end if;
    end;
  end loop;

  -- Reads: nothing about the outsider
  select count(*) into v_n from public.class_members m where m.student_id = v_outsider;
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  outsider''s class memberships visible: ' || v_n || E'\n';
  select count(*) into v_n from public.ticket_awards a where a.student_id = v_outsider;
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  outsider''s awards visible: ' || v_n || E'\n';
  select count(*) into v_n from public.user_study_daily d where d.user_id = v_outsider;
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  outsider''s study days visible: ' || v_n || E'\n';
  select count(*) into v_n from public.answer_log a where a.user_id = v_outsider;
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  outsider''s answers visible: ' || v_n || E'\n';

  reset role;
  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
