import { colors } from '../styles/theme';
import { t } from '../i18n';

// The small flag that opens the report sheet (useCardReport.jsx). 44 px to tap, but negative margins keep it from
// making its row any taller. Muted, so it doesn't pull attention from the card.
export default function ReportFlag({ onClick, size = 18, style = null }) {
  return (
    <button
      type="button"
      aria-label={t("report.flag")}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        width: 44, height: 44, margin: -8, flexShrink: 0, padding: 0, display: "inline-flex",
        alignItems: "center", justifyContent: "center", background: "transparent", border: "none",
        borderRadius: 12, color: colors.muted, cursor: "pointer", ...style,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 21V4" />
        <path d="M5 4h11l-2 4 2 4H5" />
      </svg>
    </button>
  );
}
