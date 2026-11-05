-- =====================================================================
-- Polycards: students can no longer leave a class themselves (2026-11-05)
--
-- Why: a student tapped クラスをぬける by accident and left their class. From now on only a
-- teacher takes a student out of a class (名簿 → 外す, remove_student_from_class).
--
-- What it does: takes away the students' right to call leave_class(). Nothing else changes:
--   - the function itself is kept (easy to undo, see the bottom);
--   - class_leaves (who left before) and class_leavers() (the teacher's ぬけた生徒 panel) stay;
--   - students never had any other way to leave: class_members has only a SELECT grant and a
--     SELECT policy for them (no insert / update / delete), checked live on 2026-11-05.
--
-- Run order: AFTER the app code without the クラスをぬける button is on main (either order is
-- safe; with the old app, ぬける would just show an error).
--
-- A student who left before can still come back:
--   - with the class's join code (join_class does not look at class_leaves), or
--   - by the teacher: 名簿 → ＋ 生徒を追加, or 名簿を貼り付け (shows as すぐ追加).
--   The automatic roster join at sign-in (claim_my_roster) does NOT put them back.
--   Once they are a member again they drop off ぬけた生徒 by themselves (class_leavers() lists
--   only students who are not members); their old class_leaves row stays as history.
--
-- NOTE: polycards-class-leave-and-join-limit.sql grants this right. If that file is ever run
-- again, run this file again after it.
--
-- Check: supabase/check-teacher-security.sql (student) — leave_class rows and the direct
-- delete / update rows should all say PASS.
-- =====================================================================

revoke execute on function public.leave_class(uuid) from public, anon, authenticated;

-- Check: should say false.
select has_function_privilege('authenticated', 'public.leave_class(uuid)', 'execute') as students_can_leave;

-- Undo (only if students should be able to leave again):
-- grant execute on function public.leave_class(uuid) to authenticated;
