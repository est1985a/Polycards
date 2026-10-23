-- Polycards: record of SQL already run in Supabase (2026-10-23). Do not need to run again.
-- Let signed-in students read the theme unlock list (theme names and ranks only).
grant select on public.theme_unlocks to authenticated;
