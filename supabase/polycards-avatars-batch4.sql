-- Polycards: avatar pictures, batch 4 (Series 1, avatars 31-40, the ★★ Rares)
-- Run AFTER the files in public/avatars/ are pushed and live on Vercel.
-- Safe to re-run: it only sets the picture address for these 10 avatars.

update public.avatars as a
set image_url = '/avatars/' || a.slug || '.svg'
where a.slug in ('fox', 'owl', 'panda', 'red-panda', 'tiger',
                 'shark', 'octopus', 'flamingo', 'deer', 'wolf');

-- Check: should now list 40 rows (30 Normals + 10 Rares), each with its picture address.
select sort_order, slug, name_en, rarity, image_url
from public.avatars
where image_url is not null
order by sort_order;
