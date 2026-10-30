-- =====================================================================
-- Polycards: check that a STUDENT can't use the teacher functions (2026-10-30)
-- Run AFTER polycards-teachers.sql (and polycards-teacher-phase2.sql, polycards-teacher-phase3.sql, polycards-class-tab.sql). Read-only: every check that could write
-- something is undone straight away, so nothing in the database changes.
--
-- 1. Put a student's username (or full email) on the line marked  <-- STUDENT
--    (an account that is NOT in public.teachers, e.g. aiden).
-- 2. Run the whole file. The result is one row per check: PASS or FAIL.
--    Every row should say PASS.
--
-- How it works: inside the DO block it pretends to be that student (the same
-- role and user id the app uses when the student is signed in), tries each
-- forbidden thing, and notes what happened.
-- =====================================================================

do $$
declare
  v_who     text := 'aiden';   -- <-- STUDENT
  v_student uuid;
  v_class   uuid;
  v_out     text := '';
  v_n       int;
  v_bool    boolean;
  v_check   record;
  -- Class tab (polycards-class-tab.sql)
  v_fake    uuid := gen_random_uuid();   -- a class that doesn't exist
  v_myclass uuid;                        -- a class the student is in, not archived (if any)
  v_foreign uuid;                        -- a real class the student is NOT in (if any)
  v_code    text;                        -- v_myclass's join code
  v_ids     text[];                      -- the classmates' user ids
  v_names   text[];                      -- the classmates' real names (when not also their nickname)
  v_taken   text;                        -- a classmate's nickname (if any)
  v_json    text;
  v_hits    int;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;
  if exists (select 1 from public.teachers t where t.user_id = v_student) then
    raise exception '"%" is a teacher. Use a student account for this check.', v_who;
  end if;
  -- a class the student is in (if any), else a made-up id
  select m.class_id into v_class from public.class_members m where m.student_id = v_student limit 1;
  v_class := coalesce(v_class, gen_random_uuid());

  -- Class tab: looked up before switching to the student (the student can't read these)
  select m.class_id, c.join_code into v_myclass, v_code from public.class_members m
  join public.classes c on c.id = m.class_id
  where m.student_id = v_student and not c.archived limit 1;
  select c.id into v_foreign from public.classes c
  where not c.archived
    and not exists (select 1 from public.class_members m where m.class_id = c.id and m.student_id = v_student) limit 1;
  if v_myclass is not null then
    select array_agg(m.student_id::text),
           array_agg(m.real_name) filter (where m.nickname is null or lower(m.nickname) <> lower(m.real_name)),
           max(m.nickname)
      into v_ids, v_names, v_taken
      from public.class_members m where m.class_id = v_myclass and m.student_id <> v_student;
  end if;

  -- From here on: signed in as the student
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Each statement must fail with the expected error. If one doesn't fail,
  -- 'no_error' is raised so that its change (if any) is undone.
  for v_check in
    select * from (values
      ('search_users',               format('select * from public.search_users(%L)', 'a'),                                              'not_teacher'),
      ('create_class',               format('select public.create_class(%L, 2026)', 'Hack'),                                             'not_teacher'),
      ('teacher_classes',            'select * from public.teacher_classes()',                                                          'not_teacher'),
      ('class_detail',               format('select public.class_detail(%L)', v_class),                                                 'not_teacher'),
      ('add_student_to_class',       format('select public.add_student_to_class(%L, %L, %L, 1)', v_class, v_student, 'X'),              'not_teacher'),
      ('update_class_member',        format('select public.update_class_member(%L, %L, %L, 1)', v_class, v_student, 'X'),               'not_teacher'),
      ('remove_student_from_class',  format('select public.remove_student_from_class(%L, %L)', v_class, v_student),                    'not_teacher'),
      ('add_co_teacher',             format('select public.add_co_teacher(%L, %L)', v_class, v_student),                                'not_teacher'),
      ('regenerate_join_code',       format('select public.regenerate_join_code(%L)', v_class),                                         'not_teacher'),
      ('set_class_archived',         format('select public.set_class_archived(%L, true)', v_class),                                    'not_teacher'),
      ('student_detail',             format('select public.student_detail(%L, %L)', v_class, v_student),                                'not_teacher'),
      ('award_tickets',              format('select public.award_tickets(%L, array[%L]::uuid[], 10, %L)', v_class, v_student, 'free'), 'not_teacher'),
      ('class_awards',               format('select * from public.class_awards(%L)', v_class),                                          'not_teacher'),
      ('class_overview',             format('select * from public.class_overview(%L)', v_class),                                        'not_teacher'),
      ('class_trouble_words',        format('select * from public.class_trouble_words(%L)', v_class),                                   'not_teacher'),
      ('student_honesty',            format('select public.student_honesty(%L, %L)', v_class, v_student),                               'not_teacher'),
      ('call internal honesty_counts_for', format('select public.honesty_counts_for(%L)', v_student),                                   'permission denied'),
      ('call internal study_streak_for', format('select public.study_streak_for(%L)', v_student),                                       'permission denied'),
      ('insert into ticket_awards',  format('insert into public.ticket_awards (batch_id, student_id, amount) values (gen_random_uuid(), %L, 10)', v_student), 'permission denied'),
      ('call internal trouble_words_for', format('select * from public.trouble_words_for(%L)', v_student),                               'permission denied'),
      ('read teachers table',        'select count(*) from public.teachers',                                                            'permission denied'),
      ('make myself a teacher',      format('insert into public.teachers (user_id) values (%L)', v_student),                            'permission denied'),
      ('insert into classes',        format('insert into public.classes (name, school_year, join_code) values (%L, 2026, %L)', 'X', 'ABCDEF'), 'permission denied'),
      ('insert into class_members',  format('insert into public.class_members (class_id, student_id, real_name) values (%L, %L, %L)', v_class, v_student, 'X'), 'permission denied'),
      ('update class_members',       format('update public.class_members set real_name = %L', 'X'),                                     'permission denied'),
      ('delete class_members',       'delete from public.class_members',                                                                'permission denied'),
      ('call internal user_is_teacher', format('select public.user_is_teacher(%L)', v_student),                                          'permission denied'),
      ('call internal user_display_name', format('select public.user_display_name(%L)', v_student),                                      'permission denied'),
      -- Class tab
      ('set_member_nickname',        format('select public.set_member_nickname(%L, %L, %L)', v_class, v_student, 'X'),                  'not_teacher'),
      ('set_class_leaderboard',      format('select public.set_class_leaderboard(%L, false)', v_class),                                 'not_teacher'),
      ('class_leaderboard: made-up class', format('select public.class_leaderboard(%L)', v_fake),                                       'not_member'),
      ('class_leaderboard: another class', format('select public.class_leaderboard(%L)', coalesce(v_foreign, v_fake)),                   'not_member'),
      ('my_class_info: another class', format('select public.my_class_info(%L)', coalesce(v_foreign, v_fake)),                           'not_member'),
      ('set_my_nickname: another class', format('select public.set_my_nickname(%L, %L)', coalesce(v_foreign, v_fake), 'Hack'),          'not_member'),
      ('set_my_nickname: 13 characters', format('select public.set_my_nickname(%L, %L)', v_class, 'abcdefghijklm'),                     'bad_nickname'),
      ('set_my_nickname: blank',     format('select public.set_my_nickname(%L, %L)', v_class, '　 '),                                    'bad_nickname'),
      ('update class_members nickname', format('update public.class_members set nickname = %L', 'X'),                                   'permission denied'),
      ('call internal clean_nickname', format('select public.clean_nickname(%L)', 'X'),                                                 'permission denied'),
      ('call internal clean_join_code', format('select public.clean_join_code(%L)', 'X'),                                               'permission denied'),
      ('call internal class_week_ranks', format('select * from public.class_week_ranks(%L, current_date)', v_class),                    'permission denied'),
      ('call internal leaderboard_avatar', format('select public.leaderboard_avatar(%L)', v_student),                                    'permission denied')
    ) as c(label, stmt, expected)
  loop
    begin
      execute v_check.stmt;
      raise exception 'no_error';
    exception when others then
      if sqlerrm = 'no_error' then
        v_out := v_out || 'FAIL  ' || v_check.label || ': it was allowed' || E'\n';
      elsif position(v_check.expected in sqlerrm) > 0 then
        v_out := v_out || 'PASS  ' || v_check.label || ' (' || sqlerrm || ')' || E'\n';
      else
        v_out := v_out || 'FAIL  ' || v_check.label || ': unexpected error: ' || sqlerrm || E'\n';
      end if;
    end;
  end loop;

  -- Reads: only the student's own membership rows, no class rows (no join codes)
  select count(*) into v_n from public.class_members m where m.student_id <> v_student;
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  other students'' real names visible: ' || v_n || E'\n';
  select count(*) into v_n from public.classes;
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  class rows (join codes) visible: ' || v_n || E'\n';
  select count(*) into v_n from public.ticket_awards a where a.student_id <> v_student;
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  other students'' awards visible: ' || v_n || E'\n';
  select count(*) into v_n from public.class_teachers;
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  class_teachers rows visible: ' || v_n || E'\n';
  -- Class tab: what a student receives about their own class
  if v_myclass is null then
    v_out := v_out || 'INFO  ' || v_who || ' is in no class (not archived): leaderboard, nickname and join code checks skipped' || E'\n';
  else
    v_json := public.class_leaderboard(v_myclass)::text || public.my_class_info(v_myclass)::text;
    select count(*) into v_hits from unnest(coalesce(v_ids, '{}')) as i where position(i in v_json) > 0;
    v_out := v_out || (case when v_hits = 0 then 'PASS' else 'FAIL' end) || '  classmates'' user ids in class_leaderboard / my_class_info: ' || v_hits || E'\n';
    select count(*) into v_hits from unnest(coalesce(v_names, '{}')) as nm where position(nm in v_json) > 0;
    v_out := v_out || (case when v_hits = 0 then 'PASS' else 'FAIL' end) || '  classmates'' real names in class_leaderboard / my_class_info: ' || v_hits || E'\n';
    v_out := v_out || (case when position('@' in v_json) = 0 then 'PASS' else 'FAIL' end) || '  no email address (@) in class_leaderboard / my_class_info' || E'\n';
    v_out := v_out || (case when position('student_id' in v_json) = 0 and position('real_name' in v_json) = 0 and position('name_en' in v_json) = 0
                            then 'PASS' else 'FAIL' end) || '  no student_id / real_name / avatar name fields' || E'\n';

    -- Nickname uniqueness (any case): a classmate's nickname in capitals must be refused
    if v_taken is null then
      v_out := v_out || 'INFO  no classmate has a nickname yet: uniqueness check skipped' || E'\n';
    else
      begin
        perform public.set_my_nickname(v_myclass, upper(v_taken));
        raise exception 'no_error';
      exception when others then
        v_out := v_out || (case when position('nickname_taken' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                       || '  a classmate''s nickname in capitals (' || sqlerrm || ')' || E'\n';
      end;
    end if;

    -- Join codes: full-width (ＡＢＣ－２３４ with a full-width space) is cleaned the same as ABC234.
    -- The student is already in this class, so both must say already_member (nothing is written).
    begin
      perform public.check_join_code(translate(lower(v_code), 'abcdefghjkmnpqrstuvwxyz23456789',
                                               'ＡＢＣＤＥＦＧＨＪＫＭＮＰＱＲＳＴＵＶＷＸＹＺ２３４５６７８９'));
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('already_member' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  check_join_code with a full-width code (' || sqlerrm || ')' || E'\n';
    end;
    begin
      perform public.join_class(substr(v_code, 1, 3) || '　－' || lower(substr(v_code, 4)), 'X', null, null);
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('already_member' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  join_class with a spaced, hyphenated, lowercase code (' || sqlerrm || ')' || E'\n';
    end;
  end if;

  select public.is_teacher() into v_bool;
  v_out := v_out || (case when not v_bool then 'PASS' else 'FAIL' end) || '  is_teacher() says ' || v_bool || E'\n';
  select count(*) into v_n from public.my_classes();
  v_out := v_out || 'INFO  my_classes() lists ' || v_n || ' class(es) for ' || v_who || E'\n';

  reset role;
  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
