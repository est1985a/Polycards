-- =====================================================================
-- Polycards: words that still have no hiragana reading
-- Read-only: lists words, changes nothing. Run after
-- polycards-word-readings.sql.
-- =====================================================================

select english, japanese from public.words
where reading is null or btrim(reading) = ''
order by english;
