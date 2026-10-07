# Polycards

A vocabulary spaced-repetition (SRS) web app for Japanese junior high and high school students learning English. Think WaniKani or Anki, built for my classes at Ryukoku Junior/Senior High School. I'm an English teacher, not a professional developer, so explain changes in plain language.

## Stack
- React + Vite. Code layout:
  - `src/App.jsx`: shared state (session, screen, My Cards data) and which screen to show
  - `src/components/`: one file per screen part (`StudySession`, `MyCardsTab`, `CardSetsTab`, `LibrarySection`, `LoginScreen`, `Header`, `Tabs`, `Stamp`)
  - `src/lib/srs.js`: SRS rules; `src/lib/drill.js`: building/shuffling card piles; `src/lib/api.js`: every Supabase query; `src/lib/supabaseClient.js`: creates the Supabase client
  - `src/styles/theme.js`: shared colors, fonts, and button styles
- Supabase: PostgreSQL, Auth, Row Level Security
- Sign-in: Google OAuth, open to any Google account. Signing in is required; the old "Skip login (Test App)" bypass has been removed. Email/password is enabled in Supabase but has no sign-in screen in the app.
- Deployed on Vercel at https://polycards-eight.vercel.app. Vercel redeploys automatically on every push to `main`, so a push to `main` goes live to students.

## Database (Supabase)
Library tables (read-only for everyone, I add content myself in the Supabase SQL editor):
- `textbooks` (id, name, school_level: `JHS` | `HS` | `Other`)
- `units` (id, textbook_id, name, unit_order)
- `decks` (id, unit_id, name)
- `words` (id, english, japanese): one shared word list; a word can appear in several decks
- `deck_words` (deck_id, word_id, position): which words are in which deck
- `cards` is the OLD per-deck word table. It still exists but must not be used.

Per-student tables (RLS: each user can only touch their own rows; `user_id` defaults to `auth.uid()`):
- `user_decks` (user_id, deck_id, added_at): decks added to My Cards
- `user_cards` (user_id, word_id, direction, level, next_review_at, updated_at): progress per word AND direction, unique on (user_id, word_id, direction). Progress belongs to the word, not the deck, so a shared word has one level across all of a student's decks.

Shared-word rules:
- Adding a deck creates `user_cards` rows for each of its words in both directions and skips words the student already has, so existing progress is kept.
- Removing a deck deletes progress only for words that are not in any of the student's other added decks.
- Per-deck due counts count a shared word under every added deck that contains it, so per-deck numbers can add up to more than the "Due now" total.

Rules:
- Never change the schema or RLS yourself. Write the SQL in a separate block and I will run it in the Supabase SQL editor.
- Never commit secrets. The anon key is public by design, but a service-role key must never appear in the repo.
- Supabase returns at most 1,000 rows per query; keep that in mind for large lists.

## App structure
- Two dashboard tabs: **My Cards** (decks the student added, due counts, SRS review) and **Card Sets** (global library grouped by JHS/HS, then textbook, unit, deck).
- Card Sets: opening a deck runs the older "try it" drill (a card is cleared after `CLEAR_TARGET = 2` correct answers, set in `src/lib/drill.js`; wrong answers re-insert the card). Students can add the deck to My Cards from there.
- My Cards: real SRS review. The 2-correct drill does NOT apply here. Decks can also be removed from My Cards.
- Each word is two cards: `en2jp` and `jp2en`, tracked and leveled separately.

## SRS rules (constants and level logic in `src/lib/srs.js`)
- Levels 0 to 7. Wait before a card is due again, by the level it just reached: `LEVEL_HOURS = [0, 4, 24, 72, 168, 336, 720, 2880]` (new, 4h, 1d, 3d, 1w, 2w, 30d, ~4 months).
- Correct on the first try: level +1 (max 7).
- Wrong answers (WaniKani style): the drop is based on how many times the card was missed this session, rounded up in pairs. The 1st and 2nd miss = 1 level down, the 3rd and 4th = 2 levels down, and so on (the first miss already costs a level). From level 5 up the penalty is doubled (1st/2nd miss = 2 levels down). A learned card never drops below level 1; a new card (level 0) stays at 0. The drop is always counted from the level the card had at the start of the session, and the lowered level is saved at each miss.
- A card missed in a session comes back later that session as extra practice. It does not move up again that session.
- Review sessions are capped at `SESSION_SIZE = 20` cards.
- These rules are covered by automated tests in `src/lib/srs.test.js` (and drill helpers in `src/lib/drill.test.js`). Run them with `npm test`. If a rule is changed on purpose, update its test in the same change.

## UI conventions
- Interface is mostly Japanese. Keep the "English to Japanese" / "Japanese to English" direction labels in English. Answer buttons are bilingual (English plus Japanese). Do not add furigana unless I ask.
- Use American English spelling in anything written in English for school or work.
- Existing style: cream background (`#f4efe1`), navy (`#22406b`), red accent (`#b23a2f`), serif headings. Inline styles in each component; shared colors and button styles come from `src/styles/theme.js` (use those instead of new hex codes).

## How to work with me
- Make small, focused changes. Before large refactors (like reorganizing folders or moving logic between many files), propose a plan and wait for approval.
- After a change, run `npm test`, `npm run lint` and `npm run build`, then summarize in a few plain sentences what changed and how I can test it.
- If you are not certain a step or command is correct, say so instead of guessing.
- Work on a branch, not on `main`. Suggest a git commit message after each working change.
- Never push to `main` (or merge into it) unless I say so, because that deploys to students. Don't push other branches unless I ask.

## Planned features (not built yet)
- Show when the next cards come due
- Word game for cleared sets
- Vocabulary categories and test-prep sets (e.g. EIKEN)
- Low-poly visual style (inspired by Poly Pizza): retro poly avatar that levels up and unlocks new poly models as a student's decks grow
