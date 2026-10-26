import { useState, useEffect, useRef } from 'react';
import { colors, mix, fontDisplay, fontBody, btnPrimary } from '../styles/theme';
import { reduceMotionOn } from '../lib/settings';
import { PACK_STEPS, PACK_STEP_ORDER, reached, fanLayout, packFit, packShown, cardFontSize, closeTooSoon } from '../lib/packOpening';
import { t } from '../i18n';
import PackIcon from './PackIcon';

// Stage: the fan is centered at FAN_Y, the deck the new cards fly into sits DECK_DROP below it.
// Card size and cards per row come from packFit() (smaller on narrow screens).
const STAGE = { width: 380, height: 470 };
const FAN_Y = 175;
const DECK_DROP = 245;

// The foil pack (PackIcon): shakes, its top strip tears off, and a shine sweeps across.
function FoilPack({ phase }) {
  return (
    <div
      className={reached(phase, "fan") ? "pack-fade-out" : phase === "shake" ? "pack-shake" : undefined}
      style={{ position: "absolute", left: "calc(50% - 60px)", top: FAN_Y - 80, width: 120, height: 160 }}
      aria-hidden="true"
    >
      <PackIcon
        tint={colors.accent} emblem="diamond"
        shineClass="pack-shine" stripClass={reached(phase, "tear") ? "pack-strip-off" : undefined}
      />
    </div>
  );
}

// My Cards as a little stack of cards. bump: bounce once when the new cards land.
function DeckStack({ bump, dim }) {
  const card = (offset, border) => (
    <div style={{
      position: "absolute", left: 8 + offset, top: 8 - offset, width: 48, height: 64, borderRadius: 8, boxSizing: "border-box",
      background: colors.surface2, border: `2px solid ${border}`,
    }} />
  );
  return (
    <div className={bump ? "pack-deck-bump" : undefined} style={{ position: "relative", width: 72, height: 80, opacity: dim ? 0.5 : 1 }} aria-hidden="true">
      {card(-6, colors.line)}
      {card(-3, colors.line)}
      {card(0, colors.accent)}
    </div>
  );
}

// One card in the fan. Before `fan` it waits inside the pack; at `fly` a new card drops into
// the deck while an owned one stays behind, grayed with 所持済み.
function FanCard({ item, index, pos, phase, known, card }) {
  const sorted = reached(phase, "sort") && known;
  let transform = "translate(0px, 0px) scale(0.5) rotate(0deg)";
  let opacity = 0;
  let delay = index * 35;
  if (reached(phase, "fly") && !item.owned) {
    transform = `translate(0px, ${DECK_DROP}px) scale(0.3) rotate(0deg)`;
    delay = index * 40;
  } else if (reached(phase, "fan")) {
    transform = `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotate}deg)`;
    opacity = sorted && item.owned ? 0.45 : 1;
  }
  const glow = reached(phase, "sort") && !item.owned;
  return (
    <div
      className="pack-card"
      style={{
        position: "absolute", left: `calc(50% - ${card.width / 2}px)`, top: FAN_Y - card.height / 2,
        width: card.width, height: card.height, boxSizing: "border-box", borderRadius: 8, padding: 4,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
        background: sorted && item.owned ? colors.surface2 : colors.surface,
        border: `2px solid ${glow ? colors.accent : colors.line}`,
        boxShadow: glow ? `0 0 14px ${mix(colors.accent, "transparent", 70)}` : "none",
        filter: sorted && item.owned ? "grayscale(1)" : "none",
        transform, opacity, transitionDelay: `${delay}ms`,
      }}
    >
      {/* Breaks only between words; a long word gets smaller text instead (cardFontSize). */}
      <span lang="en" style={{
        fontSize: cardFontSize(item.en, card.width - 12), fontWeight: 700, lineHeight: 1.15, textAlign: "center",
        overflowWrap: "normal", wordBreak: "normal", hyphens: "manual", color: colors.text,
      }}>
        {item.en}
      </span>
      {sorted && item.owned && (
        <span style={{ fontSize: 9, fontWeight: 700, color: colors.muted, background: colors.bg, borderRadius: 999, padding: "1px 5px", whiteSpace: "nowrap" }}>
          {t("pack.owned")}
        </span>
      )}
    </div>
  );
}

