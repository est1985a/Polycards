import { useEffect, useRef } from 'react';
import { colors, fontDisplay, fontBody, btnPrimary, btnGhost } from '../styles/theme';
import { combineAwards } from '../lib/awards';
import { TicketIcon } from './GachaIcons';
import { t } from '../i18n';

// The card itself (tests render it as plain markup).
export function AwardCard({ awards, onGacha, onClose, firstRef = null }) {
  const { total, teachers, messages } = combineAwards(awards);
  const title = teachers.length === 1
    ? t("awardPopup.title", { name: teachers[0], n: total })
    : t("awardPopup.titleMany", { n: total });
  return (
    <div
      className="gacha-reveal-in"
      style={{
        width: "100%", maxWidth: 380, boxSizing: "border-box", textAlign: "center",
        background: colors.surface, border: `2px solid ${colors.gold}`, borderRadius: 24, padding: 24,
        boxShadow: `0 0 36px color-mix(in srgb, ${colors.gold} 45%, transparent)`, display: "grid", gap: 16,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          justifySelf: "center", width: 112, height: 112, borderRadius: "50%", display: "grid", placeItems: "center",
          background: colors.surface2, color: colors.gold,
          boxShadow: `0 0 28px color-mix(in srgb, ${colors.gold} 50%, transparent)`,
        }}
      >
        <TicketIcon size={64} />
      </div>
      <h2 style={{ margin: 0, fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, color: colors.gold, overflowWrap: "anywhere" }}>{title}</h2>
      {messages.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, textAlign: "left" }}>
          {messages.map((m) => (
            <li key={m.id} style={{ padding: "10px 14px", borderRadius: 14, background: colors.surface2, fontSize: 16, color: colors.text, overflowWrap: "anywhere" }}>
              {t("awardPopup.message", { name: m.teacher, text: m.text })}
            </li>
          ))}
        </ul>
      )}
      <button ref={firstRef} onClick={onGacha} style={{ ...btnPrimary, minHeight: 48, fontSize: 17, fontWeight: 700, borderRadius: 14 }}>{t("awardPopup.toGacha")}</button>
      <button onClick={onClose} style={{ ...btnGhost, minHeight: 44, borderRadius: 14 }}>{t("awardPopup.close")}</button>
    </div>
  );
}

// Tickets from a teacher (student side, on the My Cards dashboard): one gacha-style pop-up for every
// award not seen yet. awards: rows from my_unseen_awards(). onGacha / onClose: App marks them seen.
// Escape closes it like とじる.
export default function AwardPopup({ awards, onGacha, onClose }) {
  const firstRef = useRef(null);
  const latestClose = useRef(onClose);
  useEffect(() => { latestClose.current = onClose; });
  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') latestClose.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      role="dialog" aria-modal="true" aria-label={t("awardPopup.label")}
      style={{
        position: "fixed", inset: 0, zIndex: 40, overflowY: "auto",
        background: `color-mix(in srgb, ${colors.bg} 94%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box",
        fontFamily: fontBody, color: colors.text,
      }}
    >
      <AwardCard awards={awards} onGacha={onGacha} onClose={onClose} firstRef={firstRef} />
    </div>
  );
}
