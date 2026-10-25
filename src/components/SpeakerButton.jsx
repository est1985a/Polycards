import { colors } from '../styles/theme';
import { speakWord } from '../lib/speech';
import { t } from '../i18n';

// Speaker icon (inline SVG, decorative: the button's aria-label says what it does).
function SpeakerIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill={colors.accentText} stroke={colors.accentText} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke={colors.accentText} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 発音を聞く: reads the English word aloud. The tap never reaches the card underneath, so it can't
// flip the card or count as an answer. text: the card's main English (never an alternate answer).
// slow: the ゆっくり setting. size: the round button (at least 44 px to tap).
export default function SpeakerButton({ text, slow = false, size = 44, style = null }) {
  const stop = (e) => e.stopPropagation();
  return (
    <button
      type="button"
      aria-label={t("speech.listen")}
      onClick={(e) => { e.stopPropagation(); speakWord(text, { slow }); }}
      onKeyDown={stop}
      onPointerDown={stop}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        width: size, height: size, padding: 0, borderRadius: 999, cursor: "pointer",
        background: "transparent", border: `2px solid color-mix(in srgb, ${colors.accent} 55%, transparent)`,
        ...style,
      }}
    >
      <SpeakerIcon size={Math.round(size * 0.5)} />
    </button>
  );
}
