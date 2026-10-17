-- Polycards: avatar pictures, batch 5 (Series 1, avatars 41-45, the ★★★ Super Rares)
-- Run AFTER the files in public/avatars/ are pushed and live on Vercel.
-- Safe to re-run: it only sets the picture address for these 5 avatars.

update public.avatars as a
set image_url = '/avatars/' || a.slug || '.svg'
where a.slug in ('dragon', 'robot', 'phoenix', 'unicorn', 'ninja-cat');

-- Check: should now list 45 rows (30 Normals + 10 Rares + 5 Super Rares), each with its picture address.
select sort_order, slug, name_en, rarity, image_url
from public.avatars
where image_url is not null
order by sort_order;