// The result after the animation (also shown straight away with reduce motion).
// summary: from packSummary() in src/lib/packOpening.js.
export function PackSummaryPanel({ summary, onClose, closeRef }) {
  const { newCount, ownedCount, known, allOwned, items } = summary;
  const owned = items.filter((w) => w.owned);
  // Ignore taps on OK for a moment, so the second tap of a double tap (skip) can't close it.
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);
  const close = () => { if (!closeTooSoon(shownAt.current)) onClose(); };
  return (
    <div
      className="gacha-reveal-in"
      style={{
        width: "100%", maxWidth: 400, boxSizing: "border-box", textAlign: "center",
        background: colors.surface, border: `2px solid ${allOwned ? colors.line : colors.accent}`, borderRadius: 24, padding: 24,
        display: "grid", gap: 14, justifyItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <DeckStack dim={allOwned} />
        {known && !allOwned && (
          <span data-testid="pack-new-count" style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 44, color: colors.gold }}>+{newCount}</span>
        )}
      </div>

      {!known && <div style={{ fontSize: 17, fontWeight: 700 }}>{t("pack.addedPlain")}</div>}

      {allOwned && (
        <>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{t("pack.allOwned")}</div>
          <div style={{ fontSize: 14, color: colors.muted }}>{t("pack.allOwnedNote")}</div>
        </>
      )}

      {known && !allOwned && (
        <div style={{ fontSize: 17, fontWeight: 700 }}>{t("pack.addedLine", { n: newCount, count: newCount })}</div>
      )}

      {known && !allOwned && ownedCount > 0 && (
        <div style={{ display: "grid", gap: 8, width: "100%" }}>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: colors.muted }}>{t("pack.ownedLine", { n: ownedCount, count: ownedCount })}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted }}>{t("pack.ownedList")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, maxHeight: 132, overflowY: "auto" }}>
            {owned.map((w) => (
              <span key={w.id} lang="en" style={{
                fontSize: 13, color: colors.muted, background: colors.surface2, border: `1px solid ${colors.line}`,
                borderRadius: 999, padding: "3px 10px",
              }}>{w.en}</span>
            ))}
          </div>
        </div>
      )}

      <button ref={closeRef} onClick={close} style={{ ...btnPrimary, minWidth: 140, minHeight: 44, borderRadius: 999 }}>
        {t("pack.close")}
      </button>
    </div>
  );
}

// Full-screen pack opening after Add to My Cards: the pack shakes and tears open, the deck's
// cards fan out, owned ones turn gray (所持済み), new ones fly into the deck, then the summary.
// About 2.7 s; tap to skip. Reduce motion goes straight to the summary.
export default function PackOpening({ summary, onClose }) {
  const [skipAnimation] = useState(() => reduceMotionOn());
  const [fit] = useState(() => packFit(typeof window !== "undefined" ? window.innerWidth : 1024));
  const [phase, setPhase] = useState(skipAnimation ? "done" : "shake");
  const closeRef = useRef(null);
  const done = phase === "done";

  useEffect(() => {
    if (skipAnimation) return undefined;
    const timers = PACK_STEP_ORDER.slice(1).map((step) =>
      setTimeout(() => setPhase((p) => (reached(p, step) ? p : step)), PACK_STEPS[step]));
    return () => timers.forEach(clearTimeout);
  }, [skipAnimation]);

  useEffect(() => {
    if (!done) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, onClose]);

  const { shown, hiddenCount } = packShown(summary.items, fit.shownMax);
  const fan = fanLayout(shown.length, fit);
  const landing = reached(phase, "fly") && summary.newCount > 0;

  return (
    <div
      role="dialog" aria-modal="true" aria-label={t("pack.dialog")}
      onClick={done ? undefined : () => setPhase("done")}
      style={{
        position: "fixed", inset: 0, zIndex: 40, overflowY: "auto",
        background: `color-mix(in srgb, ${colors.bg} 94%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box",
        fontFamily: fontBody, color: colors.text,
      }}
    >
      {done ? (
        <PackSummaryPanel summary={summary} onClose={onClose} closeRef={closeRef} />
      ) : (
        <div style={{ width: "100%", display: "grid", justifyItems: "center", gap: 12, cursor: "pointer" }}>
          {/* Full width up to STAGE.width, so the fan stays centered on narrow phones. */}
          <div style={{ position: "relative", width: "100%", maxWidth: STAGE.width, height: STAGE.height }}>
            <FoilPack phase={phase} />
            {shown.map((item, i) => (
              <FanCard key={item.id} item={item} index={i} pos={fan[i]} phase={phase} known={summary.known} card={fit.card} />
            ))}
            {hiddenCount > 0 && reached(phase, "sort") && (
              <div style={{ position: "absolute", left: 0, right: 0, top: FAN_Y + 130, textAlign: "center", fontSize: 13, color: colors.muted }}>
                {t("pack.more", { n: hiddenCount, count: hiddenCount })}
              </div>
            )}
            {reached(phase, "fan") && (
              <div style={{ position: "absolute", left: "calc(50% - 36px)", top: FAN_Y + DECK_DROP - 40, display: "grid", justifyItems: "center" }}>
                {landing && (
                  <span className="pack-plus-float" style={{ position: "absolute", top: -26, fontFamily: fontDisplay, fontWeight: 700, fontSize: 22, color: colors.gold }}>
                    +{summary.newCount}
                  </span>
                )}
                <DeckStack bump={landing} />
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, whiteSpace: "nowrap" }}>{t("pack.deckLabel")}</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, color: colors.muted }}>{t("pack.tapToSkip")}</div>
        </div>
      )}
    </div>
  );
}
