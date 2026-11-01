-- =====================================================================
-- Polyvo: check the Halloween 2026 event (2026-11-01)
-- Run AFTER polycards-halloween-2026.sql. Changes nothing: every check that
-- writes something (tickets, pulls, a pretend end date) is undone at once.
--
-- 1. Put a student's username (or full email) on the line marked  <-- STUDENT
--    (a TEST account, e.g. aiden; not a teacher).
-- 2. Run the whole file (takes a few seconds: about 450 pretend pulls).
--    One row per check: PASS or FAIL (INFO rows are just information).
--    Every PASS/FAIL row should say PASS.
-- Run it while the event is on (before 2026-11-08 23:59 Japan time):
-- after that the boost checks say FAIL on purpose (there is no boost then).
-- =====================================================================

do $$
declare
  v_who      text := 'aiden';   -- <-- STUDENT
  v_student  uuid;
  v_out      text := '';
  v_n        int;
  v_m        int;
  v_left     int;
  v_hits     int;
  v_pulls    int := 200;
  v_json     jsonb;
  v_text     text;
  v_ids      bigint[];
  v_series   text;
  v_specials int;
  v_dupes    int;
  v_ok       boolean;
  i          int;
begin
  select u.id into v_student from auth.users u
  where lower(u.raw_user_meta_data->>'username') = lower(v_who) or lower(u.email) = lower(v_who);
  if v_student is null then raise exception 'No account found for "%"', v_who; end if;

  -- 1. The six avatars
  select count(*) into v_n from public.avatars a
  where a.series = 'Halloween 2026' and a.active and not a.is_starter and a.unlock_rank is null
    and a.image_url = '/avatars/' || a.slug || '.svg'
    and (a.slug, a.rarity) in (('halloween-pumpkin-jack', 'super_rare'), ('halloween-skeleton', 'rare'),
                               ('halloween-ghost', 'rare'), ('halloween-black-cat', 'normal'),
                               ('halloween-bat', 'normal'), ('halloween-cauldron', 'normal'));
  v_out := v_out || (case when v_n = 6 then 'PASS' else 'FAIL' end) || '  six Halloween 2026 Polyavatars, right rarity and picture (found ' || v_n || ')' || E'\n';

  -- 2. Settings
  select (e.ends_at = timestamptz '2026-11-08 23:59:59+09' and e.share = 0.5 and e.series = 'Halloween 2026'),
         e.series
  into v_ok, v_series
  from public.gacha_event_setting() e;
  v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end) || '  event ends 2026-11-08 23:59:59 Japan time, share 50%' || E'\n';
  v_out := v_out || (case when exists (select 1 from public.gacha_event_setting() e where now() <= e.ends_at)
                          then 'INFO  the event is on now' else 'INFO  the event has ENDED' end) || E'\n';

  -- 3. The boost (made-up tickets and pulls, all undone)
  begin
    insert into public.ticket_gifts (user_id, tickets, note)
    select v_student, 50, 'check-halloween-2026 (undone)' from generate_series(1, 10);
    delete from public.user_avatars ua using public.avatars a
    where ua.avatar_id = a.id and ua.user_id = v_student and a.series = 'Halloween 2026';

    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_json := public.gacha_status();
    reset role;

    v_hits := 0;
    for i in 1 .. v_pulls loop
      update public.user_gacha set pulls_since_secret = 0 where user_id = v_student;
      set local role authenticated;
      v_json := v_json || jsonb_build_object('last', public.gacha_pull());
      reset role;
      if v_json #>> '{last,avatar,series}' = 'Halloween 2026' then v_hits := v_hits + 1; end if;
      delete from public.user_avatars
      where user_id = v_student and avatar_id = (v_json #>> '{last,avatar,id}')::bigint;
    end loop;
    raise exception 'undo';
  exception when others then
    v_text := sqlerrm;
  end;
  v_out := v_out || (case when v_text = 'undo' and (v_json #>> '{event,active}')::boolean
                               and (v_json #>> '{event,share}')::numeric = 50
                               and (v_json #>> '{event,total}')::int = 6
                          then 'PASS' else 'FAIL' end)
                 || '  gacha_status: event on, Halloween share 50%, 6 in the set (' || coalesce(v_json->>'event', 'no event') || ')' || E'\n';
  select coalesce(sum(value::numeric), 0) into v_m from jsonb_each_text(v_json->'odds');
  v_out := v_out || (case when v_m between 99 and 101 then 'PASS' else 'FAIL' end)
                 || '  odds add up to 100% (' || coalesce(v_json->>'odds', '?') || ')' || E'\n';
  v_out := v_out || (case when v_text = 'undo' and v_hits between v_pulls * 0.35 and v_pulls * 0.65 then 'PASS' else 'FAIL' end)
                 || '  event on: about half the pulls are Halloween (' || coalesce(v_hits, 0) || ' of ' || v_pulls || '; ' || v_text || ')' || E'\n';

  -- 4. Never a duplicate: start with nothing but the starter, pull until the collection is complete
  begin
    insert into public.ticket_gifts (user_id, tickets, note)
    select v_student, 50, 'check-halloween-2026 (undone)' from generate_series(1, 10);
    delete from public.user_avatars ua using public.avatars a
    where ua.avatar_id = a.id and ua.user_id = v_student and not a.is_starter and a.rarity <> 'special';
    select coalesce(sum(r.remaining), 0) into v_left from public.gacha_remaining(v_student) r;

    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    v_ids := '{}';
    v_dupes := 0;
    v_specials := 0;
    for i in 1 .. v_left loop
      set local role authenticated;
      v_json := public.gacha_pull();
      reset role;
      if (v_json #>> '{avatar,id}')::bigint = any (v_ids) then v_dupes := v_dupes + 1; end if;
      if v_json #>> '{avatar,rarity}' = 'special' then v_specials := v_specials + 1; end if;
      v_ids := v_ids || (v_json #>> '{avatar,id}')::bigint;
    end loop;

    begin
      set local role authenticated;
      perform public.gacha_pull();
      v_text := 'no error';
    exception when others then v_text := sqlerrm;
    end;
    reset role;
    raise exception 'undo';
  exception when others then
    if sqlerrm <> 'undo' then v_text := sqlerrm; end if;
  end;
  v_out := v_out || (case when v_dupes = 0 and v_specials = 0 and coalesce(array_length(v_ids, 1), 0) = v_left and v_left > 0
                          then 'PASS' else 'FAIL' end)
                 || '  ' || coalesce(array_length(v_ids, 1), 0) || ' pulls, ' || v_dupes || ' duplicates, '
                 || v_specials || ' Specials (expected ' || v_left || ', 0, 0)' || E'\n';
  v_out := v_out || (case when v_text = 'collection_complete' then 'PASS' else 'FAIL' end)
                 || '  one more pull says collection_complete (' || v_text || ')' || E'\n';

  -- 5. After the end date (pretend: the setting is changed to 1 minute ago, then undone)
  begin
    execute $f$
      create or replace function public.gacha_event_setting()
      returns table (series text, ends_at timestamptz, share numeric)
      language sql stable set search_path = ''
      as $b$ select 'Halloween 2026'::text, now() - interval '1 minute', 0.5::numeric $b$
    $f$;
    insert into public.ticket_gifts (user_id, tickets, note)
    select v_student, 50, 'check-halloween-2026 (undone)' from generate_series(1, 10);
    delete from public.user_avatars ua using public.avatars a
    where ua.avatar_id = a.id and ua.user_id = v_student and a.series = 'Halloween 2026';

    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_json := public.gacha_status();
    reset role;

    v_hits := 0;
    for i in 1 .. v_pulls loop
      update public.user_gacha set pulls_since_secret = 0 where user_id = v_student;
      set local role authenticated;
      v_json := v_json || jsonb_build_object('last', public.gacha_pull());
      reset role;
      if v_json #>> '{last,avatar,series}' = 'Halloween 2026' then v_hits := v_hits + 1; end if;
      delete from public.user_avatars
      where user_id = v_student and avatar_id = (v_json #>> '{last,avatar,id}')::bigint;
    end loop;
    raise exception 'undo';
  exception when others then
    v_text := sqlerrm;
  end;
  v_out := v_out || (case when v_text = 'undo' and not (v_json #>> '{event,active}')::boolean
                               and (v_json #>> '{event,share}')::numeric = 0
                          then 'PASS' else 'FAIL' end)
                 || '  after the end: event off, no Halloween share (' || coalesce(v_json->>'event', 'no event') || ')' || E'\n';
  v_out := v_out || (case when v_text = 'undo' and v_hits > 0 and v_hits < v_pulls * 0.3 then 'PASS' else 'FAIL' end)
                 || '  after the end: Halloween still in the pool, no boost (' || coalesce(v_hits, 0) || ' of ' || v_pulls || ', about 11% expected)' || E'\n';
  select (e.ends_at = timestamptz '2026-11-08 23:59:59+09') into v_ok from public.gacha_event_setting() e;
  v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end) || '  the real end date is back after the pretend one' || E'\n';

  -- 6. Students can't call the internal helpers
  perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
  set local role authenticated;
  foreach v_text in array array[
    'select * from public.gacha_event_setting()',
    format('select * from public.gacha_remaining_split(%L)', v_student),
    format('select public.gacha_event_boost_on(%L)', v_student),
    format('select public.gacha_odds(%L)', v_student)]
  loop
    begin
      execute v_text;
      v_out := v_out || 'FAIL  student could run: ' || v_text || E'\n';
    exception when others then
      v_out := v_out || (case when sqlerrm like '%permission denied%' then 'PASS' else 'FAIL' end)
                     || '  student can''t run ' || split_part(split_part(v_text, 'public.', 2), '(', 1) || ' (' || sqlerrm || ')' || E'\n';
    end;
  end loop;
  reset role;

  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
