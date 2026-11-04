-- =====================================================================
-- Polycards: dictionary word details, nouns (batch 8 of 8), 6 words
-- Run AFTER polycards-word-details.sql. Only fills empty columns, so it is safe to run twice
-- and never overwrites a word fixed by hand. Readable list: the .csv file with the same name.
-- Made by: node scripts/wordDetails.mjs nouns 8
-- =====================================================================
update public.words as w
set countable = v.countable, plural = v.plural
from (values
  ('371826ff-317b-422b-b2c1-3bc12c639ef7'::uuid, 'both', 'yogurts'),  -- yogurt
  ('f9376018-4a60-4437-a245-574472626305'::uuid, 'both', 'youths'),  -- youth
  ('cdb98fa8-391b-41b4-a01f-7f48b429fa8f'::uuid, 'countable', 'zebras'),  -- zebra
  ('77042629-88b3-4211-91b1-4c2542685528'::uuid, 'countable', 'zones'),  -- zone
  ('b88b9854-c2fb-4755-a722-e597ceb88ae7'::uuid, 'countable', 'zoos'),  -- zoo
  ('8fe67ae8-169c-4047-9421-66cf9e7a9017'::uuid, 'countable', 'zookeepers')  -- zookeeper
) as v(id, countable, plural)
where w.id = v.id and w.countable is null and w.plural is null;

-- Check (words_in_batch and with_countable should both be 6):
select count(*) as words_in_batch, count(countable) as with_countable, count(plural) as with_plural from public.words where id in ('371826ff-317b-422b-b2c1-3bc12c639ef7'::uuid, 'f9376018-4a60-4437-a245-574472626305'::uuid, 'cdb98fa8-391b-41b4-a01f-7f48b429fa8f'::uuid, '77042629-88b3-4211-91b1-4c2542685528'::uuid, 'b88b9854-c2fb-4755-a722-e597ceb88ae7'::uuid, '8fe67ae8-169c-4047-9421-66cf9e7a9017'::uuid);
