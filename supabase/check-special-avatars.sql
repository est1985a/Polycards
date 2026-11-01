-- =====================================================================
-- Polyvo: check the rank-up pop-up and Special Polyavatars (2026-11-01)
-- Run AFTER polycards-rankup-special.sql. Changes nothing: every check
-- that writes something is undone straight away.
--
-- 1. Put a student's username (or full email) on the line marked  <-- STUDENT
--    (a TEST account, e.g. aiden; not a teacher).
-- 2. Run the whole file. One row per check: PASS or FAIL (INFO rows are
--    just information). Every PASS/FAIL row should say PASS.
-- =====================================================================

do $$
declare
  v_who     text := 'aiden';   -- <-- STUDENT
  v_student uuid;
  v_out     text := '';
  v_n       int;
  v_rank    int;
  v_seen    int;
  v_json    jsonb;
  v_text    text;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;

  -- The five Specials exist, with ranks 80–120, and the gacha list never has them
  select count(*) into v_n from public.avatars a
  where a.rarity = 'special' and a.active and a.unlock_rank in (80, 90, 100, 110, 120);
  v_out := v_out || (case when v_n = 5 then 'PASS' else 'FAIL' end) || '  five Special Polyavatars (found ' || v_n || ')' || E'\n';
  select count(*) into v_n from public.gacha_remaining(v_student) r where r.rarity = 'special';
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  gacha_remaining never lists special' || E'\n';
  select count(*) into v_n from public.gacha_remaining('00000000-0000-0000-0000-000000000000'::uuid) r where r.rarity = 'special';
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  gacha_remaining never lists special (empty account)' || E'\n';

  -- Peak raised to rank 80 (made up, undone): Bronze only, today's date
  begin
    -- Rank 80 needs (80 - 1)^2 * 10 = 62,410 EXP; minus any spelling bonus is still ≥ rank 80.
    delete from public.user_avatars ua using public.avatars a
    where ua.avatar_id = a.id and a.rarity = 'special' and ua.user_id = v_student;
    insert into public.user_stats (user_id, peak_points) values (v_student, 62410)
    on conflict (user_id) do update set peak_points = 62410;
    select count(*), string_agg(a.slug, ',' order by a.unlock_rank) into v_n, v_text
    from public.user_avatars ua join public.avatars a on a.id = ua.avatar_id
    where ua.user_id = v_student and a.rarity = 'special' and ua.obtained_at > now() - interval '1 minute';
    raise exception 'undo';
  exception when others then
    v_out := v_out || (case when sqlerrm = 'undo' and v_n >= 1 and v_text like 'special-bronze%' then 'PASS' else 'FAIL' end)
                   || '  rank 80 gives Special(s) at once (' || coalesce(v_text, 'none') || '; ' || sqlerrm || ')' || E'\n';
  end;

  -- From here on: signed in as the student
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform public.grant_special_avatars(v_student);
    v_text := 'no error';
  exception when others then v_text := sqlerrm;
  end;
  v_out := v_out || (case when v_text like '%permission denied%' then 'PASS' else 'FAIL' end) || '  student can''t call grant_special_avatars (' || v_text || ')' || E'\n';

  begin
    insert into public.user_avatars (user_id, avatar_id)
    select v_student, a.id from public.avatars a where a.slug = 'special-diamond';
    v_text := 'no error';
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_text := sqlerrm; end if;
  end;
  v_out := v_out || (case when v_text <> 'no error' then 'PASS' else 'FAIL' end) || '  student can''t insert a Special into user_avatars (' || v_text || ')' || E'\n';

  begin
    update public.user_gacha set last_seen_rank = 999 where user_id = v_student;
    get diagnostics v_n = row_count;
    v_text := v_n || ' row(s)';
    raise exception 'undo';
  exception when others then if sqlerrm <> 'undo' then v_text := sqlerrm; end if;
  end;
  v_out := v_out || (case when v_text in ('0 row(s)') or v_text like '%permission denied%' then 'PASS' else 'FAIL' end) || '  student can''t write last_seen_rank directly (' || v_text || ')' || E'\n';

  v_json := public.rank_rewards();
  v_rank := (v_json->>'rank')::int;
  v_out := v_out || 'INFO  rank_rewards: rank ' || v_rank || ', last_seen_rank ' || (v_json->>'last_seen_rank') || ', specials ' || jsonb_array_length(v_json->'specials') || E'\n';
  v_out := v_out || (case when jsonb_array_length(v_json->'specials') = 5 then 'PASS' else 'FAIL' end) || '  rank_rewards lists 5 specials' || E'\n';

  begin
    v_seen := public.mark_rank_seen(999);
    raise exception 'undo';
  exception when others then null;
  end;
  v_out := v_out || (case when v_seen <= v_rank then 'PASS' else 'FAIL' end) || '  mark_rank_seen(999) saves at most the real rank (' || v_seen || ')' || E'\n';

  select count(*) into v_n from public.gacha_collection() c where c.rarity = 'special' and c.unlock_rank is not null;
  v_out := v_out || (case when v_n = 5 then 'PASS' else 'FAIL' end) || '  gacha_collection shows the Special section with ranks' || E'\n';

  reset role;
  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
