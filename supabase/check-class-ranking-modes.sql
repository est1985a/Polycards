-- =====================================================================
-- Polyvo: check the class ranking by typing / handwriting (2026-11-05)
-- Run AFTER polycards-class-ranking-modes.sql. Read-only: everything it makes is rolled back at the
-- end (made-up words, classes, throwaway accounts zz-rank-check-…@polycards.test, answers, stats),
-- so nothing in the database changes.
--
-- Nothing to fill in: every account it uses is a throwaway one made (and rolled back) by the check,
-- so a real student's own answers this week can't change the numbers.
-- Run the whole file. The result is one row per check: PASS or FAIL. Every row should say PASS.
--
-- What it builds:
--   * a made-up class (ranking on) with a throwaway student "zzme" and other throwaway students;
--   * zzme answers 7 made-up cards through the REAL record_answer(), as the app does:
--       typing exact (main word)                       counts for タイピング
--       typing exact via an accepted alternate         counts for タイピング
--       handwriting with a look-alike warning          counts for 手書き (the app sends the target word)
--       tap わかった, typing close, typing wrong, わからない   don't count (but are reviews)
--       the close card again in the same session, spelled right = a repeat: doesn't count anywhere
--     → タイピング 2, 手書き 1, reviews 7;
--   * throwaway students, with answer rows written directly:
--       9 students with 2 handwriting answers each (a tie at rank 1, reached one second apart)
--       one at Monday 00:00 JST this week (counts) and Sunday 23:59:59 JST last week (last week only)
--       a member without a nickname, and a student of ANOTHER class (never on the board)
--   * the switch: off → the student gets no boards, a teacher of the class still does; archived → none.
-- =====================================================================

do $$
declare
  v_student  uuid;
  v_out      text := '';
  v_class    uuid;
  v_other    uuid;
  v_monday   date := date_trunc('week', (now() at time zone 'Asia/Tokyo')::date)::date;
  v_mon_ts   timestamptz;
  v_session  uuid := gen_random_uuid();
  v_w        uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                             gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_fake     uuid[] := '{}';
  v_tie      uuid[] := '{}';
  v_edge     uuid;
  v_nonick   uuid;
  v_outsider uuid;
  v_teacher  uuid;
  v_id       uuid;
  v_b        jsonb;
  v_t        jsonb;
  v_n        int;
  v_txt      text;
  v_ok       boolean;
