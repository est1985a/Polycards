// The rank-up pop-up: what it shows. Pure functions only.
// The rank always comes from the database (rank_rewards() in api.js = gacha_player_level()),
// never from the app's own copy, so the pop-up can't repeat if the two ever differ.

// rewards: { rank, last_seen_rank, specials: [{ id, slug, unlock_rank, owned, … }] } from rank_rewards().
// themeItems: themeList() from themeUnlocks.js (null while loading).
// Returns null when there is nothing to show (no rank-up, or not loaded yet), else
// { rank, newThemes, newSpecials, next } where
//   newThemes / newSpecials: unlocked by this rank-up (rank above last_seen_rank, up to rank),
//     highest unlock rank first;
//   next: the next reward above the rank: { kind: 'theme', unlockRank, ranksToGo, theme } (themes
//     first), else { kind: 'special', unlockRank, ranksToGo, avatar }, else null (nothing left).
// Several ranks gained at once = one pop-up for the newest rank.
export function rankUpView(rewards, themeItems) {
  if (!rewards || !themeItems) return null;
  const rank = Number(rewards.rank);
  const seen = Number(rewards.last_seen_rank);
  if (!Number.isFinite(rank) || !Number.isFinite(seen) || rank <= seen) return null;

  const inRange = (r) => r > seen && r <= rank;
  const specials = (rewards.specials || [])
    .map((a) => ({ ...a, unlock_rank: Number(a.unlock_rank) }))
    .filter((a) => Number.isFinite(a.unlock_rank));

  const newThemes = themeItems.filter((t) => t.unlockLevel > 1 && inRange(t.unlockLevel))
    .sort((a, b) => b.unlockLevel - a.unlockLevel);
  const newSpecials = specials.filter((a) => inRange(a.unlock_rank))
    .sort((a, b) => b.unlock_rank - a.unlock_rank);

  return { rank, newThemes, newSpecials, next: nextReward(rank, themeItems, specials) };
}

// The next reward above this rank: the next theme, else the next Special Polyavatar, else null.
export function nextReward(rank, themeItems, specials = []) {
  const theme = (themeItems || []).filter((t) => t.unlockLevel > rank)
    .sort((a, b) => a.unlockLevel - b.unlockLevel)[0];
  if (theme) return { kind: 'theme', unlockRank: theme.unlockLevel, ranksToGo: theme.unlockLevel - rank, theme };
  const avatar = (specials || []).filter((a) => Number(a.unlock_rank) > rank)
    .sort((a, b) => a.unlock_rank - b.unlock_rank)[0];
  if (avatar) return { kind: 'special', unlockRank: Number(avatar.unlock_rank), ranksToGo: Number(avatar.unlock_rank) - rank, avatar };
  return null;
}

// Theme keys the rank-up counts as seen (every theme unlocked at this rank), so the old
// theme-unlock pop-up never follows a rank-up pop-up.
export function themesSeenAt(themeItems, rank) {
  return (themeItems || []).filter((t) => t.unlockLevel <= rank).map((t) => t.key);
}
