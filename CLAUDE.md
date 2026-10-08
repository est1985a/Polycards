# Polycards

A vocabulary spaced-repetition (SRS) web app for Japanese junior high and high school students learning English. Think WaniKani or Anki, built for my classes at Ryukoku Junior/Senior High School. I'm an English teacher, not a professional developer, so explain changes in plain language.

## Stack
- React + Vite. Code layout:
  - `src/App.jsx`: shared state (session, screen, My Cards data) and which screen to show
  - `src/components/`: one file per screen part (`StudySession`, `MyCardsTab`, `CardSetsTab`, `LibrarySection`, `LoginScreen`, `Header`, `Tabs`, `Stamp`, `PlayerStats`, `LevelChart`, `Avatar`, `WordInfo`)
  - `src/lib/srs.js`: SRS rules; `src/lib/points.js`: points and player level (pure functions); `src/lib/drill.js`: building/shuffling card piles; `src/lib/dictionary.js`: builds the dictionary link for a word; `src/lib/api.js`: every Supabase query; `src/lib/supabaseClient.js`: creates the Supabase client
  - `src/styles/theme.js`: shared colors (as CSS variables), fonts, and button styles
  - `src/themes.js`: color themes (values for each color role) and `applyTheme()`
- Supabase: PostgreSQL, Auth, Row Level Security
- Sign-in: Google OAuth, open to any Google account. Signing in is required; the old "Skip login (Test App)" bypass has been removed. Email/password is enabled in Supabase but has no sign-in screen in the app.
- Deployed on Vercel at https://polycards-eight.vercel.app. Vercel redeploys automatically on every push to `main`, so a push to `main` goes live to students.

