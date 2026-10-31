-- =====================================================================
-- Polycards: check the pre-filled class rosters (名簿を貼り付け) (2026-10-31)
-- Run AFTER polycards-roster-prefill.sql. Everything that writes test data is undone straight away
-- (each part ends in an 'undo' error), so nothing in the database changes.
--
-- 1. Fill in the three lines marked <--:
--      TEACHER        a teacher account (in public.teachers), e.g. test1
--      STUDENT        a test student account that is NOT a teacher, e.g. aiden
--      GOOGLE STUDENT YOUR OWN second Google account (signed in to Polycards at least once, not a
--                     teacher). NEVER put a real student's account here: this file is in a public
--                     repository, so a real student's email must never be saved in it, even
--                     though everything is rolled back. Put the placeholder back before committing.
-- 2. Run the whole file. The result is one row per check: PASS or FAIL (INFO rows explain).
--    Every PASS / FAIL row should say PASS.
-- =====================================================================

do $$
declare
  v_teacher_who text := 'test1';                       -- <-- TEACHER
  v_student_who text := 'aiden';                       -- <-- STUDENT
  v_google_who  text := 'my-second-account@gmail.com'; -- <-- GOOGLE STUDENT: your own second Google account, never a real student's
  v_teacher uuid;
  v_student uuid;
  v_google  uuid;
  v_gmail   text;     -- the Google student's email (lower case)
  v_smail   text;     -- the test student's email (may be null)
  v_out     text := '';
  v_check   record;
  v_res     jsonb;
  v_got     text;
  v_n       int;
  v_n2      int;
  v_c       uuid;     -- the teacher's made-up class
  v_foreign uuid;     -- a made-up class the teacher doesn't teach
  v_c1      uuid;     -- Google student: a normal class
  v_c2      uuid;     -- Google student: an archived class
  v_c3      uuid;     -- Google student: a class they left before
  v_e       uuid;
  v_e2      uuid;
  v_fake    uuid := gen_random_uuid();
