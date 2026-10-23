// Color themes. Each theme gives a value to every color role in COLOR_ROLES,
// plus 8 level colors (Lv0 to Lv7) for the level chart, and an optional backdrop: a CSS
// background layer drawn over bg behind the whole app (.app-backdrop in src/index.css).
// A new theme also needs a row in the theme_unlocks table (the rank that unlocks it).
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
  "accentText", // accent as readable text (rank); same as accent unless accent is too light
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
  ryukoku: {
    name: "Ryukoku",
    scheme: "dark",
    colors: {
      bg: "#2b2a63", surface: "#3b3a85", surface2: "#5554a2", line: "#7a79c4",
      text: "#ffffff", muted: "#e4e3ff",
      accent: "#ab951d", accentInk: "#1e1d4a", accentText: "#f0d864",
      danger: "#ffffff", dangerInk: "#2b2a63",
      gold: "#f0d864",
    },
    levels: ["#c8c6dd", "#d4c6f1", "#c6c9f1", "#b1caec", "#89cbe1", "#6ecfbe", "#9ccd6a", "#e8c22c"],
    backdrop: "radial-gradient(55% 45% at 100% 0%, rgba(171,149,29,0.22), transparent 70%), radial-gradient(50% 50% at 0% 100%, rgba(255,255,255,0.08), transparent 70%)",
  },
  snow: {
    name: "Snow",
    scheme: "light",
    colors: {
      bg: "#edf2f9", surface: "#ffffff", surface2: "#e0e9f5", line: "#c6d4e8",
      text: "#132034", muted: "#4a5b76",
      accent: "#2d6bd8", accentInk: "#ffffff", accentText: "#2a61c2",
      danger: "#bf3557", dangerInk: "#ffffff",
      gold: "#8a5800",
    },
    levels: ["#677383", "#855eba", "#6666cc", "#3b6cce", "#2379a4", "#217a83", "#257e70", "#8a6b0f"],
  },
  sakura: {
    name: "Sakura",
    scheme: "light",
    colors: {
      bg: "#fff3f6", surface: "#ffffff", surface2: "#ffe4ec", line: "#f5c9d7",
      text: "#3b1626", muted: "#7d4a5f",
      accent: "#c43c6e", accentInk: "#ffffff", accentText: "#b8336a",
      danger: "#4f7d3a", dangerInk: "#ffffff",
      gold: "#9a5800",
    },
    levels: ["#8a6678", "#b143b1", "#8c59c0", "#6666cc", "#2e799e", "#2a7e54", "#467e2a", "#936710"],
  },
  matcha: {
    name: "Matcha",
    scheme: "light",
    colors: {
      bg: "#f2f4e6", surface: "#fdfdf6", surface2: "#e3ead0", line: "#ccd7ab",
      text: "#1d2913", muted: "#52603c",
      accent: "#4f7a23", accentInk: "#ffffff", accentText: "#45691f",
      danger: "#94403a", dangerInk: "#ffffff",
      gold: "#8a5d00",
    },
    levels: ["#6a725a", "#8d6944", "#ba4a5d", "#aa5a31", "#327785", "#307e4a", "#477e20", "#89690b"],
  },
  autumn: {
    name: "Autumn Leaves",
    scheme: "dark",
    colors: {
      bg: "#1f120c", surface: "#331e14", surface2: "#43291b", line: "#643c27",
      text: "#fff1e4", muted: "#d8b89c",
      accent: "#ff8a3a", accentInk: "#1f120c", accentText: "#ff9a55",
      danger: "#ff5e6c", dangerInk: "#1f120c",
      gold: "#ffc94a",
    },
    levels: ["#ad9c90", "#e18990", "#d788b0", "#ea816c", "#ef793e", "#f38212", "#df980c", "#ebbc00"],
  },
  neon: {
    name: "Neon Tokyo",
    scheme: "dark",
    colors: {
      bg: "#0b0220", surface: "#1a0636", surface2: "#29094f", line: "#b51d9e",
      text: "#ffffff", muted: "#d4b8ff",
      accent: "#1ff2ff", accentInk: "#0b0220", accentText: "#1ff2ff",
      danger: "#ff2fb3", dangerInk: "#0b0220",
      gold: "#fff23d",
    },
    levels: ["#ad85d6", "#ff05ff", "#ff14b1", "#00b0eb", "#00ebeb", "#00eb75", "#75eb00", "#ebd700"],
    backdrop: "radial-gradient(60% 55% at 0% 0%, rgba(255,47,179,0.38), transparent 70%), radial-gradient(55% 55% at 100% 100%, rgba(31,242,255,0.30), transparent 70%), repeating-linear-gradient(0deg, rgba(255,47,179,0.08) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(31,242,255,0.07) 0 1px, transparent 1px 34px)",
  },
  galaxy: {
    name: "Galaxy",
    scheme: "dark",
    colors: {
      bg: "#060826", surface: "#0f1450", surface2: "#1a2178", line: "#3d4ad0",
      text: "#f3f5ff", muted: "#b3c0ff",
      accent: "#ffa53d", accentInk: "#060826", accentText: "#ffb35c",
      danger: "#ff5fa8", dangerInk: "#060826",
      gold: "#ffe27a",
    },
    levels: ["#909bd0", "#c47cf8", "#ab8fff", "#529aff", "#00c3eb", "#0cdfaa", "#ff2eb9", "#eb9c00"],
    backdrop: "radial-gradient(1.6px 1.6px at 22px 34px, #ffffff, transparent) 0 0/180px 180px, radial-gradient(1.2px 1.2px at 120px 90px, #dfe6ff, transparent) 0 0/180px 180px, radial-gradient(1px 1px at 70px 150px, #ffe9b8, transparent) 0 0/180px 180px, radial-gradient(1.4px 1.4px at 160px 20px, #ffffff, transparent) 0 0/240px 240px, radial-gradient(50% 45% at 85% 10%, rgba(196,92,255,0.40), transparent 70%), radial-gradient(45% 50% at 10% 95%, rgba(40,210,230,0.28), transparent 70%), radial-gradient(35% 30% at 55% 55%, rgba(255,95,168,0.14), transparent 70%)",
  },
};

export const DEFAULT_THEME = "midnight";

// Theme by id; unknown or missing id gives the default theme.
export function getTheme(id) {
  return themes[id] || themes[DEFAULT_THEME];
}

// The CSS variables of a theme: { "--bg": "#...", ..., "--lv0": ..., "--backdrop": ... }.
// Used on the page root (applyTheme) and on a ThemePreview's own box.
export function themeVars(theme) {
  const vars = {};
  for (const role of COLOR_ROLES) vars[`--${role}`] = theme.colors[role];
  theme.levels.forEach((c, i) => { vars[`--lv${i}`] = c; });
  vars["--backdrop"] = theme.backdrop || "none";
  return vars;
}

// Sets the CSS variables (--bg, --lv0, ...) on the page root so every screen switches at once.
export function applyTheme(theme, root = document.documentElement) {
  for (const [name, value] of Object.entries(themeVars(theme))) root.style.setProperty(name, value);
  root.style.colorScheme = theme.scheme;
}
