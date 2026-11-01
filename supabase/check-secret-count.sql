-- =====================================================================
-- Polyvo: check that students can't count the Secret Polyavatars (2026-11-01)
-- Run AFTER polycards-hide-secret-count.sql. Changes nothing: the one check
-- that writes something (pretending the student owns every Secret) is undone
-- straight away.
--
-- 1. Put a student's username (or full email) on the line marked  <-- STUDENT
--    (a TEST account, e.g. aiden; not a teacher).
-- 2. Run the whole file. One row per check: PASS or FAIL (INFO rows are
--    just information). Every PASS/FAIL row should say PASS.
-- =====================================================================

do $$
declare
  v_who       text := 'aiden';   -- <-- STUDENT
  v_student   uuid;
  v_out       text := '';
  v_n         int;
  v_expected  int;
  v_missing   int;
  v_rows      int;
  v_json      jsonb;
  v_text      text;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;

  -- What the student should see (worked out here, with full access)
  select count(*) into v_expected from public.avatars a
  where a.active and (a.rarity <> 'secret'
                      or exists (select 1 from public.user_avatars ua where ua.user_id = v_student and ua.avatar_id = a.id));
  select count(*) into v_missing from public.avatars a
  where a.active and a.rarity = 'secret'
    and not exists (select 1 from public.user_avatars ua where ua.user_id = v_student and ua.avatar_id = a.id);
  v_out := v_out || 'INFO  expected total ' || v_expected || '; Secrets still missing: ' || (case when v_missing > 0 then 'some' else 'none' end) || E'\n';

  -- Pretend the student owns every Secret (undone): no ??? row is left
  begin
    insert into public.user_avatars (user_id, avatar_id)
    select v_student, a.id from public.avatars a where a.active and a.rarity = 'secret'
    on conflict do nothing;
    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into v_n from public.gacha_collection() c where c.rarity = 'secret' and not c.owned;
    v_json := public.gacha_status();
    raise exception 'undo';
  exception when others then
    v_out := v_out || (case when sqlerrm = 'undo' and v_n = 0 then 'PASS' else 'FAIL' end)
                   || '  every Secret owned: no ??? row (' || coalesce(v_n::text, '?') || '; ' || sqlerrm || ')' || E'\n';
    v_out := v_out || (case when sqlerrm = 'undo' and coalesce((v_json->'odds'->>'secret')::numeric, -1) = 0 then 'PASS' else 'FAIL' end)
                   || '  every Secret owned: Secret odds 0%' || E'\n';
  end;

  -- From here on: signed in as the student
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- gacha_collection: at most one missing-Secret row per series, with nothing in it
  select coalesce(max(n), 0) into v_n from (
    select count(*) as n from public.gacha_collection() c
    where c.rarity = 'secret' and not c.owned group by c.series) s;
  v_out := v_out || (case when v_n <= 1 then 'PASS' else 'FAIL' end) || '  at most one ??? row per series (' || v_n || ')' || E'\n';

  select count(*) into v_n from public.gacha_collection() c
  where c.rarity = 'secret' and not c.owned
    and (c.id is not null or c.slug is not null or c.name_ja is not null or c.name_en is not null
         or c.image_url is not null or c.sort_order is not null or c.obtained_at is not null or c.equipped);
  v_out := v_out || (case when v_n = 0 then 'PASS' else 'FAIL' end) || '  the ??? row has no id, name, picture or order' || E'\n';

  select count(*) into v_n from public.gacha_collection() c where c.rarity = 'secret' and not c.owned;
  v_out := v_out || (case when (v_n > 0) = (v_missing > 0) then 'PASS' else 'FAIL' end) || '  ??? shown only while a Secret is missing' || E'\n';

  select count(*) into v_rows from public.gacha_collection() c where not (c.rarity = 'secret' and not c.owned);
  v_out := v_out || (case when v_rows = v_expected then 'PASS' else 'FAIL' end) || '  collection rows (without ???) = expected total (' || v_rows || ')' || E'\n';

  -- gacha_status: total and remaining don't count missing Secrets
  v_json := public.gacha_status();
  v_out := v_out || (case when (v_json->>'total')::int = v_expected then 'PASS' else 'FAIL' end)
                 || '  gacha_status total = expected (' || (v_json->>'total') || ')' || E'\n';
  select count(*) into v_n from public.gacha_collection() c where not c.owned and c.rarity not in ('secret', 'special');
  v_out := v_out || (case when (v_json->>'remaining')::int = v_n + (case when v_missing > 0 then 1 else 0 end) then 'PASS' else 'FAIL' end)
                 || '  gacha_status remaining counts missing Secrets as 1 at most (' || (v_json->>'remaining') || ')' || E'\n';
  v_out := v_out || (case when (v_json->>'owned')::int <= (v_json->>'total')::int then 'PASS' else 'FAIL' end)
                 || '  owned ≤ total' || E'\n';

  -- The student still can't read the avatars table
  begin
    select count(*) into v_n from public.avatars where rarity = 'secret';
    v_text := v_n || ' row(s)';
  exception when others then v_text := sqlerrm;
  end;
  v_out := v_out || (case when v_text like '%permission denied%' or v_text = '0 row(s)' then 'PASS' else 'FAIL' end)
                 || '  avatars table not readable (' || v_text || ')' || E'\n';

  reset role;
  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
