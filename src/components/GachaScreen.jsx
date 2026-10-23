import { colors, fontDisplay, panel, btnLink } from '../styles/theme';
import { RARITY_ORDER, rarityInfo, ticketProgress } from '../lib/gacha';
import GachaMachine from './GachaMachine';
import { TicketIcon } from './GachaIcons';
import { t, tx } from '../i18n';

// 出る確率: one box per rarity with today's chance (from gacha_status; it changes as the
// collection fills up). A rarity at 0% is dimmed.
export function GachaOdds({ odds = {} }) {
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
      </div>
      <div style={{ fontSize: 13, color: colors.muted }}>{t("gacha.noRepeats")}</div>
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

      <GachaOdds odds={status.odds} />
    </div>
  );

  if (!wide) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <GachaMachine size={150} />
        {content}
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 40, alignItems: "start" }}>
      <div style={{ ...panel, padding: 32, position: "sticky", top: 16 }}>
        <GachaMachine size={300} />
      </div>
      {content}
    </div>
  );
}
