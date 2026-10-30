import { colors, fontDisplay, panel } from '../styles/theme';
import { ghostSmall } from '../styles/forms';
import BackButton from './BackButton';
import PlayerStats from './PlayerStats';
import LevelChart from './LevelChart';
import { StatsBody } from './StatsScreen';
import { ErrorText } from './ClassFields';
import { dateText, dateTimeText, lastActiveText } from '../lib/classes';
import { TicketIcon } from './GachaIcons';
import { t } from '../i18n';

function Panel({ title, action, children }) {
  return (
    <section style={{ ...panel, display: "grid", gap: 12, alignContent: "start" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function TicketsPanel({ tickets, onGive }) {
  return (
    <section style={{ ...panel, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.gold }}>
        <TicketIcon size={28} />
        <div>
          <div style={{ fontSize: 13, color: colors.muted }}>{t("studentPage.tickets")}</div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, lineHeight: 1.1 }}>{t("studentPage.ticketCount", { n: tickets })}</div>
        </div>
      </div>
      {onGive && (
        <button onClick={onGive} style={{ ...ghostSmall, borderColor: colors.gold, borderWidth: 2, color: colors.gold, fontWeight: 700 }}>{t("award.give")}</button>
      )}
    </section>
  );
}

function PacksPanel({ packs }) {
  return (
    <Panel title={t("studentPage.packsTitle")}>
      {packs.length === 0 ? (
        <div style={{ fontSize: 14, color: colors.muted }}>{t("studentPage.noPacks")}</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {packs.map((p) => (
            <li key={p.deck_id} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 10px", borderRadius: 10, background: colors.surface2, overflowWrap: "anywhere" }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                {p.source && <span style={{ display: "block", fontSize: 12, color: colors.muted }}>{p.source}</span>}
                <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: colors.text }}>{p.name}</span>
              </span>
              <span style={{ flexShrink: 0, fontSize: 12, color: colors.muted }}>{dateText(p.added_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AwardsPanel({ awards }) {
  return (
    <Panel title={t("studentPage.awardsTitle")}>
      {awards.length === 0 ? (
        <div style={{ fontSize: 14, color: colors.muted }}>{t("studentPage.noAwards")}</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {awards.map((a) => (
            <li key={a.id} style={{ display: "grid", gap: 2, padding: "8px 12px", borderRadius: 12, background: colors.surface2, overflowWrap: "anywhere" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13, color: colors.muted }}>
                <span>{dateTimeText(a.created_at)}</span>
                <span>{a.teacher_name}</span>
                {a.class_name && <span>{a.class_name}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: colors.gold }}>{t("award.amountBadge", { n: a.amount })}</span>
                {a.message && <span style={{ fontSize: 14, color: colors.text }}>{a.message}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// One student's page in the 先生 tab (teacher view, read-only apart from チケットを贈る).
// detail: student_detail() (null while loading). classTitle: the back button's label (the class name).
// today: today's Japan date for the stats cards. onGive(): open the award pop-up for this student
// (null when the class is archived).
export default function StudentPage({ detail, error = null, classTitle, today, onBack, onGive = null, wide = false }) {
  const back = <div><BackButton label={classTitle} onClick={onBack} /></div>;
  if (!detail) {
    return (
      <div style={{ display: "grid", gap: 16, paddingTop: 8, textAlign: "left" }}>
        {back}
        {error ? <ErrorText>{error}</ErrorText> : <div style={{ fontSize: 15, color: colors.muted }}>{t("common.loading")}</div>}
      </div>
    );
  }

  const s = detail.student;
  const account = [s.display_name, s.email].filter((x, i, all) => x && all.indexOf(x) === i).join(" · ");
  const counts = detail.level_counts;
  const playerStats = { playerRank: detail.player_level, peakPoints: detail.peak_points, bonusPoints: detail.bonus_points };

  const side = (
    <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
      <PlayerStats stats={playerStats} avatar={detail.avatar} />
      <TicketsPanel tickets={detail.tickets} onGive={onGive} />
      <LevelChart counts={counts} />
      <PacksPanel packs={detail.packs} />
      <AwardsPanel awards={detail.awards} />
      {/* PHASE 3: the honesty check (tap-mode わかった rate vs typing / handwriting accuracy,
          teacher-only) goes here, under the award history. Not built yet. */}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16, paddingTop: 8, textAlign: "left" }}>
      {back}
      <div>
        <h2 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{s.real_name}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", fontSize: 14, color: colors.muted, overflowWrap: "anywhere" }}>
          {s.student_number != null && <span>{t("studentPage.number", { n: s.student_number })}</span>}
          <span>{account}</span>
        </div>
        <div style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>{lastActiveText(detail)}</div>
      </div>
      <ErrorText>{error}</ErrorText>

      <div style={{ display: "grid", gap: 16, alignItems: "start", gridTemplateColumns: wide ? "400px minmax(0, 1fr)" : "1fr" }}>
        {side}
        <div style={{ display: "grid", gap: 16 }}>
          <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, color: colors.text }}>{t("studentPage.statsTitle")}</h3>
          <StatsBody
            data={{ days: detail.days, totals: detail.totals, trouble: detail.trouble }}
            today={today} masteredCount={counts[8] ?? 0} wide={false} viewer="teacher"
          />
        </div>
      </div>
    </div>
  );
}
