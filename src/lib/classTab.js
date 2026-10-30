// The クラス tab (students): which class is shown, and the leaderboard's medals. Pure functions.
// The leaderboard itself comes from class_leaderboard() (supabase/polycards-class-tab.sql).

// The class shown last, remembered per account on this device (a convenience only).
const lastClassKey = (userId) => `polycards.classTab.${userId}`;

export function loadLastClass(storage, userId) {
  try {
    return (userId && storage?.getItem(lastClassKey(userId))) || null;
  } catch {
    return null;
  }
}

export function saveLastClass(storage, userId, classId) {
  try {
    if (userId && classId) storage?.setItem(lastClassKey(userId), classId);
  } catch {
    // private mode / storage full: the first class is shown next time
  }
}

// The class to show: the saved one if the student is still in it, else the first. null = no classes.
export function pickClass(classes, savedId) {
  if (!classes?.length) return null;
  return classes.some((c) => c.id === savedId) ? savedId : classes[0].id;
}

// The top 3 ranks get a medal (ties share it: two 1st places are both gold).
export function medal(rank) {
  return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;
}
