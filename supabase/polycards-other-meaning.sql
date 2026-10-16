-- =====================================================================
-- Polycards: "right meaning, different word" check for typing mode
-- Run once in the Supabase SQL editor (after polycards-answers.sql and
-- polycards-fix-word-id.sql). Only ADDS two functions; nothing else changes.
--
-- Example: the card shows から and wants "since". A student types "from".
-- "from" is another word in the library whose Japanese also includes から,
-- so the app says それも「から」の意味ですが… and lets them try again.
-- =====================================================================

-- The separate meanings in a Japanese gloss, cleaned up so they can be compared.
-- '～から、～以来' → {から, 以来};  '～さん、～先生（女性）' → {さん, 先生}
-- Notes in ( ) / （ ） are dropped; ～ 〜 ~ … spaces and dots are ignored;
-- meanings are split at 、 , / ; ・ 。
create or replace function public.japanese_meanings(p_text text)
returns text[]
language sql immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct t) filter (where t <> ''), '{}')
  from unnest(regexp_split_to_array(
         regexp_replace(
           regexp_replace(normalize(coalesce(p_text, ''), NFKC), '\([^)]*\)', '', 'g'),
           '[~〜….\s]', '', 'g'),
         '[、,/;・。]')) as t
$$;

-- true = what the student typed is exactly another word in the library that
-- shares at least one Japanese meaning with this card. Spelling is compared
-- with the same clean-up as spelling_check().
create or replace function public.other_meaning_check(p_word_id uuid, p_typed text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_typed    text := public.spelling_normalize(left(p_typed, 200));
  v_meanings text[];
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if v_typed = '' then return false; end if;

  select public.japanese_meanings(w.japanese) into v_meanings
  from public.words w where w.id = p_word_id;
  if v_meanings is null or cardinality(v_meanings) = 0 then return false; end if;

  return exists (
    select 1 from public.words w
    where w.id <> p_word_id
      and v_typed in (
            public.spelling_normalize(regexp_replace(w.english, '[(\[][^)\]]*[)\]]', ' ', 'g')),
            public.spelling_normalize(regexp_replace(w.english, '[()\[\]]', '', 'g')))
      and public.japanese_meanings(w.japanese) && v_meanings
  );
end;
$$;

revoke execute on function public.japanese_meanings(text) from public, anon, authenticated;
revoke execute on function public.other_meaning_check(uuid, text) from public, anon, authenticated;
grant execute on function public.other_meaning_check(uuid, text) to authenticated;

notify pgrst, 'reload schema';
