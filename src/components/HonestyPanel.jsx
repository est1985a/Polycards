import { colors, fontDisplay } from '../styles/theme';
import { HONESTY, honestyView } from '../lib/honesty';
import { ErrorText, Panel } from './ClassFields';
import { FlagIcon } from './ClassOverview';
import { t } from '../i18n';

const big = { fontFamily: fontDisplay, fontWeight: 700, fontSize: 18, color: colors.text };
const small = { fontSize: 13, color: colors.muted };

function Part({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 4, padding: "10px 12px", borderRadius: 12, background: colors.surface2 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted }}>{label}</div>
      {children}
    </div>
  );
}

// 答え方のようす (teacher-only, on the student page): tap わかった vs spelling correct, and how often a
// tap わかった came right after the card appeared. Numbers only once there is enough data (データ不足
// before that); a gentle 確認したほうがいいかも when a threshold in src/lib/honesty.js is reached.
// counts: student_honesty() (null while loading).
export default function HonestyPanel({ counts, error = null }) {
  const title = t("honesty.title", { n: HONESTY.days });
  if (!counts) {
    return (
      <Panel title={title}>
        {error ? <ErrorText>{error}</ErrorText> : <div style={small}>{t("common.loading")}</div>}
      </Panel>
    );
  }
  const { gap, speed, flagged } = honestyView(counts);
  const sec = HONESTY.fastMs / 1000;
  return (
    <Panel title={title}>
      {flagged ? (
        <div data-honesty-flag="" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, border: `2px solid ${colors.gold}`, justifySelf: "start", fontSize: 15, fontWeight: 700, color: colors.text }}>
          <FlagIcon size={18} />
          {t("honesty.flag")}
        </div>
      ) : (gap.enough || speed.enough) && (
        <div style={{ fontSize: 14, color: colors.text }}>{t("honesty.noFlag")}</div>
      )}

      <Part label={t("honesty.gapLabel")}>
        {gap.enough ? (
          <>
            <div style={big}>{t("honesty.gapLine", { tap: gap.tapRate, typed: gap.typedRate })}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: gap.flagged ? colors.gold : colors.text }}>{t("honesty.gapPoints", { n: gap.points })}</div>
            <div style={small}>{t("honesty.gapCounts", { tap: gap.tapAnswers, typed: gap.typedAnswers })}</div>
          </>
        ) : (
          <div style={small}>{t("honesty.gapNotEnough", { tap: gap.tapAnswers, typed: gap.typedAnswers, minTap: HONESTY.minTapAnswers, minTyped: HONESTY.minTypedAnswers })}</div>
        )}
      </Part>

      <Part label={t("honesty.speedLabel")}>
        {speed.enough ? (
          <>
            <div style={{ ...big, color: speed.flagged ? colors.gold : colors.text }}>{t("honesty.speedLine", { sec, n: speed.share })}</div>
            <div style={small}>{t("honesty.speedCounts", { timed: speed.timed, fast: speed.fast })}</div>
          </>
        ) : (
          <div style={small}>{t("honesty.speedNotEnough", { timed: speed.timed, min: HONESTY.minTimedGotIt })}</div>
        )}
        <div style={small}>{t("honesty.speedSince")}</div>
      </Part>

      <div style={{ fontSize: 13, color: colors.muted }}>{t("honesty.note")}</div>
    </Panel>
  );
}
