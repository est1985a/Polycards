-- Polycards: new theme unlock order (2026-10-23)
-- Ryukoku moves to the first unlock (rank 5) and Snow to rank 10; Neon Tokyo and Galaxy are the last two.
-- The unlock ranks themselves are unchanged (1, 5, 10, 15, 20, 30, 40, 50, 60, 70).
-- theme_key must match a key in src/themes.js. Safe to run more than once.

update public.theme_unlocks as t
set unlock_level = v.unlock_level
from (values
  ('midnight', 1),
  ('ryukoku',  5),
  ('snow',    10),
  ('pizza',   15),
  ('lagoon',  20),
  ('sakura',  30),
  ('matcha',  40),
  ('autumn',  50),
  ('neon',    60),
  ('galaxy',  70)
) as v(theme_key, unlock_level)
where t.theme_key = v.theme_key;

-- Check: should list all ten themes in this order.
select theme_key, unlock_level from public.theme_unlocks order by unlock_level;
