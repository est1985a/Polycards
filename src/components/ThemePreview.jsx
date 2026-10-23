import { colors, fontDisplay, fontBody } from '../styles/theme';
import { themeVars } from '../themes';
import LogoMark from './LogoMark';
import { t } from '../i18n';

// A tiny live copy of the app in one theme (settings tiles and the unlock pop-up).
// The theme's CSS variables are set on this box itself, so everything inside shows that theme,
// whatever theme the app is using. Only theme roles are used (colors.*), never fixed colors.
// Sizes are in cqw (1% of the preview's width), so the same drawing fits a small tile or a big pop-up.
// theme: an entry of src/themes.js. rank: the student's rank for the mini player card (an example
// number when there is none, e.g. in tests or while it loads).
// locked: dimmed (a theme the student can't use yet).

const u = (n) => `${n}cqw`;
const lift = `0 ${u(1)} ${u(3)} color-mix(in srgb, ${colors.text} 18%, transparent)`;

// Heights of the 8 mini level-chart bars (percent of the chart).
const BARS = [55, 80, 100, 70, 52, 38, 24, 14];

function MiniHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${u(3.5)} ${u(4)} 0` }}>
      <span style={{ display: "flex", alignItems: "center", gap: u(1.6), fontFamily: fontDisplay, fontWeight: 700, fontSize: u(5), color: colors.text }}>
        <LogoMark style={{ width: u(6), height: u(5.2) }} />
        Polycards
      </span>
      <span
        style={{
          width: u(7), height: u(7), borderRadius: "50%", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: colors.surface2, border: `${u(0.5)} solid ${colors.line}`,
          fontFamily: fontDisplay, fontWeight: 700, fontSize: u(3.6), color: colors.text,
        }}
      >
        A
      </span>
    </div>
  );
}

const miniPanel = {
  background: colors.surface, border: `${u(0.5)} solid ${colors.line}`, borderRadius: u(3),
  padding: u(2.6), boxShadow: lift, boxSizing: "border-box",
};

function MiniPlayer({ rank }) {
  return (
    <div style={{ ...miniPanel, display: "grid", gap: u(1.2) }}>
      <span style={{ fontSize: u(3.2), color: colors.muted }}>{t("themes.previewRank")}</span>
      <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: u(9), color: colors.accentText }}>{rank}</span>
      <span style={{ display: "block", height: u(1.6), borderRadius: u(1), background: colors.surface2, overflow: "hidden" }}>
        <span style={{ display: "block", width: "62%", height: "100%", background: colors.accent }} />
      </span>
    </div>
  );
}

function MiniChart() {
  return (
    <div style={{ ...miniPanel, display: "flex", alignItems: "flex-end", gap: u(0.9), height: u(17) }}>
      {BARS.map((h, i) => (
        <span key={i} data-level={i} style={{ flex: 1, height: `${h}%`, borderRadius: `${u(0.6)} ${u(0.6)} 0 0`, background: colors.level(i) }} />
      ))}
    </div>
  );
}

function MiniCardBack() {
  return (
    <div style={{ display: "grid", gap: u(2.4) }}>
      <div
        style={{
          position: "relative", display: "grid", gap: u(1.6), alignContent: "start", padding: u(3), minHeight: u(29), boxSizing: "border-box",
          background: colors.surface2, border: `${u(0.6)} solid ${colors.accent}`, borderRadius: u(3.4), boxShadow: lift,
        }}
      >
        <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: u(3), color: colors.accentText }}>EN → JP</span>
        <span
          style={{
            position: "absolute", top: u(2.4), right: u(2.4), padding: `${u(0.5)} ${u(1.4)}`, borderRadius: u(4),
            border: `${u(0.4)} solid ${colors.gold}`, fontFamily: fontDisplay, fontWeight: 700, fontSize: u(2.8), color: colors.gold,
          }}
        >
          Lv 3
        </span>
        <span style={{ marginTop: u(1.5), fontSize: u(4.2), color: colors.muted }}>familiar</span>
        <span style={{ fontSize: u(6), fontWeight: 700, color: colors.accentText }}>よく知られた</span>
      </div>
      <div style={{ display: "flex", gap: u(1.6) }}>
        {[[t("themes.previewNotYet"), colors.danger, colors.dangerInk], [t("themes.previewGotIt"), colors.accent, colors.accentInk]].map(([label, bg, ink]) => (
          <span
            key={label}
            style={{
              flex: 1, height: u(7), borderRadius: u(2), display: "flex", alignItems: "center", justifyContent: "center",
              background: bg, color: ink, fontSize: u(3.2), fontWeight: 700, boxShadow: lift,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const EXAMPLE_RANK = 12;

export default function ThemePreview({ theme, rank = null, locked = false, radius = 14 }) {
  return (
    <div
      role="img"
      aria-label={t("themes.previewLabel", { name: theme.name })}
      data-theme-preview=""
      style={{ ...themeVars(theme), colorScheme: theme.scheme, containerType: "inline-size", width: "100%" }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "relative", aspectRatio: "16 / 10", overflow: "hidden", borderRadius: radius,
          background: `var(--backdrop), ${colors.bg}`, color: colors.text, fontFamily: fontBody, lineHeight: 1,
          filter: locked ? "saturate(0.55) brightness(0.75)" : "none",
        }}
      >
        <MiniHeader />
        <div style={{ display: "grid", gridTemplateColumns: "42% minmax(0, 1fr)", gap: u(3.4), padding: `${u(3.4)} ${u(4)} 0`, textAlign: "left" }}>
          <div style={{ display: "grid", gap: u(2.4), alignContent: "start" }}>
            <MiniPlayer rank={rank ?? EXAMPLE_RANK} />
            <MiniChart />
          </div>
          <MiniCardBack />
        </div>
      </div>
    </div>
  );
}
