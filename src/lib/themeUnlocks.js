// Which themes a student can use. The rank needed for each theme comes from the theme_unlocks
// table (fetchThemeUnlocks in api.js), never from the app. Pure functions only.
import { t } from '../i18n';

// The themes the app can show, in unlock order: [{ key, name, unlockLevel, theme }].
// A table row with no theme in src/themes.js, or a theme with no row, is left out.
export function themeList(rows, themes) {
  return (rows || [])
    .filter((r) => themes[r.theme_key])
    .map((r) => ({ key: r.theme_key, name: themes[r.theme_key].name, unlockLevel: Number(r.unlock_level), theme: themes[r.theme_key] }))
    .sort((a, b) => a.unlockLevel - b.unlockLevel || a.key.localeCompare(b.key));
}

export function isUnlocked(item, rank) {
  return item.unlockLevel <= rank;
}

// Keys of the themes unlocked at this rank, in unlock order.
export function unlockedThemes(list, rank) {
  return list.filter((t) => isUnlocked(t, rank)).map((t) => t.key);
}

// Unlocked themes the student hasn't been told about yet, highest unlock rank first.
// The starting theme(s) (unlock rank 1 or lower) are never "new".
export function newThemes(list, rank, seen = []) {
  return list
    .filter((t) => isUnlocked(t, rank) && t.unlockLevel > 1 && !seen.includes(t.key))
    .sort((a, b) => b.unlockLevel - a.unlockLevel);
}

// What the unlock pop-up shows: the new theme with the highest unlock rank, and how many
// other new ones there are. null when nothing is new.
export function featuredUnlock(list, rank, seen = []) {
  const fresh = newThemes(list, rank, seen);
  return fresh.length ? { theme: fresh[0], others: fresh.length - 1 } : null;
}

// The seen list after the student has been told about everything unlocked now.
export function markSeen(list, rank, seen = []) {
  return [...new Set([...seen, ...unlockedThemes(list, rank)])];
}

// Status line under a tile in settings.
export function unlockLabel(item, rank) {
  if (item.unlockLevel <= 1) return t("themes.fromStart");
  return isUnlocked(item, rank) ? t("themes.unlockedAt", { n: item.unlockLevel }) : t("themes.unlocksAt", { n: item.unlockLevel });
}
