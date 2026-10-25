-- =====================================================================
-- Polycards: recorded word audio (2026-10-25)
-- Run once in the Supabase SQL editor, BEFORE the app code that reads
-- audio_path goes live (the word queries ask for it).
--
-- 1. Four new columns on words:
--    speak_as    : record this text instead of the English word (e.g. 'How old are you?')
--    audio_path  : the MP3 file in the word-audio bucket (filled by npm run audio)
--    audio_text  : the exact text that was recorded (so the script sees edits)
--    audio_voice : the voice used for the recording
-- 2. A public Storage bucket word-audio: anyone can download a file by its
--    URL. No policies are added on storage.objects, so students can't upload,
--    change, delete or list files; only the service role key (the script) can.
--
-- After adding new words, run on the Mac:  npm run audio
-- To change what is recorded for a word:
--   update public.words set speak_as = 'have a good time' where english = 'have a ... time';
-- =====================================================================

alter table public.words
  add column if not exists speak_as    text,
  add column if not exists audio_path  text,
  add column if not exists audio_text  text,
  add column if not exists audio_voice text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('word-audio', 'word-audio', true, 1048576, array['audio/mpeg'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['audio/mpeg'];

-- Check: the new columns and the bucket
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'words'
  and column_name in ('speak_as', 'audio_path', 'audio_text', 'audio_voice');

select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'word-audio';
