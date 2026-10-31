-- =====================================================================
-- Polycards: check that students can't read card reports or anyone's screenshots (2026-10-31)
-- Run AFTER polycards-card-reports.sql. Nothing in the database changes: every report and file
-- row made during the check is undone at the end.
--
-- 1. Put a student's username (or full email) on the line marked  <-- STUDENT
--    (an account that is NOT in public.teachers, e.g. aiden). Any other account must exist too
--    (it plays "another student").
-- 2. Run the whole file. The result is one row per check: PASS, FAIL or INFO.
--    Every PASS / FAIL row should say PASS.
-- =====================================================================

do $$
declare
  v_who      text := 'aiden';   -- <-- STUDENT
  v_student  uuid;
  v_other    uuid;               -- another account
  v_words    uuid[];             -- 25 words for the daily-limit check
  v_other_r  uuid;               -- a report by the other account
  v_mine     uuid;               -- a report by the student
  v_out      text := '';
  v_n        int;
  v_sent     int := 0;
  v_today    int;
  v_bool     boolean;
  v_check    record;
  v_file_ok  boolean := false;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;
  if exists (select 1 from public.teachers t where t.user_id = v_student) then
    raise exception '"%" is a teacher. Use a student account for this check.', v_who;
  end if;
  select u.id into v_other from auth.users u where u.id <> v_student limit 1;
  select array_agg(id) into v_words from (select w.id from public.words w order by w.id limit 25) x;

  select public into v_bool from storage.buckets where id = 'report-screenshots';
  v_out := v_out || (case when v_bool = false then 'PASS' else 'FAIL' end)
                 || '  bucket report-screenshots is private (public = ' || coalesce(v_bool::text, 'missing') || ')' || E'\n';

  -- Everything below is undone at the end (the block ends with an error on purpose).
  begin
    -- As the database owner: a report and a screenshot file row belonging to the other account.
    insert into public.card_reports (user_id, word_id, source, reason)
    values (v_other, v_words[1], 'word_list', 'other') returning id into v_other_r;
    begin
      insert into storage.objects (bucket_id, name, owner) values ('report-screenshots', v_other || '/' || v_other_r || '.jpg', v_other);
      v_file_ok := true;
    exception when others then
      v_out := v_out || 'INFO  could not make a test file row (' || sqlerrm || '); the file checks below only cover an empty bucket' || E'\n';
    end;

    -- Logged out (anon): nothing at all.
    set local role anon;
    for v_check in
      select * from (values
        ('anon: read card_reports',       'select count(*) from public.card_reports'),
        ('anon: read card_reports_readable', 'select count(*) from public.card_reports_readable'),
        ('anon: submit_card_report',      format('select public.submit_card_report(%L, null, null, %L, %L)', v_words[1], 'word_list', 'other')),
        ('anon: attach_report_screenshot', format('select public.attach_report_screenshot(%L, %L)', v_other_r, 'x/y.jpg'))
      ) as c(label, stmt)
    loop
      begin
        execute v_check.stmt;
        raise exception 'no_error';
      exception when others then
        v_out := v_out || (case when sqlerrm = 'no_error' then 'FAIL  ' || v_check.label || ': it was allowed'
                                when position('permission denied' in sqlerrm) > 0 then 'PASS  ' || v_check.label || ' (' || sqlerrm || ')'
                                else 'FAIL  ' || v_check.label || ': unexpected error: ' || sqlerrm end) || E'\n';
      end;
    end loop;
    reset role;

    -- From here on: signed in as the student.
    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;

    for v_check in
      select * from (values
        ('read card_reports',            'select count(*) from public.card_reports',                                  'permission denied'),
        ('read card_reports_readable',   'select count(*) from public.card_reports_readable',                         'permission denied'),
        ('insert into card_reports',     format('insert into public.card_reports (user_id, word_id, source, reason) values (%L, %L, %L, %L)', v_student, v_words[1], 'review', 'other'), 'permission denied'),
        ('update card_reports',          'update public.card_reports set status = ''fixed''',                         'permission denied'),
        ('delete card_reports',          'delete from public.card_reports',                                           'permission denied'),
        ('submit: unknown reason',       format('select public.submit_card_report(%L, null, null, %L, %L)', v_words[1], 'word_list', 'hack'), 'bad_report'),
        ('submit: unknown direction',    format('select public.submit_card_report(%L, %L, null, %L, %L)', v_words[1], 'sideways', 'review', 'other'), 'bad_report'),
        ('submit: note over 500',        format('select public.submit_card_report(%L, null, null, %L, %L, %L)', v_words[1], 'word_list', 'other', repeat('a', 501)), 'note_too_long'),
        ('submit: answer over 100',      format('select public.submit_card_report(%L, null, null, %L, %L, null, %L)', v_words[1], 'word_list', 'other', repeat('a', 101)), 'answer_too_long'),
        ('submit: made-up word',         format('select public.submit_card_report(%L, null, null, %L, %L)', gen_random_uuid(), 'word_list', 'other'), 'word_not_found'),
        ('attach: another student''s report', format('select public.attach_report_screenshot(%L, %L)', v_other_r, v_student || '/' || v_other_r || '.jpg'), 'report_not_found'),
        ('attach: made-up report',       format('select public.attach_report_screenshot(%L, %L)', gen_random_uuid(), v_student || '/x.jpg'), 'report_not_found'),
        ('upload into another student''s folder', format('insert into storage.objects (bucket_id, name, owner) values (%L, %L, %L)', 'report-screenshots', v_other || '/hack.jpg', v_student), 'row-level security')
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

    -- Screenshots: no file rows visible (not even the other student's), none can be changed or deleted.
    select count(*) into v_n from storage.objects o where o.bucket_id = 'report-screenshots';
    v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  screenshot files visible: ' || v_n
                   || (case when v_file_ok then ' (one exists)' else '' end) || E'\n';
    begin
      update storage.objects set name = 'x' where bucket_id = 'report-screenshots';
      get diagnostics v_n = row_count;
      v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  rename screenshot files: ' || v_n || ' changed' || E'\n';
    exception when others then
      v_out := v_out || 'PASS  rename screenshot files (' || sqlerrm || ')' || E'\n';
    end;
    begin
      delete from storage.objects where bucket_id = 'report-screenshots';
      get diagnostics v_n = row_count;
      v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  delete screenshot files: ' || v_n || ' deleted' || E'\n';
    exception when others then
      v_out := v_out || 'PASS  delete screenshot files (' || sqlerrm || ')' || E'\n';
    end;

    -- What students CAN do: send a report, attach their own screenshot once.
    begin
      v_mine := public.submit_card_report(v_words[2], 'jp2en', null, 'review', 'spelling', 'test', 'colour', 'typing',
                                          '{"theme":"midnight","secret":"dropped"}'::jsonb);
      v_out := v_out || 'PASS  submit_card_report works' || E'\n';
      v_sent := 1;
    exception when others then
      v_out := v_out || 'FAIL  submit_card_report: ' || sqlerrm || E'\n';
    end;
    begin
      perform public.submit_card_report(v_words[2], 'jp2en', null, 'review', 'spelling');
      v_out := v_out || 'FAIL  the same report twice: it was allowed' || E'\n';
    exception when others then
      v_out := v_out || (case when position('already_reported' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  the same report twice (' || sqlerrm || ')' || E'\n';
    end;
    if v_mine is not null then
      begin
        perform public.attach_report_screenshot(v_mine, v_other || '/' || v_mine || '.jpg');
        v_out := v_out || 'FAIL  attach a path in another student''s folder: it was allowed' || E'\n';
      exception when others then
        v_out := v_out || (case when position('report_not_found' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                       || '  attach a path in another student''s folder (' || sqlerrm || ')' || E'\n';
      end;
      begin
        perform public.attach_report_screenshot(v_mine, v_student || '/' || v_mine || '.jpg');
        v_out := v_out || 'PASS  attach my own screenshot' || E'\n';
      exception when others then
        v_out := v_out || 'FAIL  attach my own screenshot: ' || sqlerrm || E'\n';
      end;
      begin
        perform public.attach_report_screenshot(v_mine, v_student || '/' || v_mine || '.jpg');
        v_out := v_out || 'FAIL  attach a second screenshot: it was allowed' || E'\n';
      exception when others then
        v_out := v_out || (case when position('report_not_found' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                       || '  attach a second screenshot (' || sqlerrm || ')' || E'\n';
      end;
    end if;

    -- Daily limit: keep sending reports on other words until it stops.
    for i in 3..25 loop
      begin
        perform public.submit_card_report(v_words[i], null, null, 'word_list', 'other');
        v_sent := v_sent + 1;
      exception when others then
        exit when position('report_limit' in sqlerrm) > 0;
        v_out := v_out || 'FAIL  daily limit check: unexpected error: ' || sqlerrm || E'\n';
        exit;
      end;
    end loop;
    reset role;
    select count(*) into v_today from public.card_reports r
    where r.user_id = v_student and r.created_at >= (((now() at time zone 'Asia/Tokyo')::date)::timestamp at time zone 'Asia/Tokyo');
    v_out := v_out || (case when v_today = 20 then 'PASS' else 'FAIL' end) || '  daily limit: stopped at ' || v_today
                   || ' reports today (' || v_sent || ' sent by this check)' || E'\n';
    if v_mine is not null then
      select r.context into strict v_check from public.card_reports r where r.id = v_mine;
      v_out := v_out || (case when not (v_check.context ? 'secret') then 'PASS' else 'FAIL' end)
                     || '  unknown context keys are dropped: ' || v_check.context::text || E'\n';
    end if;

    raise exception 'undo_all';
  exception when others then
    if sqlerrm <> 'undo_all' then v_out := v_out || 'FAIL  the check stopped: ' || sqlerrm || E'\n'; end if;
  end;

  reset role;
  v_out := v_out || 'INFO  everything made by this check was undone' || E'\n';
  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
