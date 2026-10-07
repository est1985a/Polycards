# Polycards

A vocabulary spaced-repetition (SRS) web app for Japanese junior high and high school students learning English. Think WaniKani or Anki, built for my classes at Ryukoku Junior/Senior High School. I'm an English teacher, not a professional developer, so explain changes in plain language.

## Stack
- React + Vite (`src/App.jsx` is the main file; `src/supabaseClient.js` creates the Supabase client)
- Supabase: PostgreSQL, Auth (email/password and Google OAuth; students will sign in with school Google accounts), Row Level Security
- Not deployed yet (hosting undecided: GitHub Pages or Vercel)

## Database (Supabase)
Library tables (read-only for everyone, I add content myself in the Supabase SQL editor):
- `textbooks` (id, name, school_level: `JHS` | `HS` | `Other`)
- `units` (id, textbook_id, name, unit_order)
- `decks` (id, unit_id, name)
- `cards` (id, deck_id, english, japanese): one row per word pair

Per-student tables (RLS: each user can only touch their own rows; `user_id` defaults to `auth.uid()`):
- `user_decks` (user_id, deck_id, added_at): decks added to My Cards
- `user_cards` (user_id, card_id, direction, level, next_review_at, updated_at): progress per card AND direction

Rules:
- Never change the schema or RLS yourself. Write the SQL in a separate block and I will run it in the Supabase SQL editor.
- Never commit secrets. The anon key is public by design, but a service-role key must never appear in the repo.
- Supabase returns at most 1,000 rows per query; keep that in mind for large lists.

## App structure
- Two dashboard tabs: **My Cards** (decks the student added, due counts, SRS review) and **Card Sets** (global library grouped by JHS/HS, then textbook, unit, deck).
- Card Sets: opening a deck runs the older "try it" drill (a card is cleared after `CLEAR_TARGET = 2` correct answers; wrong answers re-insert the card). Students can add the deck to My Cards from there.
- My Cards: real SRS review. The 2-correct drill does NOT apply here. Decks can also be removed from My Cards.
- Each word is two cards: `en2jp` and `jp2en`, tracked and leveled separately.

## SRS rules (constants at the top of `App.jsx`)
- Levels 0 to 7. Wait before a card is due again, by the level it just reached: `LEVEL_HOURS = [0, 4, 24, 72, 168, 336, 720, 2880]` (new, 4h, 1d, 3d, 1w, 2w, 30d, ~4 months).
- Correct on the first try: level +1 (max 7).
- Wrong answers (WaniKani style): every 2 misses on a card in a session = 1 level down; from level 5 up the penalty is doubled; a learned card never drops below level 1. The lowered level is saved at each miss.
- A card missed in a session comes back later that session as extra practice. It does not move up again that session.
- Review sessions are capped at `SESSION_SIZE = 20` cards.

## UI conventions
- Interface is mostly Japanese. Keep the "English to Japanese" / "Japanese to English" direction labels in English. Answer buttons are bilingual (English plus Japanese). Do not add furigana unless I ask.
- Use American English spelling in anything written in English for school or work.
- Existing style: cream background (`#f4efe1`), navy (`#22406b`), red accent (`#b23a2f`), serif headings. Inline styles in `App.jsx`.

## How to work with me
- Make small, focused changes. Before large refactors (like splitting `App.jsx` into files), propose a plan and wait for approval.
- After a change, summarize in a few plain sentences what changed and how I can test it.
- If you are not certain a step or command is correct, say so instead of guessing.
- Suggest a git commit message after each working change; don't push unless I ask.

## Planned features (not built yet)
- Show when the next cards come due
- Limit sign-in to school Google accounts
- Word game for cleared sets
- Vocabulary categories and test-prep sets (e.g. EIKEN)
- Low-poly visual style (inspired by Poly Pizza): retro poly avatar that levels up and unlocks new poly models as a student's decks grow
- Deployment so students can use it
