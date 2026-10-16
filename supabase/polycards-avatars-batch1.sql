-- Polycards: avatar pictures, batch 1 (Series 1, avatars 1-10)
-- Run AFTER the files in public/avatars/ are pushed and live on Vercel.
-- Safe to re-run: it only sets the picture address for these 10 avatars.

update public.avatars as a
set image_url = '/avatars/' || a.slug || '.svg'
where a.slug in ('cat', 'shiba', 'penguin', 'mouse', 'rabbit',
                 'frog', 'chick', 'pig', 'cow', 'sheep');

-- Check: should list 10 rows, each with its picture address.
select sort_order, slug, name_en, rarity, image_url
from public.avatars
where image_url is not null
order by sort_order;
