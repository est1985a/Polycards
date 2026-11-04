// The トレーニング (Training) tab: which activities it has and how its screens connect (pure functions).
// A new activity = one more entry in TRAINING_ACTIVITIES plus its screen; the menu needs no change.
import { HANDWRITING_ENABLED, PRACTICE_ENABLED } from "../handwriting/config.js";

// false hides the whole Training tab.
export const TRAINING_ENABLED = true;

// title / description: i18n keys. icon: a key of the icons in TrainingTab.jsx.
export const TRAINING_ACTIVITIES = [
  { id: "abc", title: "training.abc.title", description: "training.abc.description", icon: "pencil", available: HANDWRITING_ENABLED && PRACTICE_ENABLED },
];

// The activities shown in the menu.
export function trainingActivities(list = TRAINING_ACTIVITIES) {
  return list.filter((a) => a.available);
}

// The tab is shown when it's switched on and has at least one activity.
export function showTrainingTab(enabled = TRAINING_ENABLED, list = TRAINING_ACTIVITIES) {
  return enabled && trainingActivities(list).length > 0;
}

// A–Z, or a–z.
export function alphabet(lowercase = false) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return lowercase ? letters.map((l) => l.toLowerCase()) : letters;
}

// The next (+1) or previous (-1) letter in the same case, or null past A / Z.
export function stepLetter(letter, step) {
  const list = alphabet(letter === letter.toLowerCase());
  return list[list.indexOf(letter) + step] ?? null;
}

// Saved progress (user_training_progress, supabase/polycards-training-progress.sql) uses stable
// practice ids that never change with the screens: one per ABC letter and case.
// "B" → "abc-upper-b", "b" → "abc-lower-b".
export function letterPracticeId(letter) {
  const lower = letter.toLowerCase();
  return `abc-${letter === lower ? "lower" : "upper"}-${lower}`;
}

// The letters completed in ABCを書こう, from saved progress rows ({ practice_id, ... }):
// a Set like { "B", "b" }. Other or unknown ids are ignored.
export function doneLettersFromProgress(rows) {
  const done = new Set();
  for (const row of rows || []) {
    const m = /^abc-(upper|lower)-([a-z])$/.exec(row?.practice_id ?? "");
    if (m) done.add(m[1] === "upper" ? m[2].toUpperCase() : m[2]);
  }
  return done;
}

// Where the Training tab starts.
export const TRAINING_START = { screen: "menu", lowercase: false, letter: null };

// Where ← goes: letter page → the ABC grid (same case), ABC grid → the menu.
export function trainingParent(path) {
  if (path.screen === "letter") return { ...path, screen: "abc", letter: null };
  return { ...TRAINING_START, lowercase: path.lowercase };
}

// Gacha ticket rewards (supabase/polycards-training-rewards.sql): one for all 26 capitals,
// one for all 26 small letters, each claimed once with claim_training_reward().
export const ABC_REWARD_IDS = ["abc-upper", "abc-lower"];

export function abcRewardId(lowercase) {
  return lowercase ? "abc-lower" : "abc-upper";
}

// The reward of one case: 'hidden' (rewards unknown, e.g. the SQL isn't run yet), 'claimed',
// 'ready' (all 26 letters done, not claimed yet) or 'locked'.
// done: completed letters (a Set like { "B", "b" }); rewards: a Set of claimed ids, or null.
export function abcRewardState(done, lowercase, rewards) {
  if (!rewards) return "hidden";
  if (rewards.has(abcRewardId(lowercase))) return "claimed";
  return alphabet(lowercase).every((l) => done.has(l)) ? "ready" : "locked";
}

// How many ABC tickets are still to win (for the menu pill), or null when rewards are unknown.
export function abcRewardsLeft(rewards) {
  if (!rewards) return null;
  return ABC_REWARD_IDS.filter((id) => !rewards.has(id)).length;
}

// The order of ガチャ券をもらう (App's claimAbcReward): wait for letter saves still sending, claim
// (only this step's error reaches the screen), mark it claimed at once (also when it was claimed
// before), then refresh the gacha status on its own: a failed refresh is only logged.
export async function claimRewardSteps(rewardId, { pending = [], claim, markClaimed, refresh, log = console.error }) {
  await Promise.all(pending);
  const result = await claim(rewardId);
  markClaimed(rewardId);
  try {
    await refresh();
  } catch (e) {
    log(e);
  }
  return result;
}
