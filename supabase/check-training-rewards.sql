-- =====================================================================
-- Polyvo: check the ABCを書こう ticket rewards (2026-11-04)
-- Run AFTER polycards-training-rewards.sql. Changes nothing: every check
-- that writes something is undone straight away (the student's real
-- training progress and rewards are put back exactly as they were).
--
-- 1. Put a student's username (or full email) on the line marked  <-- STUDENT
--    (a TEST account, e.g. aiden; not a teacher).
-- 2. Run the whole file. One row per check: every row should say PASS.
-- =====================================================================

do $$
declare
  v_who     text := 'aiden';   -- <-- STUDENT
  v_student uuid;
  v_out     text := '';
  v_before  int;
  v_after   int;
  v_after2  int;
  v_n       int;
  v_n0      int;
  v_json    jsonb;
  v_json2   jsonb;
  v_text    text;
  c         int;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;

  perform public.gacha_ensure(v_student);

  -- From here on: signed in as the student
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_n0 from public.my_unseen_awards();

  -- Unknown reward id
  begin
    perform public.claim_training_reward('abc-digits');
    v_text := 'no error';
  exception when others then v_text := sqlerrm;
  end;
  v_out := v_out || (case when v_text = 'bad_reward' then 'PASS' else 'FAIL' end) || '  unknown reward → bad_reward (' || v_text || ')' || E'\n';

  begin
    delete from public.training_rewards where user_id = v_student;   -- refused (no delete grant) → error, nothing changed
    v_text := 'no error';
  exception when others then v_text := sqlerrm;
  end;
  v_out := v_out || (case when v_text like '%permission denied%' then 'PASS' else 'FAIL' end) || '  student can''t delete training_rewards (' || v_text || ')' || E'\n';

  -- 25 capitals (A–Y, no Z) plus small z: still not complete
  begin
    reset role;
    delete from public.training_rewards where user_id = v_student;
    delete from public.user_training_progress where user_id = v_student and practice_id like 'abc-%';
    set local role authenticated;
    for c in 97..121 loop perform public.record_training_completion('abc-upper-' || chr(c)); end loop;
    perform public.record_training_completion('abc-lower-z');
    perform public.claim_training_reward('abc-upper');
    v_text := 'no error';
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_text := sqlerrm; end if;
  end;
  v_out := v_out || (case when v_text = 'not_complete' then 'PASS' else 'FAIL' end) || '  25 capitals + small z → not_complete (' || v_text || ')' || E'\n';

  -- 26 capitals: +1 ticket; a second claim: already, +0; small letters still not complete;
  -- no award pop-up; the reward row is readable by the student
  begin
    reset role;
    delete from public.training_rewards where user_id = v_student;
    delete from public.user_training_progress where user_id = v_student and practice_id like 'abc-%';
    v_before := public.gacha_tickets_available(v_student);
    set local role authenticated;
    for c in 97..122 loop perform public.record_training_completion('abc-upper-' || chr(c)); end loop;
    perform public.record_training_completion('abc-upper-a');   -- a repeat doesn't count twice
    v_json := public.claim_training_reward('abc-upper');
    v_json2 := public.claim_training_reward('abc-upper');
    begin
      perform public.claim_training_reward('abc-lower');
      v_text := 'no error';
    exception when others then v_text := sqlerrm;
    end;
    select count(*) into v_n from public.my_unseen_awards();
    reset role;
    v_after := public.gacha_tickets_available(v_student);
    raise exception 'undo';
  exception when others then
    if sqlerrm <> 'undo' then v_text := sqlerrm; end if;
  end;
  v_out := v_out || (case when (v_json->>'already')::boolean = false then 'PASS' else 'FAIL' end) || '  26 capitals → claimed (' || coalesce(v_json::text, 'null') || ')' || E'\n';
  v_out := v_out || (case when v_after = v_before + 1 then 'PASS' else 'FAIL' end) || '  exactly +1 ticket (' || coalesce(v_before::text, '?') || ' → ' || coalesce(v_after::text, '?') || ')' || E'\n';
  v_out := v_out || (case when (v_json2->>'already')::boolean = true then 'PASS' else 'FAIL' end) || '  second claim → already, no second ticket (' || coalesce(v_json2::text, 'null') || ')' || E'\n';
  v_out := v_out || (case when v_text = 'not_complete' then 'PASS' else 'FAIL' end) || '  small letters still not_complete (' || v_text || ')' || E'\n';

  -- The reward never shows as a teacher award (my_unseen_awards was read while signed in)
  v_out := v_out || (case when v_n = v_n0 then 'PASS' else 'FAIL' end) || '  no teacher-award pop-up for it (unseen awards ' || coalesce(v_n0::text, '?') || ' → ' || coalesce(v_n::text, '?') || ')' || E'\n';

  -- Direct writes are refused
  set local role authenticated;
  begin
    insert into public.training_rewards (user_id, reward_id) values (v_student, 'abc-lower');
    v_text := 'no error';
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_text := sqlerrm; end if;
  end;
  v_out := v_out || (case when v_text like '%permission denied%' then 'PASS' else 'FAIL' end) || '  student can''t insert into training_rewards (' || v_text || ')' || E'\n';

  begin
    insert into public.ticket_gifts (user_id, tickets, note) values (v_student, 1, 'cheat');
    v_text := 'no error';
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_text := sqlerrm; end if;
  end;
  v_out := v_out || (case when v_text like '%permission denied%' then 'PASS' else 'FAIL' end) || '  student can''t insert into ticket_gifts (' || v_text || ')' || E'\n';

  begin
    update public.training_rewards set claimed_at = now() where user_id = v_student;
    v_text := 'no error';
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_text := sqlerrm; end if;
  end;
  v_out := v_out || (case when v_text like '%permission denied%' then 'PASS' else 'FAIL' end) || '  student can''t update training_rewards (' || v_text || ')' || E'\n';

  reset role;
  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
