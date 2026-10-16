-- Polycards: avatar pictures, batch 2 (Series 1, avatars 11-20)
-- Run AFTER the files in public/avatars/ are pushed and live on Vercel.
-- Safe to re-run: it only sets the picture address for these 10 avatars.

update public.avatars as a
set image_url = '/avatars/' || a.slug || '.svg'
where a.slug in ('duck', 'bear', 'monkey', 'tanuki', 'turtle',
                 'hedgehog', 'squirrel', 'hamster', 'crab', 'koala');

-- Check: should now list 20 rows (batch 1 and batch 2), each with its picture address.
select sort_order, slug, name_en, rarity, image_url
from public.avatars
where image_url is not null
order by sort_order;
