-- =====================================================================
-- Polycards: check that students only see, add and remove their OWN single words (2026-11-04)
-- Run AFTER polycards-user-words.sql. Nothing in the database changes: every row made
-- during the check is undone at the end.
--
-- 1. Put a student's username (or full email) on the line marked  <-- STUDENT
--    (any account that is NOT in public.teachers, e.g. aiden). Any other account must exist
--    too (it plays "another student").
-- 2. Run the whole file. The result is one row per check: PASS, FAIL or INFO.
--    Every PASS / FAIL row should say PASS.
-- =====================================================================

do $$
declare
  v_who     text := 'aiden';   -- <-- STUDENT
  v_student uuid;
  v_other   uuid;              -- another account
  v_w1      uuid;              -- two library words
  v_w2      uuid;
  v_temp    uuid;              -- a made-up word, deleted again to check the cascade
  v_out     text := '';
  v_n       int;
  v_check   record;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;
  if exists (select 1 from public.teachers t where t.user_id = v_student) then
    raise exception '"%" is a teacher. Use a student account for this check.', v_who;
  end if;
  select u.id into v_other from auth.users u where u.id <> v_student limit 1;
  select w.id into v_w1 from public.words w order by w.id limit 1;
  select w.id into v_w2 from public.words w order by w.id offset 1 limit 1;

  -- Everything below is undone at the end (the block ends with an error on purpose).
  begin
    -- As the database owner: a single word belonging to the other account.
    insert into public.user_words (user_id, word_id) values (v_other, v_w1) on conflict do nothing;

    -- Logged out (anon): nothing at all.
    set local role anon;
    for v_check in
      select * from (values
        ('anon: read user_words',  'select count(*) from public.user_words'),
        ('anon: add a single word', format('insert into public.user_words (user_id, word_id) values (%L, %L)', v_other, v_w2))
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

    select count(*) into v_n from public.user_words where user_id <> v_student;
    v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  another student''s single words are invisible (' || v_n || ' seen)' || E'\n';

    begin
      insert into public.user_words (word_id) values (v_w2) on conflict do nothing;
      select count(*) into v_n from public.user_words where user_id = v_student and word_id = v_w2;
      v_out := v_out || (case when v_n = 1 then 'PASS' else 'FAIL' end) || '  add my own single word (user_id filled in by default)' || E'\n';
    exception when others then
      v_out := v_out || 'FAIL  add my own single word: ' || sqlerrm || E'\n';
    end;

    begin
      insert into public.user_words (user_id, word_id) values (v_other, v_w2);
      v_out := v_out || 'FAIL  add a single word for another student: it was allowed' || E'\n';
    exception when others then
      v_out := v_out || (case when position('row-level security' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  add a single word for another student (' || sqlerrm || ')' || E'\n';
    end;

    begin
      update public.user_words set added_at = now() where word_id = v_w2;
      v_out := v_out || 'FAIL  change a single word row: it was allowed' || E'\n';
    exception when others then
      v_out := v_out || (case when position('permission denied' in sqlerrm) > 0 then 'PASS' else 'FAIL' end)
                     || '  change a single word row (' || sqlerrm || ')' || E'\n';
    end;

    delete from public.user_words where user_id = v_other;
    reset role;
    select count(*) into v_n from public.user_words where user_id = v_other and word_id = v_w1;
    v_out := v_out || (case when v_n = 1 then 'PASS' else 'FAIL' end) || '  removing another student''s single word does nothing' || E'\n';

    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.user_words where word_id = v_w2;
    get diagnostics v_n = row_count;
    v_out := v_out || (case when v_n = 1 then 'PASS' else 'FAIL' end) || '  remove my own single word' || E'\n';
    reset role;

    -- A word deleted from the library takes its single-word rows with it.
    insert into public.words (english, japanese) values ('zzcheck', 'チェック用') returning id into v_temp;
    insert into public.user_words (user_id, word_id) values (v_student, v_temp);
    delete from public.words where id = v_temp;
    select count(*) into v_n from public.user_words where word_id = v_temp;
    v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  a deleted word removes its single-word rows' || E'\n';

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
