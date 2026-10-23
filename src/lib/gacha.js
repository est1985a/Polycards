// Gacha helpers for the screens (pure functions, no database calls).
import { colors } from '../styles/theme';
import { t } from '../i18n';

// Rarities in display order. color: the theme color used for that rarity; labelKey: its name (i18n).
export const RARITY_ORDER = ['normal', 'rare', 'super_rare', 'secret'];
export const RARITIES = {
  normal: { stars: '★', labelKey: 'rarity.normal', color: colors.muted },
  rare: { stars: '★★', labelKey: 'rarity.rare', color: colors.accent },
  super_rare: { stars: '★★★', labelKey: 'rarity.superRare', color: colors.gold },
  secret: { stars: '', labelKey: 'rarity.secret', color: colors.danger },
};

export function rarityInfo(rarity) {
  const info = RARITIES[rarity] || RARITIES.normal;
  return { ...info, label: t(info.labelKey) };
}

// Glow around a picture or panel of this rarity (Secret glows stronger).
export function rarityGlow(rarity) {
  const c = rarityInfo(rarity).color;
  return rarity === 'secret' ? `0 0 32px 6px ${c}` : `0 0 18px ${c}`;
}

// Twinkling stars around an owned avatar picture, per rarity (Normal gets none).
// Each sparkle: [x %, y % of the picture box (star centre, may be slightly outside 0–100),
// size as a fraction of the picture size, animation delay in seconds].
export const SPARKLES = {
  normal: [],
  rare: [[8, 14, 0.16, 0], [90, 30, 0.12, 0.6], [78, 88, 0.13, 1.2]],
  super_rare: [[6, 10, 0.22, 0], [92, 16, 0.16, 0.5], [96, 64, 0.2, 1.0], [4, 70, 0.14, 1.4], [60, -4, 0.12, 0.8]],
  secret: [[4, 8, 0.22, 0], [94, 10, 0.18, 0.4], [98, 58, 0.22, 0.8], [2, 62, 0.16, 1.2], [54, -6, 0.14, 0.3], [70, 98, 0.14, 1.0]],
};

export function sparkleLayout(rarity) {
  return SPARKLES[rarity] || [];
}

// Progress to the next ticket: { toNext, per, fraction } (fraction 0 to 1 for the bar).
export function ticketProgress(status) {
  const per = status?.reviews_per_ticket || 100;
  const toNext = status?.reviews_to_next_ticket ?? per;
  return { toNext, per, fraction: Math.min(1, Math.max(0, (per - toNext) / per)) };
}

// Collection rows → [{ series, groups: [{ rarity, avatars }] }], keeping the order from the database.
export function groupCollection(rows) {
  const series = [];
  for (const row of rows || []) {
    let s = series.find((x) => x.series === row.series);
    if (!s) series.push((s = { series: row.series, groups: [] }));
    let g = s.groups.find((x) => x.rarity === row.rarity);
    if (!g) s.groups.push((g = { rarity: row.rarity, avatars: [] }));
    g.avatars.push(row);
  }
  for (const s of series) {
    s.groups.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  }
  return series;
}

// Owned / total per rarity. The Secret total is null (shown as "?") so students can't count them.
export function rarityCounts(rows) {
  return RARITY_ORDER.map((rarity) => {
    const all = (rows || []).filter((r) => r.rarity === rarity);
    return {
      rarity,
      owned: all.filter((r) => r.owned).length,
      total: rarity === 'secret' ? null : all.length,
    };
  });
}

// How a collection tile looks: 'owned', 'silhouette' (not owned yet) or 'secret' (locked ???).
export function tileState(row) {
  if (row.owned) return 'owned';
  return row.rarity === 'secret' ? 'secret' : 'silhouette';
}

// Wraps an async function so a second call while the first is still running is ignored
// (a double tap on ガチャを回す only pulls once). Returns the running call's promise.
export function singleFlight(fn) {
  let running = null;
  return (...args) => {
    if (running) return running;
    running = Promise.resolve()
      .then(() => fn(...args))
      .finally(() => { running = null; });
    return running;
  };
}
