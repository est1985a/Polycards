import { colors, fontDisplay, panel, btnLink } from '../styles/theme';
import { RARITY_ORDER, rarityInfo, ticketProgress, spellingProgress, eventActive, eventEndDate, eventShare, pumpkinColor } from '../lib/gacha';
import GachaMachine from './GachaMachine';
import { TicketIcon, PumpkinIcon } from './GachaIcons';
import { t, tx } from '../i18n';

// 出る確率: one box per rarity with today's chance (from gacha_status; it changes as the
// collection fills up). A rarity at 0% is dimmed.
// During the Halloween event: eventPct = the chance (percent) the Polyavatar comes from the
// Halloween set, shown as its own box (the rarity boxes already include the boost).
export function GachaOdds({ odds = {}, eventPct = 0 }) {
  return (
    <div style={{ ...panel, display: "grid", gap: 12, textAlign: "left" }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{t("gacha.odds")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {RARITY_ORDER.map((rarity) => {
          const info = rarityInfo(rarity);
          const pct = Number(odds[rarity] ?? 0);
          const empty = pct === 0;
          return (
            <div
              key={rarity}
              data-rarity={rarity}
              data-empty={empty ? "" : undefined}
              style={{
                background: colors.surface2, border: `2px solid ${info.color}`, borderRadius: 14, padding: "10px 12px",
                opacity: empty ? 0.4 : 1,
              }}
            >
              <div style={{ fontSize: 13, color: colors.text }}>
                {info.stars && <span style={{ color: info.color, marginRight: 4 }}>{info.stars}</span>}
                {info.label}
              </div>
              <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, color: colors.text }}>{t("gacha.percent", { n: pct })}</div>
            </div>
          );
        })}
        {eventPct > 0 && (
          <div
            data-event-odds=""
            style={{
              gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10,
              background: colors.surface2, border: `2px solid ${pumpkinColor}`, borderRadius: 14, padding: "10px 12px",
            }}
          >
            <PumpkinIcon size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: colors.text }}>{t("gacha.event.share")}</div>
              <div style={{ fontSize: 12, color: colors.muted }}>{t("gacha.event.shareNote")}</div>
            </div>
            <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, color: colors.text }}>{t("gacha.percent", { n: eventPct })}</div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, color: colors.muted }}>{t("gacha.noRepeats")}</div>
    </div>
  );
}

// 期間限定 sign by the machine while the event is on: pumpkin, pill and the last day.
export function EventSign({ status }) {
  const date = eventEndDate(status);
  return (
    <div
      data-event-sign=""
      style={{
        display: "flex", alignItems: "center", gap: 12, textAlign: "left", boxSizing: "border-box", width: "100%",
        background: colors.surface2, border: `2px solid ${pumpkinColor}`, borderRadius: 16, padding: "10px 14px",
      }}
    >
      <PumpkinIcon size={32} />
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <span
          style={{
            justifySelf: "start", padding: "1px 10px", borderRadius: 10, border: `2px solid ${pumpkinColor}`, color: colors.text,
            fontSize: 12, fontWeight: 700,
          }}
        >
          {t("gacha.event.limited")}
        </span>
        {date && <span style={{ fontSize: 14, lineHeight: 1.4, color: colors.text }}>{t("gacha.event.halloween", date)}</span>}
      </div>
    </div>
  );
}

// The big gold pull button, with a short note when there are no tickets.
export function PullButton({ tickets, pulling, onPull }) {
  const disabled = tickets < 1 || pulling;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        onClick={onPull}
        disabled={disabled}
        style={{
          minHeight: 60, borderRadius: 18, border: "none", cursor: disabled ? "default" : "pointer",
          background: disabled ? colors.surface2 : colors.gold, color: disabled ? colors.muted : colors.bg,
          fontFamily: fontDisplay, fontWeight: 700, fontSize: 22,
          boxShadow: disabled ? "none" : `0 0 18px ${colors.gold}`,
        }}
      >
        {pulling ? t("gacha.pulling") : t("gacha.pull")}
      </button>
      {tickets < 1 && (
        <div style={{ fontSize: 13, color: colors.muted }}>{t("gacha.noTicketsNote")}</div>
      )}
    </div>
  );
}

