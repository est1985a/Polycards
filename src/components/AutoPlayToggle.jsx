import { colors } from '../styles/theme';
import { stopSpeaking } from '../lib/speech';
import { t } from '../i18n';

// 自動再生 switch in the review's top row: a round speaker button (sound waves when on, a slash when
// off). The same setting as 自動再生 in settings (App's autoPlay, saved on the device), so changing
// it here changes it there too. FlipCard reads the setting when a card appears or flips, so the
// change starts with the next word; turning it off also stops a word being read right now.
export default function AutoPlayToggle({ on = false, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={t("settings.autoPlay")}
      title={t("settings.autoPlay")}
      onClick={() => {
        if (on) stopSpeaking();
        onChange(!on);
      }}
      style={{
        width: 44, height: 44, flexShrink: 0, padding: 0, borderRadius: 999, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: on ? colors.accent : colors.surface, color: on ? colors.accentInk : colors.muted,
        border: `2px solid ${on ? colors.accent : colors.line}`,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {on ? (
          <>
            <path d="M15.5 9a4 4 0 0 1 0 6" />
            <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        ) : (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        )}
      </svg>
    </button>
  );
}
