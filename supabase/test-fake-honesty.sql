-- =====================================================================
-- Polycards: FAKE answers so the teacher's honesty flag can be seen (TEST ACCOUNTS ONLY, 2026-10-30)
-- Run AFTER polycards-teacher-phase3.sql. Never run this for a real student.
--
-- 1. Put a TEST account's username on the line marked  <-- TEST STUDENT  (e.g. amaya). Accounts with
--    no username (every Google account, so every real student) and teachers are refused.
--    The account needs at least one pack in My Deck.
-- 2. Run PART 1. It adds 80 made-up first answers from the last 5 days on the student's own
--    Japanese → English cards, ONLY to answer_log:
--      40 tap わかった, each flipped in 0.3–0.8 s        → めくるまで1秒未満のわかった 100%
--      35 typing まだ with a wrong spelling, 5 correct  → タップ 100% ／ スペル正解 13%
--    The まだ answers also show up in the class's よく間違えた単語.
--    Cards, levels, points, rank, tickets, daily stats (レビュー / 学習日数) and the gacha are NOT touched.
-- 3. As the teacher (e.g. test1): class page → 一覧 shows the flag on this student; the student page
--    shows the numbers and 確認したほうがいいかも.
-- 4. Undo: run PART 2. It deletes exactly these rows (they all share one made-up session id).
-- =====================================================================

-- PART 1: add the fake answers
do $$
declare
  v_who     text := 'amaya';   -- <-- TEST STUDENT (username of a test account)
  v_user    uuid;
  v_session uuid := '00000000-0000-4000-8000-00000000fa4e';
  v_words   uuid[];
  v_n       int;
begin
  select u.id into v_user from auth.users u where lower(u.raw_user_meta_data->>'username') = lower(v_who);
  if v_user is null then
    raise exception 'No test account with username "%". (Accounts without a username, like Google sign-ins, are refused on purpose.)', v_who;
  end if;
  if exists (select 1 from public.teachers t where t.user_id = v_user) then
    raise exception '"%" is a teacher. Use a test student account.', v_who;
  end if;
  select array_agg(c.word_id order by c.word_id) into v_words
  from public.user_cards c where c.user_id = v_user and c.direction = 'jp2en' and c.level < 8;
  if v_words is null then raise exception '"%" has no Japanese → English cards. Add a pack to My Deck first.', v_who; end if;
  v_n := cardinality(v_words);

  -- 40 fast tap わかった
  insert into public.answer_log (user_id, session_id, word_id, direction, result, is_repeat, typed,
                                 level_before, level_after, answer_mode, reveal_ms, answer_ms, answered_at)
  select v_user, v_session, v_words[1 + (g % v_n)], 'jp2en', 'got_it', false, false,
         1, 2, 'tap', 300 + (g * 13) % 500, 1200 + (g * 17) % 600, now() - make_interval(mins => g * 170)
  from generate_series(1, 40) g;

  -- 35 typing まだ with a wrong spelling (on a few words, so they show as class trouble words)
  insert into public.answer_log (user_id, session_id, word_id, direction, result, is_repeat, typed, typed_answer,
                                 spelling, level_before, level_after, answer_mode, answer_ms, answered_at)
  select v_user, v_session, v_words[1 + (g % least(v_n, 5))], 'jp2en', 'not_yet', false, true, 'xxx',
         'wrong', 2, 1, 'typing', 6000, now() - make_interval(mins => g * 190)
  from generate_series(1, 35) g;

  -- 5 typing correct spellings
  insert into public.answer_log (user_id, session_id, word_id, direction, result, is_repeat, typed, typed_answer,
                                 spelling, level_before, level_after, answer_mode, answer_ms, answered_at)
  select v_user, v_session, v_words[1 + (g % v_n)], 'jp2en', 'got_it', false, true, 'ok',
         'exact', 2, 3, 'typing', 5000, now() - make_interval(mins => g * 200)
  from generate_series(1, 5) g;

  raise notice 'Added 80 fake answers for %.', v_who;
end;
$$;

-- PART 2: undo (run on its own)
-- delete from public.answer_log where session_id = '00000000-0000-4000-8000-00000000fa4e';
