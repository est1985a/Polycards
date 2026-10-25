import { colors, fontDisplay, panel } from '../styles/theme';
import { trainingActivities } from '../lib/training';
import { t } from '../i18n';

// Icons for the activity cards (current text color).
const ICONS = {
  pencil: (
    <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="currentColor" opacity="0.9" />
      <path d="M4 20l4.6-1.2-3.4-3.4z" fill="currentColor" opacity="0.5" />
    </svg>
  ),
};

// The トレーニング tab: one card per training activity (from TRAINING_ACTIVITIES in lib/training.js).
// More activities only add cards; the grid is 1 column on phones, 2 on wide screens.
// onOpen(id): an activity card was tapped.
export default function TrainingTab({ onOpen, wide = false, activities = trainingActivities() }) {
  return (
    <div style={{ display: "grid", gap: 16, paddingTop: 8 }}>
      <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, margin: 0, color: colors.text }}>{t("training.title")}</h2>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: wide ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
        {activities.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onOpen(a.id)}
            style={{
              ...panel, display: "flex", alignItems: "center", gap: 16, minHeight: 96, textAlign: "left",
              cursor: "pointer", color: colors.text, borderColor: colors.accent,
            }}
          >
            <span style={{ flex: "none", width: 64, height: 64, borderRadius: 16, display: "grid", placeItems: "center", background: colors.surface2, color: colors.accentText }}>
              {ICONS[a.icon]}
            </span>
            <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
              <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20 }}>{t(a.title)}</span>
              <span style={{ fontSize: 14, color: colors.muted }}>{t(a.description)}</span>
            </span>
            <span aria-hidden="true" style={{ marginLeft: "auto", fontSize: 24, color: colors.muted }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
