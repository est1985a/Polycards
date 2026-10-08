// Color themes. Each theme gives a value to every color role in COLOR_ROLES,
// plus 8 level colors (Lv0 to Lv7) for the level chart.
// Components never use these hex codes directly: they use colors from src/styles/theme.js,
// which point to CSS variables (var(--bg) etc.) that applyTheme() fills in.
// Every theme is checked by src/themes.test.js (all roles present, text readable).

export const COLOR_ROLES = [
  "bg",        // page background
  "surface",   // cards and panels
  "surface2",  // raised elements on a card (library deck buttons)
  "line",      // borders
  "text",      // main text, headings
  "muted",     // labels, hints, links
  "accent",    // main buttons, active tab, filled stamps (fills only, never text)
  "accentInk", // text on accent
  "accentText", // accent as readable text (player level); same as accent unless accent is too light
  "danger",    // "Still learning" button, error text
  "dangerInk", // text on danger
  "gold",      // points, levels, big numbers
];

export const themes = {
  midnight: {
    name: "Midnight Arcade",
    scheme: "dark",
    colors: {
      bg: "#15122b", surface: "#231e47", surface2: "#2e2860", line: "#3d3578",
      text: "#f4f1ff", muted: "#b3add9",
      accent: "#3df2c0", accentInk: "#15122b", accentText: "#3df2c0",
      danger: "#ff4f9a", dangerInk: "#15122b",
      gold: "#ffd35a",
    },
    levels: ["#8e87bd", "#a78bfa", "#8fa8ff", "#5ccff2", "#3df2c0", "#8ef59a", "#d4ee6b", "#ffd35a"],
  },
  pizza: {
    name: "Pizza",
    scheme: "light",
    colors: {
      bg: "#fff8e1", surface: "#ffffff", surface2: "#ffeec2", line: "#f0dca0",
      text: "#2a1b14", muted: "#6e5a4c",
      accent: "#d4341f", accentInk: "#ffffff", accentText: "#d4341f",
      danger: "#277a4d", dangerInk: "#ffffff",
      gold: "#9a5b00",
    },
    levels: ["#7a6a5e", "#8a5a9e", "#5a5fb0", "#1f6f8b", "#2e7d4f", "#6b7a12", "#a35a00", "#b0281a"],
  },
  lagoon: {
    name: "Lagoon",
    scheme: "light",
    colors: {
      bg: "#effafa", surface: "#ffffff", surface2: "#d9f1f1", line: "#bfe3e3",
      text: "#0b2b33", muted: "#3f6670",
      accent: "#ff6a4d", accentInk: "#0b2b33", accentText: "#c43f24",
      danger: "#0e7c86", dangerInk: "#ffffff",
      gold: "#8a5a00",
    },
    levels: ["#4f6f78", "#6a4fa0", "#3b5fb0", "#0f6f90", "#0e7c6a", "#4f7a14", "#8a5a00", "#b8401f"],
  },
};

export const DEFAULT_THEME = "midnight";

// Theme by id; unknown or missing id gives the default theme.
export function getTheme(id) {
  return themes[id] || themes[DEFAULT_THEME];
}

// Sets the CSS variables (--bg, --lv0, ...) on the page root so every screen switches at once.
export function applyTheme(theme, root = document.documentElement) {
  for (const role of COLOR_ROLES) root.style.setProperty(`--${role}`, theme.colors[role]);
  theme.levels.forEach((c, i) => root.style.setProperty(`--lv${i}`, c));
  root.style.colorScheme = theme.scheme;
}