begin
  v_mon_ts := v_monday::timestamp at time zone 'Asia/Tokyo';

  begin   -- everything in here is rolled back at the end
    -- Throwaway accounts: 9 tie students, edge, no-nickname, outsider, teacher, and zzme
    for i in 1..14 loop
      v_id := gen_random_uuid();
      insert into auth.users (id, aud, role, email, raw_user_meta_data)
      values (v_id, 'authenticated', 'authenticated', format('zz-rank-check-%s-%s@polycards.test', i, left(v_id::text, 8)),
              '{}'::jsonb);
      v_fake := v_fake || v_id;
    end loop;
    v_tie := v_fake[1:9];
    v_edge := v_fake[10]; v_nonick := v_fake[11]; v_outsider := v_fake[12]; v_teacher := v_fake[13];
    v_student := v_fake[14];

    -- Made-up classes
    insert into public.classes (name, school_year, join_code, school_id) values ('zz rank check', 2026, public.new_join_code(), 'f0000000-0000-4000-8000-000000000001')
    returning id into v_class;
    insert into public.classes (name, school_year, join_code, school_id) values ('zz rank check other', 2026, public.new_join_code(), 'f0000000-0000-4000-8000-000000000001')
    returning id into v_other;
    insert into public.class_members (class_id, student_id, real_name, nickname) values (v_class, v_student, 'Check', 'zzme');
    for i in 1..9 loop
      insert into public.class_members (class_id, student_id, real_name, nickname)
      values (v_class, v_tie[i], 'Tie ' || i, 'zztie' || i);
    end loop;
    insert into public.class_members (class_id, student_id, real_name, nickname) values
      (v_class, v_edge, 'Edge', 'zzedge'),
      (v_class, v_nonick, 'No nickname', null),
      (v_other, v_outsider, 'Outsider', 'zzoutsider');
    insert into public.teachers (user_id) values (v_teacher) on conflict do nothing;
    -- polyvo-schools-phase1.sql: a teacher also needs an approved membership in the class's school
    insert into public.school_teachers (school_id, user_id, role, status)
    values ('f0000000-0000-4000-8000-000000000001', v_teacher, 'teacher', 'approved');
    insert into public.class_teachers (class_id, teacher_id) values (v_class, v_teacher);

    -- Made-up words (w2 has an accepted alternate) and due Japanese → English cards for the student
    insert into public.words (id, english, japanese, alt_answers) values
      (v_w[1], 'zzalpha', 'チェック1', '{}'),
      (v_w[2], 'zzbravo', 'チェック2', '{zzcharlie}'),
      (v_w[3], 'zzdelta', 'チェック3', '{}'),
      (v_w[4], 'zzecho', 'チェック4', '{}'),
      (v_w[5], 'zzfoxtrot', 'チェック5', '{}'),
      (v_w[6], 'zzgolf', 'チェック6', '{}'),
      (v_w[7], 'zzhotel', 'チェック7', '{}');
    for i in 1..7 loop
      insert into public.user_cards (user_id, word_id, direction, level, next_review_at)
      values (v_student, v_w[i], case when i = 4 then 'en2jp' else 'jp2en' end, 0, now() - interval '1 minute');
    end loop;

    -- zzme answers, through the real record_answer (as the app does)
    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_answer(v_w[1], 'jp2en', 'got_it',    v_session, 'zzalpha',   'typing');      -- exact
    perform public.record_answer(v_w[2], 'jp2en', 'got_it',    v_session, 'zzcharlie', 'typing');      -- alternate
    perform public.record_answer(v_w[3], 'jp2en', 'got_it',    v_session, 'zzdelta',   'handwriting'); -- look-alike: target sent
    perform public.record_answer(v_w[4], 'en2jp', 'got_it',    v_session, null,        'tap');         -- tap
    perform public.record_answer(v_w[5], 'jp2en', 'not_yet',   v_session, 'zzfoxtrat', 'typing');      -- close
    perform public.record_answer(v_w[6], 'jp2en', 'not_yet',   v_session, 'qqqq',      'typing');      -- wrong
    perform public.record_answer(v_w[7], 'jp2en', 'dont_know', v_session, null,        'typing');      -- わからない
    perform public.record_answer(v_w[5], 'jp2en', 'got_it',    v_session, 'zzfoxtrot', 'typing');      -- repeat, exact
    reset role;

    select count(*) into v_n from public.answer_log l
    where l.session_id = v_session and l.spelling = 'exact' and l.is_repeat = false;
    v_out := v_out || (case when v_n = 3 then 'PASS' else 'FAIL' end)
      || format('  record_answer marked main word, alternate and handwriting as exact first answers: %s (expected 3)', v_n) || E'\n';
    select count(*) into v_n from public.answer_log l
    where l.session_id = v_session and l.word_id = v_w[5] and l.is_repeat and l.spelling = 'exact';
    v_out := v_out || (case when v_n = 1 then 'PASS' else 'FAIL' end)
      || format('  the close card spelled right later in the same session is a repeat: %s (expected 1)', v_n) || E'\n';

    -- Throwaway answers, written directly (times inside this week, so the check works any day)
    for i in 1..9 loop
      insert into public.answer_log (user_id, session_id, word_id, direction, result, is_repeat, typed, typed_answer,
                                     spelling, level_before, level_after, answer_mode, answered_at)
      select v_tie[i], gen_random_uuid(), v_w[3], 'jp2en', 'got_it', false, true, 'zzdelta', 'exact', 0, 1,
             'handwriting', v_mon_ts + make_interval(secs => i * 10 + k)
      from generate_series(1, 2) k;
    end loop;
    insert into public.answer_log (user_id, session_id, word_id, direction, result, is_repeat, typed, typed_answer,
                                   spelling, level_before, level_after, answer_mode, answered_at) values
      (v_edge, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts),
      (v_edge, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing',
       v_mon_ts - interval '1 second'),
      (v_nonick, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts),
      (v_nonick, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts),
      (v_nonick, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts),
      (v_outsider, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts),
      (v_outsider, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts),
      (v_outsider, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts),
      (v_outsider, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts),
      (v_outsider, gen_random_uuid(), v_w[1], 'jp2en', 'got_it', false, true, 'zzalpha', 'exact', 0, 1, 'typing', v_mon_ts);

    -- The board, as the student
    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_b := public.class_leaderboard(v_class);
    reset role;

    -- タイピング: the student 2 (main word + alternate), edge 1 (Monday 00:00). Nobody else.
    v_t := v_b->'boards'->'typing';
    v_ok := jsonb_array_length(v_t->'top') = 2
        and v_t->'top'->0->>'nickname' = 'zzme' and (v_t->'top'->0->>'count')::int = 2 and (v_t->'top'->0->>'is_me')::boolean
        and v_t->'top'->1->>'nickname' = 'zzedge' and (v_t->'top'->1->>'count')::int = 1;
    v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end)
      || '  typing board: zzme 2 (main word + alternate), zzedge 1 — got ' || coalesce((v_t->'top')::text, 'null') || E'\n';
    v_out := v_out || (case when (v_t->'me'->>'rank')::int = 1 and (v_t->'me'->>'count')::int = 2 then 'PASS' else 'FAIL' end)
      || '  typing: my place = rank 1, 2 words — got ' || coalesce((v_t->'me')::text, 'null') || E'\n';
    v_out := v_out || (case when (v_t->'top')::text not like '%zzoutsider%' then 'PASS' else 'FAIL' end)
      || '  a student of another class is not on the board' || E'\n';
    v_out := v_out || (case when jsonb_array_length(v_t->'top') = 2 then 'PASS' else 'FAIL' end)
      || '  a member without a nickname is not on the board (3 answers, still only 2 rows)' || E'\n';

    -- Japan week: Sunday 23:59:59 JST = last week, Monday 00:00 JST = this week
    v_ok := jsonb_array_length(v_t->'last_week') >= 1
        and exists (select 1 from jsonb_array_elements(v_t->'last_week') e
                    where e->>'nickname' = 'zzedge' and (e->>'count')::int = 1);
    v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end)
      || '  Sunday 23:59:59 JST counts for last week, Monday 00:00 JST for this week (zzedge 1 + 1)' || E'\n';

    -- 手書き: 9 tied at 2 → 7 rows + 2 more, in the order they reached 2; the student rank 10 with 1
    v_t := v_b->'boards'->'handwriting';
    v_ok := jsonb_array_length(v_t->'top') = 7 and (v_t->>'more')::int = 2
        and (select bool_and((e->>'rank')::int = 1) from jsonb_array_elements(v_t->'top') e);
    v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end)
      || format('  handwriting: 9 tied → %s rows shown + %s more (expected 7 + 2, all rank 1)',
                jsonb_array_length(v_t->'top'), v_t->>'more') || E'\n';
    select string_agg(e->>'nickname', ',' order by o) into v_txt from jsonb_array_elements(v_t->'top') with ordinality x(e, o);
    v_out := v_out || (case when v_txt = 'zztie1,zztie2,zztie3,zztie4,zztie5,zztie6,zztie7' then 'PASS' else 'FAIL' end)
      || '  ties are listed by who reached the count first: ' || coalesce(v_txt, 'none') || E'\n';
    v_out := v_out || (case when (v_t->'me'->>'rank')::int = 10 and (v_t->'me'->>'count')::int = 1 then 'PASS' else 'FAIL' end)
      || '  handwriting (look-alike answer counted): my place = rank 10, 1 — got ' || coalesce((v_t->'me')::text, 'null') || E'\n';

    -- Reviews: the student 7 (repeat not counted), then 9 tied at 2 → 5 rows + 5 more
    v_t := v_b->'boards'->'reviews';
    v_ok := (v_t->'top'->0->>'nickname') = 'zzme' and (v_t->'top'->0->>'count')::int = 7
        and jsonb_array_length(v_t->'top') = 5 and (v_t->>'more')::int = 5 and not (v_t ? 'last_week');
    v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end)
      || format('  reviews: zzme 7 first answers (repeat left out), %s rows + %s more (expected 5 + 5)',
                jsonb_array_length(v_t->'top'), v_t->>'more') || E'\n';

    -- Nothing private in the boards
    v_txt := (v_b->'boards')::text;
    v_ok := position(v_student::text in v_txt) = 0 and position('@' in v_txt) = 0 and position('Tie 1' in v_txt) = 0
        and not exists (select 1 from unnest(v_fake) f where position(f::text in v_txt) > 0);
    -- (v_fake includes zzme)
    v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end)
      || '  boards contain no user ids, emails or real names' || E'\n';

    -- The old keys are still there for the app that is live now
    v_out := v_out || (case when v_b ? 'top' and v_b ? 'me' and v_b ? 'last_week' then 'PASS' else 'FAIL' end)
      || '  old keys top / me / last_week still returned' || E'\n';

    -- Switched off: the student gets no boards, a teacher of the class still does
    update public.classes set leaderboard_enabled = false where id = v_class;
    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_b := public.class_leaderboard(v_class);
    reset role;
    v_out := v_out || (case when not (v_b ? 'boards') and not (v_b ? 'top') and (v_b->>'enabled')::boolean = false then 'PASS' else 'FAIL' end)
      || '  ranking off: the student gets no boards — got ' || v_b::text || E'\n';
    perform set_config('request.jwt.claims', json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_b := public.class_leaderboard(v_class);
    reset role;
    v_out := v_out || (case when v_b ? 'boards' and jsonb_array_length(v_b->'boards'->'typing'->'top') = 2 then 'PASS' else 'FAIL' end)
      || '  ranking off: a teacher of the class still sees the boards' || E'\n';

    -- Archived: no boards for anyone
    update public.classes set archived = true where id = v_class;
    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_b := public.class_leaderboard(v_class);
    reset role;
    v_out := v_out || (case when not (v_b ? 'boards') and (v_b->>'archived')::boolean then 'PASS' else 'FAIL' end)
      || '  archived class: no boards' || E'\n';

    -- The helpers can't be called by a student
    perform set_config('request.jwt.claims', json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      perform * from public.class_week_board_ranks(v_class, v_monday, 'typing');
      v_ok := false;
    exception when insufficient_privilege then v_ok := true;
    end;
    v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end) || '  student can''t call class_week_board_ranks' || E'\n';
    begin
      perform public.class_board_json(v_class, v_monday, 'typing', v_student, true, 5, 7, true);
      v_ok := false;
    exception when insufficient_privilege then v_ok := true;
    end;
    v_out := v_out || (case when v_ok then 'PASS' else 'FAIL' end) || '  student can''t call class_board_json' || E'\n';
    reset role;

    raise exception 'polycards_check_done';
  exception when others then
    reset role;
    if sqlerrm <> 'polycards_check_done' then
      v_out := v_out || 'FAIL  the check itself stopped: ' || sqlerrm || E'\n';
    end if;
  end;

  -- Only record_answer writes answer_log, so every row is a My Deck review answer (the drill,
  -- writing practice, Training and undo never write one). Any schema prefix, quotes, any case,
  -- any whitespace / line breaks.
  select string_agg(p.oid::regprocedure::text, ', ') into v_txt
  from pg_proc p
  where p.prosrc ~* 'insert\s+into\s+("?public"?\s*\.\s*)?"?answer_log"?(\s|\(|$)'
    and p.proname <> 'record_answer';
  v_out := v_out || (case when v_txt is null then 'PASS' else 'FAIL' end)
    || '  only record_answer inserts into answer_log (others: ' || coalesce(v_txt, 'none') || ')' || E'\n';
  select count(*) into v_n from pg_proc p
  where p.proname = 'record_answer' and p.pronamespace = 'public'::regnamespace;
  v_out := v_out || (case when v_n = 1 then 'PASS' else 'FAIL' end)
    || format('  exactly one record_answer function: %s', v_n) || E'\n';

  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
