-- =====================================================================
-- Polycards: teacher area, Phase 1 follow-ups (2026-10-30)
-- Run AFTER polycards-teacher-phase4.sql, BEFORE deploying the app code that calls
-- remove_co_teacher. Safe to run twice.
--   1. remove_co_teacher(): a teacher of a class removes another teacher (or themselves).
--      A class always keeps at least one teacher (last_teacher).
--   2. clean_real_name(): NFKC first, so a full-width space (山田　太郎) is stored as 山田 太郎.
--      Rebuilt from the live definition (checked with pg_get_functiondef on 2026-10-30, same as
--      polycards-teachers.sql); only the declare line changed.
--
-- Make a second test account a teacher (username OR full email in both places):
--   insert into public.teachers (user_id)
--   select id from auth.users
--   where lower(raw_user_meta_data->>'username') = 'test2' or lower(email) = 'test2'
--   on conflict do nothing;
-- =====================================================================

-- 1. Remove a teacher from a class.
-- Errors: not_signed_in / not_teacher / not_class_teacher (the caller), teacher_not_in_class (the
-- person isn't a teacher of this class), last_teacher (nobody who can still open the class would be left).
create or replace function public.remove_co_teacher(p_class_id uuid, p_teacher_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  -- Lock the class row: two teachers removing each other at the same moment can't both succeed.
  perform 1 from public.classes c where c.id = p_class_id for update;
  if not exists (select 1 from public.class_teachers ct
                 where ct.class_id = p_class_id and ct.teacher_id = p_teacher_user_id) then
    raise exception 'teacher_not_in_class';
  end if;
  -- Someone else who is still a teacher (still in public.teachers) must stay.
  if not exists (select 1 from public.class_teachers ct
                 where ct.class_id = p_class_id and ct.teacher_id <> p_teacher_user_id
                   and public.user_is_teacher(ct.teacher_id)) then
    raise exception 'last_teacher';
  end if;
  delete from public.class_teachers ct where ct.class_id = p_class_id and ct.teacher_id = p_teacher_user_id;
end;
$$;
revoke execute on function public.remove_co_teacher(uuid, uuid) from public, anon;
grant execute on function public.remove_co_teacher(uuid, uuid) to authenticated;

-- 2. Real names: NFKC first (full-width space → space, ＡＢＣ → ABC, ｶﾀｶﾅ → カタカナ),
--    then spaces collapsed and trimmed. Same as cleanRealName() in src/lib/classes.js.
create or replace function public.clean_real_name(p_name text)
returns text language plpgsql immutable set search_path = ''
as $$
declare v text := btrim(regexp_replace(normalize(coalesce(p_name, ''), NFKC), '\s+', ' ', 'g'));
begin
  if char_length(v) not between 1 and 40 then raise exception 'bad_name'; end if;
  return v;
end;
$$;
revoke execute on function public.clean_real_name(text) from public, anon, authenticated;


-- =====================================================================
-- OPTIONAL: clean real names already stored (e.g. 山田　太郎 saved before this file).
-- Run A first and look at the rows; then run B. Rows where "problem" is true would become
-- empty or longer than 40 characters: B skips them, fix those by hand.
-- =====================================================================
-- A) Which rows would change:
-- select c.name as class_name, m.student_number, m.real_name as now,
--        btrim(regexp_replace(normalize(m.real_name, NFKC), '\s+', ' ', 'g')) as after,
--        char_length(btrim(regexp_replace(normalize(m.real_name, NFKC), '\s+', ' ', 'g'))) not between 1 and 40 as problem
-- from public.class_members m join public.classes c on c.id = m.class_id
-- where m.real_name <> btrim(regexp_replace(normalize(m.real_name, NFKC), '\s+', ' ', 'g'))
-- order by c.name, m.student_number nulls last;
--
-- B) Clean them:
-- update public.class_members m
--    set real_name = btrim(regexp_replace(normalize(m.real_name, NFKC), '\s+', ' ', 'g'))
--  where m.real_name <> btrim(regexp_replace(normalize(m.real_name, NFKC), '\s+', ' ', 'g'))
--    and char_length(btrim(regexp_replace(normalize(m.real_name, NFKC), '\s+', ' ', 'g'))) between 1 and 40;