// Gacha screen. status: from gacha_status (null while loading).
// wide: machine on the left, everything else on the right.
export default function GachaScreen({ status, pulling, error, onPull, onOpenCollection, wide = false }) {
  if (!status) {
    return <div style={{ ...panel, color: colors.muted }}>{t("common.loading")}</div>;
  }

  const { toNext, per, fraction } = ticketProgress(status);
  // Today's review ticket is already earned (the database gives at most 1 per day).
  const capped = status.next_ticket_tomorrow === true;
  // Spelling tickets have no daily cap, so there is no "tomorrow" state here.
  const spell = spellingProgress(status);
  // Limited-time event (Halloween 2026): sign by the machine and its share in the odds.
  const showEvent = eventActive(status);
  const sign = showEvent ? <EventSign status={status} /> : null;

  const content = (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 30 }}>{t("gacha.title")}</h2>
        <button onClick={onOpenCollection} style={{ ...btnLink, fontSize: 15, color: colors.text, minHeight: 44 }}>
          {t("gacha.collectionLink", { owned: status.owned, total: status.total })}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.gold }}>
        <TicketIcon size={28} />
        <span style={{ fontSize: 15, color: colors.text }}>{t("gacha.tickets")}</span>
        <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 28 }}>{t("gacha.ticketCount", { n: status.tickets })}</span>
      </div>

      <PullButton tickets={status.tickets} pulling={pulling} onPull={onPull} />
      {error && <div role="alert" style={{ fontSize: 14, color: colors.danger }}>{error}</div>}

      <div style={{ ...panel, display: "grid", gap: 8 }}>
        {capped ? (
          <div style={{ fontSize: 14 }}>{t("gacha.ticketTomorrow")}</div>
        ) : (
          <div style={{ fontSize: 14 }}>
            {tx("gacha.toNextTicket", { n: <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: colors.gold }}>{toNext}</span>, count: toNext })}
          </div>
        )}
        <div
          role="progressbar" aria-valuemin={0} aria-valuemax={per} aria-valuenow={capped ? per : per - toNext}
          style={{ height: 12, borderRadius: 6, background: colors.surface2, overflow: "hidden" }}
        >
          <div style={{ width: `${(capped ? 1 : fraction) * 100}%`, height: "100%", borderRadius: 6, background: colors.gold }} />
        </div>
        <div style={{ fontSize: 13, color: colors.muted }}>{t("gacha.perTicket", { n: per })}</div>
      </div>

      <div style={{ ...panel, display: "grid", gap: 8 }}>
        <div style={{ fontSize: 14 }}>
          {tx("gacha.spellToNext", { n: <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: colors.gold }}>{spell.toNext}</span>, count: spell.toNext })}
        </div>
        <div
          role="progressbar" aria-valuemin={0} aria-valuemax={spell.per} aria-valuenow={spell.per - spell.toNext}
          style={{ height: 12, borderRadius: 6, background: colors.surface2, overflow: "hidden" }}
        >
          <div style={{ width: `${spell.fraction * 100}%`, height: "100%", borderRadius: 6, background: colors.gold }} />
        </div>
        <div style={{ fontSize: 13, color: colors.muted }}>{t("gacha.spellPerTicket", { n: spell.per })}</div>
      </div>

      <GachaOdds odds={status.odds} eventPct={showEvent ? eventShare(status) : 0} />
    </div>
  );

  if (!wide) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <GachaMachine size={150} />
        {sign}
        {content}
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 40, alignItems: "start" }}>
      <div style={{ ...panel, padding: 32, position: "sticky", top: 16, display: "grid", gap: 20, justifyItems: "center" }}>
        <GachaMachine size={300} />
        {sign}
      </div>
      {content}
    </div>
  );
}
