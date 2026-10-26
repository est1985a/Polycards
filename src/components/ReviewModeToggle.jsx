import { colors, fontBody } from '../styles/theme';
import { t } from '../i18n';

// Small line icons (24 × 24 grid, currentColor).
function TapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 10.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M15 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.6-2.2L4.4 15.9a1.5 1.5 0 0 1 2.3-1.9L9 16.5V11" />
      <path d="M5.5 5.5 7 7M5 9.5h1.5" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l1-4.5L16 4.5a2.1 2.1 0 0 1 3 3L8 18.5 4 20z" />
      <path d="M14 6.5l3 3" />
    </svg>
  );
}

const OPTIONS = [
  { mode: "off", label: "answerMode.tap", Icon: TapIcon },
  { mode: "typing", label: "answerMode.typing", Icon: KeyboardIcon },
  { mode: "handwriting", label: "answerMode.handwriting", Icon: PencilIcon },
];

// 答え方 in the review's top row: タップ / タイピング / 手書き, each an icon and a short label (icons only
// below 600 px wide, .mode-toggle-label in src/index.css). The same setting as the switch on My Cards
// and in settings (App's answerMode), so changing it here changes it there too, and it is saved.
// It only changes how Japanese → English cards are answered; StudySession decides when a change
// reaches the card on screen (cardAnswerMode in src/lib/spelling.js).
export default function ReviewModeToggle({ mode = "off", onChange, handwritingEnabled = false }) {
  const options = OPTIONS.filter((o) => o.mode !== "handwriting" || handwritingEnabled);
  const current = options.some((o) => o.mode === mode) ? mode : options[0].mode;
  return (
    <div
      role="group"
      aria-label={t("answerMode.label")}
      style={{
        display: "inline-flex", gap: 2, padding: 2, borderRadius: 999, flexShrink: 0,
        background: colors.surface, border: `2px solid ${colors.line}`,
      }}
    >
      {options.map(({ mode: m, label, Icon }) => {
        const selected = m === current;
        return (
          <button
            key={m}
            type="button"
            onClick={() => { if (!selected) onChange(m); }}
            aria-pressed={selected}
            aria-label={t(label)}
            style={{
              minHeight: 44, minWidth: 44, padding: "0 10px", borderRadius: 999, border: "none",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: selected ? colors.accent : "transparent", color: selected ? colors.accentInk : colors.muted,
              fontFamily: fontBody, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", cursor: "pointer",
            }}
          >
            <Icon />
            <span className="mode-toggle-label" aria-hidden="true">{t(label)}</span>
          </button>
        );
      })}
    </div>
  );
}