## Database (Supabase)
Library tables (read-only for everyone, I add content myself in the Supabase SQL editor):
- `textbooks` (id, name, school_level: `JHS` | `HS` | `Other`)
- `units` (id, textbook_id, name, unit_order)
- `decks` (id, unit_id, name)
- `words` (id, english, japanese, example_en, example_ja): one shared word list; a word can appear in several decks. `example_en` / `example_ja` are optional example sentences (some words don't have them yet)
- `deck_words` (deck_id, word_id, position): which words are in which deck
- `cards` is the OLD per-deck word table. It still exists but must not be used.

Per-student tables (RLS: each user can only touch their own rows; `user_id` defaults to `auth.uid()`):
- `user_decks` (user_id, deck_id, added_at): decks added to My Cards
- `user_cards` (user_id, word_id, direction, level, next_review_at, updated_at): progress per word AND direction, primary key (user_id, word_id, direction). Progress belongs to the word, not the deck, so a shared word has one level across all of a student's decks.
- `user_stats` (user_id primary key default `auth.uid()`, peak_points, updated_at): highest points the student has ever had. RLS own row only; the trigger `user_stats_keep_peak` keeps `peak_points` at the highest value ever saved.

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
- Dictionary link (辞書で調べる): shown under the answer buttons only after a card is flipped, in both the drill and SRS review and both directions, so it can't give the answer away. It opens ALC 英辞郎 on the WEB (`https://eow.alc.co.jp/search?q=<word>`) in a new tab with `rel="noopener noreferrer"`. The search term comes from the card's English text: parentheses and the words inside them, `...`, `…` and `?` are removed, spaces tidied and lowercased (e.g. `Call me ...` → `call me`); `~` is kept. Built by `dictionaryUrl()` in `src/lib/dictionary.js` (tests in `src/lib/dictionary.test.js`) and shown by `src/components/WordInfo.jsx`.
- Example sentences: in the same info area after the flip (both modes, both directions), `WordInfo` shows the word's English example, the Japanese translation below it in smaller muted text, then the dictionary link. The word is not bolded or highlighted. No English example means only the link is shown (a Japanese sentence is never shown alone). `fetchDeckWords` and `fetchReviewRows` in `src/lib/api.js` load `example_en` / `example_ja`; cards carry them as `exampleEn` / `exampleJa` (blank or missing → `null`), set by `buildCards` / `buildReviewCards` in `src/lib/drill.js`. Tests: `src/lib/drill.test.js` and `src/components/WordInfo.test.jsx`.

## SRS rules (constants and level logic in `src/lib/srs.js`)
- Levels 0 to 7. Wait before a card is due again, by the level it just reached: `LEVEL_HOURS = [0, 4, 24, 72, 168, 336, 720, 2880]` (new, 4h, 1d, 3d, 1w, 2w, 30d, ~4 months).
- Correct on the first try: level +1 (max 7).
- Wrong answers (WaniKani style): the drop is based on how many times the card was missed this session, rounded up in pairs. The 1st and 2nd miss = 1 level down, the 3rd and 4th = 2 levels down, and so on (the first miss already costs a level). From level 5 up the penalty is doubled (1st/2nd miss = 2 levels down). A learned card never drops below level 1; a new card (level 0) stays at 0. The drop is always counted from the level the card had at the start of the session, and the lowered level is saved at each miss.
- A card missed in a session comes back later that session as extra practice. It does not move up again that session.
- Review sessions are capped at `SESSION_SIZE = 20` cards.
- These rules are covered by automated tests in `src/lib/srs.test.js` (and drill helpers in `src/lib/drill.test.js`). Run them with `npm test`. If a rule is changed on purpose, update its test in the same change.

## Points and player level
- Each card (one `user_cards` row, so both directions count separately) is worth `CARD_POINTS = [0, 1, 2, 3, 5, 8, 13, 21]` by level (in `src/lib/srs.js`, next to `LEVEL_HOURS`). Level 0 cards are worth 0, so adding a deck gives no points until cards are learned.
- Current points = sum over all of the student's `user_cards`. Peak points = highest ever, saved in `user_stats`.
- Player level comes from peak points via `playerLevel()` in `src/lib/points.js` (the only place the formula lives): `floor(sqrt(peak / 20)) + 1`. Lv2 at 20 points, Lv3 at 80, Lv4 at 180, Lv10 at 1,620.
- Player level never goes down: removing a deck lowers current points but not the peak.
- Points are recounted each time the dashboard is shown (so after every review), after pending progress saves finish. If the total beats the saved peak, the new peak is upserted to `user_stats`.
- All card levels are read in pages of 1,000 (`fetchAllCardLevels` in `src/lib/api.js`), so totals are correct beyond Supabase's 1,000-row limit.
- Shown at the top of My Cards by `src/components/PlayerStats.jsx` (avatar, player level, current and peak points, and a bar showing progress to the next level). The bar uses `pointsForLevel()` in `src/lib/points.js`, the reverse of `playerLevel()`, and is measured from peak points because the level comes from the peak. The card count per level is a bar chart in `src/components/LevelChart.jsx` (tests in `LevelChart.test.jsx`).
- Tests: `src/lib/points.test.js` (pure, never touches the database or the test account).

## UI conventions
- UI overhaul: step 1 (themes, fonts) and step 2 (My Cards dashboard) are done.
- Layout: phone-first, one 480 px column centered on desktop (`wrap` in theme.js), 16 px side padding (`gutter`), tap targets at least 44 px. Dashboard panels use `panel` (surface, 2 px line border, 20 px radius).
- My Cards, top to bottom: low-poly header band (`Header` variant `band`, 14 SVG triangles mixed from surface/surface2/bg with `color-mix`, fading into bg; other screens use variant `compact`), player card, review button (pill = due cards capped at `SESSION_SIZE`), level chart, マイデッキ rows (tap = review that deck, × = remove deck with confirm).
- The account button (round, user's initial) opens a menu with the email and Sign Out.
- `Tabs.jsx` is a bottom tab bar fixed to the screen (72 px, `tabBarHeight`), shown on the dashboard only; the dashboard has extra bottom padding so nothing hides behind it.
- `Avatar.jsx` is a PLACEHOLDER low-poly cat in `danger` shades, to be replaced by unlockable models. Keep its props simple (`size`).
- "Next review in…" (次の復習) is not shown yet: it needs a new query (planned feature).
- Interface is mostly Japanese. Keep the "English to Japanese" / "Japanese to English" direction labels in English. Answer buttons are bilingual (English plus Japanese). Do not add furigana unless I ask.
- Use American English spelling in anything written in English for school or work.
- Inline styles in each component. Colors, fonts and button styles come from `src/styles/theme.js`. Never write hex codes, `rgb()` or color names in `src/App.jsx` or `src/components/`; a test fails if you do.
- Themes: every color is a named role (`bg, surface, surface2, line, text, muted, accent, accentInk, danger, dangerInk, gold`) plus 8 level colors (`colors.level(n)`, Lv0 to Lv7). `colors.x` in theme.js is `var(--x)`; `applyTheme()` in `src/themes.js` fills in the variables on `<html>` (called in `src/main.jsx`). Themes: `midnight` "Midnight Arcade" (default, dark), `pizza` and `lagoon` (defined, not yet offered to students; planned as player-level unlocks, saving the choice will need SQL).
- `accent` is for fills only (buttons, active tab, stamps), never text: lagoon's accent is too light to read as text. Big numbers use `gold`, headings and links use `text`/`muted`, "Still learning" uses `btnDanger`.
- `src/themes.test.js` checks that every theme has every role and that text passes WCAG 4.5:1 contrast. A new theme must pass it.
- Trying a theme: only under `npm run dev`, add `?theme=pizza` or `?theme=lagoon` to the URL. Ignored on the live site (temporary until the unlock feature).
- Fonts (Google Fonts, loaded in `index.html`): Chakra Petch for headings and numbers (`fontDisplay`), Zen Maru Gothic for body and Japanese (`fontBody`).

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