begin
  select u.id into v_teacher from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_teacher_who) or lower(u.email) = lower(v_teacher_who);
  if v_teacher is null then raise exception 'No account found for TEACHER "%"', v_teacher_who; end if;
  if not exists (select 1 from public.teachers t where t.user_id = v_teacher) then
    raise exception 'TEACHER "%" is not in public.teachers.', v_teacher_who;
  end if;

  select u.id, lower(u.email) into v_student, v_smail from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_student_who) or lower(u.email) = lower(v_student_who);
  if v_student is null then raise exception 'No account found for STUDENT "%"', v_student_who; end if;
  if exists (select 1 from public.teachers t where t.user_id = v_student) then
    raise exception 'STUDENT "%" is a teacher. Use a student account.', v_student_who;
  end if;

  select u.id, lower(u.email) into v_google, v_gmail from auth.users u where lower(u.email) = lower(btrim(v_google_who));
  if v_google is null then
    raise exception 'No account found for GOOGLE STUDENT "%". Put your own second Google account there (never a real student''s).', v_google_who;
  end if;
  if exists (select 1 from public.teachers t where t.user_id = v_google) then
    raise exception 'GOOGLE STUDENT "%" is a teacher. Use a non-teacher Google account.', v_google_who;
  end if;
  if not exists (select 1 from auth.identities i where i.user_id = v_google and i.provider = 'google') then
    raise exception 'GOOGLE STUDENT "%" has never signed in with Google.', v_google_who;
  end if;

  -- ---------------------------------------------------------------
  -- Part A: a student can't use the teacher functions or the table
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  set local role authenticated;
  for v_check in
    select * from (values
      ('add_roster_entries',            format('select public.add_roster_entries(%L, %L::jsonb)', v_fake, '[]'),                   'not_teacher'),
      ('add_roster_entries (dry run)',  format('select public.add_roster_entries(%L, %L::jsonb, true)', v_fake, '[]'),             'not_teacher'),
      ('class_roster_pending',          format('select * from public.class_roster_pending(%L)', v_fake),                          'not_teacher'),
      ('teacher_roster_pending_counts', 'select * from public.teacher_roster_pending_counts()',                                    'not_teacher'),
      ('update_roster_entry',           format('select public.update_roster_entry(%L, %L, 1, %L)', v_fake, 'X', 'x@x.jp'),         'not_teacher'),
      ('remove_roster_entry',           format('select public.remove_roster_entry(%L)', v_fake),                                  'not_teacher'),
      ('read class_roster_entries',     'select count(*) from public.class_roster_entries',                                        'permission denied'),
      ('insert into class_roster_entries', format('insert into public.class_roster_entries (class_id, email, real_name) values (%L, %L, %L)', v_fake, 'x@x.jp', 'X'), 'permission denied'),
      ('update class_roster_entries',   'update public.class_roster_entries set claimed_at = now()',                               'permission denied'),
      ('delete class_roster_entries',   'delete from public.class_roster_entries',                                                 'permission denied'),
      ('call internal clean_roster_email', format('select public.clean_roster_email(%L)', 'x@x.jp'),                              'permission denied'),
      ('call internal roster_account_for', format('select public.roster_account_for(%L)', 'x@x.jp'),                              'permission denied'),
      ('call internal my_roster_email', 'select public.my_roster_email()',                                                         'permission denied')
    ) as c(label, stmt, expected)
  loop
    begin
      execute v_check.stmt;
      raise exception 'no_error';
    exception when others then
      if sqlerrm = 'no_error' then
        v_out := v_out || 'FAIL  student: ' || v_check.label || ': it was allowed' || E'\n';
      elsif position(v_check.expected in sqlerrm) > 0 then
        v_out := v_out || 'PASS  student: ' || v_check.label || ' (' || sqlerrm || ')' || E'\n';
      else
        v_out := v_out || 'FAIL  student: ' || v_check.label || ': unexpected error: ' || sqlerrm || E'\n';
      end if;
    end;
  end loop;
  reset role;

  -- A row with the test student's own email: a username / password account never claims it
  -- (only a Google sign-in does). Undone.
  if v_smail is null then
    v_out := v_out || 'INFO  ' || v_student_who || ' has no email: password-account claim check skipped' || E'\n';
  elsif exists (select 1 from auth.identities i where i.user_id = v_student and i.provider = 'google') then
    v_out := v_out || 'INFO  ' || v_student_who || ' signs in with Google: password-account claim check skipped' || E'\n';
  else
    begin
      insert into public.classes (name, school_year, join_code) values ('ROSTER CHECK S', 2026, public.new_join_code()) returning id into v_c1;
      insert into public.class_roster_entries (class_id, email, real_name) values (v_c1, v_smail, 'Check Student');
      perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
      set local role authenticated;
      v_res := public.claim_my_roster();
      reset role;
      select count(*) into v_n from public.class_members m where m.class_id = v_c1;
      raise exception 'undo';
    exception when others then
      v_out := v_out || (case when sqlerrm = 'undo' and v_n = 0 and not v_res @> jsonb_build_array(jsonb_build_object('id', v_c1))
                              then 'PASS' else 'FAIL' end)
                     || '  a password account never claims its email (' || sqlerrm || ')' || E'\n';
    end;
  end if;

  -- ---------------------------------------------------------------
  -- Part B: the teacher pastes rows into a made-up class. Undone.
  -- ---------------------------------------------------------------
  begin
    insert into public.classes (name, school_year, join_code) values ('ROSTER CHECK T', 2026, public.new_join_code()) returning id into v_c;
    insert into public.class_teachers (class_id, teacher_id) values (v_c, v_teacher);
    insert into public.classes (name, school_year, join_code) values ('ROSTER CHECK F', 2026, public.new_join_code()) returning id into v_foreign;

    perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- A class the teacher doesn't teach
    begin
      perform public.add_roster_entries(v_foreign, '[{"student_number":"1","real_name":"X","email":"x@x.jp"}]'::jsonb);
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('not_class_teacher' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  teacher: add_roster_entries on a class I don''t teach (' || sqlerrm || ')' || E'\n';
    end;
    begin
      perform * from public.class_roster_pending(v_foreign);
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('not_class_teacher' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  teacher: class_roster_pending on a class I don''t teach (' || sqlerrm || ')' || E'\n';
    end;

    -- Whole-call errors
    begin
      perform public.add_roster_entries(v_c, '[]'::jsonb);
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('no_rows' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  teacher: an empty paste (' || sqlerrm || ')' || E'\n';
    end;
    begin
      perform public.add_roster_entries(v_c, (select jsonb_agg(jsonb_build_object('real_name', 'X', 'email', 'r' || g || '@x.jp'))
                                              from generate_series(1, 201) g));
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('too_many_rows' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  teacher: 201 rows (' || sqlerrm || ')' || E'\n';
    end;

    -- The paste: the Google student (capitals + spaces), a new address, a bad address, the same
    -- address twice, number 120, a full-width ５, an empty name.
    v_res := jsonb_build_array(
      jsonb_build_object('student_number', '3', 'real_name', 'チェック　太郎', 'email', '  ' || upper(v_gmail) || ' '),
      jsonb_build_object('student_number', '7', 'real_name', 'Pending One', 'email', 'roster.check.pending@example.jp'),
      jsonb_build_object('student_number', '8', 'real_name', 'Bad Mail', 'email', 'not-an-email'),
      jsonb_build_object('student_number', '9', 'real_name', 'Dup A', 'email', 'roster.check.dup@example.jp'),
      jsonb_build_object('student_number', '10', 'real_name', 'Dup B', 'email', 'Roster.Check.Dup@example.jp'),
      jsonb_build_object('student_number', '120', 'real_name', 'Big Number', 'email', 'roster.check.n120@example.jp'),
      jsonb_build_object('student_number', '５', 'real_name', 'Full Width', 'email', 'roster.check.fw@example.jp'),
      jsonb_build_object('student_number', '', 'real_name', '   ', 'email', 'roster.check.noname@example.jp'));

    -- Dry run: the right answers, nothing written
    select string_agg(r->>'status' || coalesce(':' || (r->>'reason'), ''), ' ' order by (r->>'row')::int) into v_got
    from jsonb_array_elements(public.add_roster_entries(v_c, v_res, true)) r;
    select count(*) into v_n from public.class_roster_pending(v_c);
    select jsonb_array_length(public.class_detail(v_c)->'students') into v_n2;
    v_out := v_out || (case when v_got = 'added_member added_pending error:bad_email error:duplicate_email error:duplicate_email error:bad_number added_pending error:bad_name'
                             and v_n = 0 and v_n2 = 0 then 'PASS' else 'FAIL' end)
                   || '  teacher: dry run statuses, nothing written (' || v_got || '; pending ' || v_n || ', members ' || v_n2 || ')' || E'\n';

    -- The real paste
    select string_agg(r->>'status' || coalesce(':' || (r->>'reason'), ''), ' ' order by (r->>'row')::int) into v_got
    from jsonb_array_elements(public.add_roster_entries(v_c, v_res)) r;
    v_out := v_out || (case when v_got = 'added_member added_pending error:bad_email error:duplicate_email error:duplicate_email error:bad_number added_pending error:bad_name'
                            then 'PASS' else 'FAIL' end) || '  teacher: paste statuses (' || v_got || ')' || E'\n';
    select string_agg(p.email || '#' || coalesce(p.student_number::text, '-'), ' ' order by p.student_number) into v_got
    from public.class_roster_pending(v_c) p;
    v_out := v_out || (case when v_got = 'roster.check.fw@example.jp#5 roster.check.pending@example.jp#7' then 'PASS' else 'FAIL' end)
                   || '  teacher: 未ログイン rows (' || coalesce(v_got, 'none') || ')' || E'\n';
    select s->>'real_name' || '#' || (s->>'student_number') || '#' || coalesce(s->>'nickname', 'no nickname') into v_got
    from jsonb_array_elements(public.class_detail(v_c)->'students') s where (s->>'student_id')::uuid = v_google;
    v_out := v_out || (case when v_got = 'チェック 太郎#3#no nickname' then 'PASS' else 'FAIL' end)
                   || '  teacher: the Google student is a member at once (' || coalesce(v_got, 'not a member') || ')' || E'\n';
    select p.pending into v_n from public.teacher_roster_pending_counts() p where p.class_id = v_c;
    v_out := v_out || (case when v_n = 2 then 'PASS' else 'FAIL' end) || '  teacher: teacher_roster_pending_counts = ' || coalesce(v_n, 0) || E'\n';

    -- The same paste again: the member is untouched, the pending row is updated
    select string_agg(r->>'status', ' ' order by (r->>'row')::int) into v_got
    from jsonb_array_elements(public.add_roster_entries(v_c, jsonb_build_array(v_res->0, v_res->1))) r;
    v_out := v_out || (case when v_got = 'already_member updated' then 'PASS' else 'FAIL' end) || '  teacher: pasting again (' || v_got || ')' || E'\n';

    -- Editing and removing unclaimed rows
    select p.id into v_e from public.class_roster_pending(v_c) p where p.email = 'roster.check.pending@example.jp';
    select p.id into v_e2 from public.class_roster_pending(v_c) p where p.email = 'roster.check.fw@example.jp';
    begin
      perform public.update_roster_entry(v_e, 'Pending Two', 12, ' ROSTER.CHECK.EDITED@example.jp ');
      select p.real_name || '#' || p.student_number || '#' || p.email into v_got from public.class_roster_pending(v_c) p where p.id = v_e;
    exception when others then v_got := sqlerrm;
    end;
    v_out := v_out || (case when v_got = 'Pending Two#12#roster.check.edited@example.jp' then 'PASS' else 'FAIL' end)
                   || '  teacher: update_roster_entry (' || v_got || ')' || E'\n';
    begin
      perform public.update_roster_entry(v_e, 'Pending Two', 12, 'roster.check.fw@example.jp');
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('roster_email_taken' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  teacher: update_roster_entry to an address already used (' || sqlerrm || ')' || E'\n';
    end;
    begin
      perform public.remove_roster_entry(v_e2);
      select count(*) into v_n from public.class_roster_pending(v_c);
    exception when others then v_n := -1;
    end;
    v_out := v_out || (case when v_n = 1 then 'PASS' else 'FAIL' end) || '  teacher: remove_roster_entry (pending left: ' || v_n || ')' || E'\n';

    -- A claimed row can't be changed or removed
    reset role;
    select e.id into v_e2 from public.class_roster_entries e where e.class_id = v_c and e.email = v_gmail;
    perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      perform public.update_roster_entry(v_e2, 'X', 1, 'x@x.jp');
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('roster_entry_not_found' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  teacher: update a claimed row (' || sqlerrm || ')' || E'\n';
    end;
    begin
      perform public.remove_roster_entry(v_e2);
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('roster_entry_not_found' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  teacher: remove a claimed row (' || sqlerrm || ')' || E'\n';
    end;

    -- An archived class takes no paste
    perform public.set_class_archived(v_c, true);
    begin
      perform public.add_roster_entries(v_c, jsonb_build_array(v_res->1));
      raise exception 'no_error';
    exception when others then
      v_out := v_out || (case when position('class_archived' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  teacher: paste into an archived class (' || sqlerrm || ')' || E'\n';
    end;

    reset role;
    raise exception 'undo';
  exception when others then
    if sqlerrm <> 'undo' then v_out := v_out || 'FAIL  teacher part stopped: ' || sqlerrm || E'\n'; end if;
  end;

  -- ---------------------------------------------------------------
  -- Part C: the Google student claims their rows. Undone.
  -- ---------------------------------------------------------------
  begin
    insert into public.classes (name, school_year, join_code) values ('ROSTER CHECK 1', 2026, public.new_join_code()) returning id into v_c1;
    insert into public.classes (name, school_year, join_code, archived) values ('ROSTER CHECK 2', 2026, public.new_join_code(), true) returning id into v_c2;
    insert into public.classes (name, school_year, join_code) values ('ROSTER CHECK 3', 2026, public.new_join_code()) returning id into v_c3;
    insert into public.class_roster_entries (class_id, email, real_name, student_number) values
      (v_c1, v_gmail, 'Check Google', 4), (v_c2, v_gmail, 'Check Google', 4), (v_c3, v_gmail, 'Check Google', 4),
      (v_c1, 'roster.check.someone.else@example.jp', 'Someone Else', 5);
    insert into public.class_leaves (class_id, student_id, real_name) values (v_c3, v_google, 'Check Google');

    perform set_config('request.jwt.claims', json_build_object('sub', v_google, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_res := public.claim_my_roster();
    v_out := v_out || (case when v_res @> jsonb_build_array(jsonb_build_object('id', v_c1, 'needs_nickname', true))
                             and not v_res @> jsonb_build_array(jsonb_build_object('id', v_c2))
                             and not v_res @> jsonb_build_array(jsonb_build_object('id', v_c3))
                            then 'PASS' else 'FAIL' end)
                   || '  google student: claim joins the normal class only (not archived, not one I left)' || E'\n';
    v_res := public.claim_my_roster();
    v_out := v_out || (case when v_res @> jsonb_build_array(jsonb_build_object('id', v_c1)) then 'PASS' else 'FAIL' end)
                   || '  google student: a second claim still asks for the missing nickname' || E'\n';
    perform public.set_my_nickname(v_c1, 'rcheck');
    v_res := public.claim_my_roster();
    v_out := v_out || (case when not v_res @> jsonb_build_array(jsonb_build_object('id', v_c1)) then 'PASS' else 'FAIL' end)
                   || '  google student: no more question once the nickname is set' || E'\n';
    reset role;

    select m.real_name || '#' || m.student_number into v_got from public.class_members m where m.class_id = v_c1 and m.student_id = v_google;
    v_out := v_out || (case when v_got = 'Check Google#4' then 'PASS' else 'FAIL' end)
                   || '  google student: real name and number from the roster (' || coalesce(v_got, 'not a member') || ')' || E'\n';
    select count(*) into v_n from public.class_members m where m.student_id = v_google and m.class_id in (v_c2, v_c3);
    v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  google student: not added to the archived class or the class I left' || E'\n';
    select (select e.claimed_at is not null from public.class_roster_entries e where e.class_id = v_c3 and e.email = v_gmail)::text || ' '
        || (select e.claimed_at is null from public.class_roster_entries e where e.class_id = v_c2 and e.email = v_gmail)::text || ' '
        || (select e.claimed_at is null from public.class_roster_entries e where e.class_id = v_c1 and e.email <> v_gmail)::text
      into v_got;
    v_out := v_out || (case when v_got = 'true true true' then 'PASS' else 'FAIL' end)
                   || '  google student: left class marked claimed, archived row and someone else''s row untouched (' || v_got || ')' || E'\n';
    raise exception 'undo';
  exception when others then
    if sqlerrm <> 'undo' then v_out := v_out || 'FAIL  google student part stopped: ' || sqlerrm || E'\n'; end if;
  end;

  select count(*) into v_n from public.classes c where c.name like 'ROSTER CHECK%';
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  everything undone (made-up classes left: ' || v_n || ')' || E'\n';

  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
