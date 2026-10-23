import { useState } from 'react';
import { colors, fontDisplay, fontBody, panel, btnLink } from '../styles/theme';
import { SESSION_SIZES } from '../lib/srs';
import { isUnlocked, unlockLabel } from '../lib/themeUnlocks';
import { AnswerModeSwitch } from './MyCardsTab';
import ThemePreview from './ThemePreview';
import ToggleSwitch from './ToggleSwitch';
import { t, tx } from '../i18n';

// Round badge in the bottom-right corner of a theme tile: a check (selected) or a lock (locked).
function TileBadge({ kind }) {
  const selected = kind === "check";
  return (
    <span
      data-badge={kind}
      aria-hidden="true"
      style={{
        position: "absolute", right: 8, bottom: 8, width: 28, height: 28, borderRadius: "50%", boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: selected ? colors.accent : colors.surface2, color: selected ? colors.accentInk : colors.muted,
        border: `2px solid ${selected ? colors.accent : colors.line}`,
      }}
    >
      {selected ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      )}
    </span>
  );
}

// One theme: the live preview, the name and when it unlocks. Locked tiles do nothing but ask
// the screen to show ランク N になると使えます. rank null (still loading): no status line, no lock,
// and the tile can't be tapped yet, so nothing flashes as locked.
export function ThemeTile({ item, rank, selected, onChoose, onLocked }) {
  const pending = rank == null;
  const locked = !pending && !isUnlocked(item, rank);
  return (
    <button
      onClick={() => (locked ? onLocked(item) : onChoose(item.key))}
      disabled={pending}
      aria-pressed={selected}
      aria-disabled={locked || undefined}
      aria-label={pending ? item.name : t("themes.tileLabel", { name: item.name, status: unlockLabel(item, rank) })}
      data-theme-key={item.key}
      style={{
        position: "relative", display: "grid", gap: 6, alignContent: "start", padding: 8, minWidth: 0,
        background: colors.surface, border: `2px solid ${selected ? colors.accent : colors.line}`, borderRadius: 18,
        boxShadow: selected ? `0 0 0 2px ${colors.accent}` : "none",
        textAlign: "left", fontFamily: fontBody, color: colors.text, cursor: locked || pending ? "default" : "pointer",
      }}
    >
      <ThemePreview theme={item.theme} rank={rank} locked={locked} radius={12} />
      <span style={{ padding: "2px 34px 0 4px", fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{item.name}</span>
      {!pending && <span style={{ padding: "0 34px 2px 4px", fontSize: 12, color: colors.muted }}>{unlockLabel(item, rank)}</span>}
      {selected && <TileBadge kind="check" />}
      {locked && <TileBadge kind="lock" />}
    </button>
  );
}

// 1回の枚数: 10枚 / 20枚 / 30枚, same look as the 答え方 switch.
export function SessionSizeSwitch({ size, onChange }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{t("settings.sessionSize")}</span>
      <div
        role="group"
        aria-label={t("settings.sessionSize")}
        style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: colors.surface, border: `2px solid ${colors.line}` }}
      >
        {SESSION_SIZES.map((n) => {
          const selected = n === size;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              aria-pressed={selected}
              style={{
                flex: 1, minWidth: 0, minHeight: 44, padding: "0 8px", borderRadius: 999, border: "none",
                background: selected ? colors.accent : "transparent", color: selected ? colors.accentInk : colors.muted,
                fontFamily: fontBody, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", cursor: "pointer",
              }}
            >
              {tx("settings.sessionSizeOption", { n: <span style={{ fontFamily: fontDisplay }}>{n}</span> })}
            </button>
          );
        })}
      </div>
      <span style={{ fontSize: 12, color: colors.muted }}>{t("settings.sessionSizeNote")}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ ...panel, display: "grid", gap: 14 }}>
      <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</h3>
      {children}
    </section>
  );
}

// 設定 screen (view "settings" in App.jsx).
// themes: themeList() rows (null while loading); themesFailed: theme_unlocks couldn't be read (then
// themes holds only Midnight). currentTheme: the key in use; rank: the student's rank (null while
// loading: tiles show without locks or status lines and can't be tapped). onChooseTheme(key) applies and saves.
// themeError: the save error to show. The 答え方 switch shares App's state with the one on My Cards.
export default function SettingsScreen({
  themes, themesFailed = false, currentTheme, rank, onChooseTheme, themeError = null,
  sessionSize, onSessionSizeChange,
  answerMode, onAnswerModeChange, handwritingEnabled = false,
  reduceMotion, onReduceMotionChange,
  onBack, wide = false,
}) {
  const [lockedNote, setLockedNote] = useState(null);

  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <div>
        <button onClick={onBack} style={{ ...btnLink, minHeight: 44 }}>{t("settings.back")}</button>
      </div>
      <h2 style={{ margin: 0, fontWeight: 700, fontSize: 30 }}>{t("settings.title")}</h2>

      <Section title={t("settings.themes")}>
        {themes === null ? (
          <div style={{ fontSize: 14, color: colors.muted }}>{t("common.loading")}</div>
        ) : (
          <>
            {themesFailed && (
              <div role="alert" style={{ fontSize: 14, color: colors.danger }}>{t("settings.themesFailed")}</div>
            )}
            <div
              data-theme-grid=""
              style={{ display: "grid", gridTemplateColumns: `repeat(${wide ? 5 : 2}, minmax(0, 1fr))`, gap: wide ? 14 : 10 }}
            >
              {themes.map((item) => (
                <ThemeTile
                  key={item.key}
                  item={item}
                  rank={rank}
                  selected={item.key === currentTheme}
                  onChoose={(key) => { setLockedNote(null); onChooseTheme(key); }}
                  onLocked={(theme) => setLockedNote(t("settings.themeLocked", { n: theme.unlockLevel }))}
                />
              ))}
            </div>
            <div role="status" style={{ minHeight: 20, fontSize: 14, color: colors.muted }}>{lockedNote}</div>
            {themeError && <div role="alert" style={{ fontSize: 14, color: colors.danger }}>{themeError}</div>}
          </>
        )}
      </Section>

      <Section title={t("settings.study")}>
        <SessionSizeSwitch size={sessionSize} onChange={onSessionSizeChange} />
        <AnswerModeSwitch mode={answerMode} onChange={onAnswerModeChange} handwritingEnabled={handwritingEnabled} wide={wide} />
      </Section>

      <Section title={t("settings.display")}>
        <div style={{ display: "grid", gap: 4 }}>
          <button
            role="switch"
            aria-checked={reduceMotion}
            onClick={() => onReduceMotionChange(!reduceMotion)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, width: "100%",
              padding: 0, background: "transparent", border: "none", cursor: "pointer",
              fontFamily: fontBody, fontSize: 15, fontWeight: 700, color: colors.text, textAlign: "left",
            }}
          >
            <span>{t("settings.reduceMotion")}</span>
            <ToggleSwitch on={reduceMotion} />
          </button>
          <span style={{ fontSize: 12, color: colors.muted }}>{t("settings.reduceMotionNote")}</span>
        </div>
      </Section>
    </div>
  );
}
