import { useEffect, useRef } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { groupReviewPlan } from '../lib/schedule';
import { shouldCloseSheet } from '../lib/sheet';

// One section (今日 or 明日): its total, then one row per hour that has cards.
function PlanSection({ title, section, emptyText }) {
  return (
    <section style={{ display: "grid", gap: 6 }}>
      <h3 style={{ margin: 0, display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 17, color: colors.text }}>
        <span>{title}</span>
        {section.total > 0 && (
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.muted }}>
            合計 <span style={{ fontFamily: fontDisplay, color: colors.gold }}>{section.total.toLocaleString('en-US')}</span>枚
          </span>
        )}
      </h3>
      {section.hours.length === 0 ? (
        <p style={{ fontSize: 14, color: colors.muted, padding: "6px 0" }}>{emptyText}</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {section.hours.map((h) => (
            <li key={h.label} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "8px 0", borderTop: `1px solid ${colors.line}` }}>
              <span style={{ flex: 1, fontFamily: fontDisplay, fontSize: 16 }}>{h.label}</span>
              <span style={{ fontSize: 15 }}>
                +<span style={{ fontFamily: fontDisplay, fontWeight: 700, color: colors.gold }}>{h.count.toLocaleString('en-US')}</span>枚
              </span>
              <span style={{ minWidth: 64, textAlign: "right", fontSize: 13, color: colors.muted }}>
                計<span style={{ fontFamily: fontDisplay }}>{h.runningTotal.toLocaleString('en-US')}</span>枚
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Review plan pop-up: cards due later today and tomorrow (Japan time), by hour.
// A bottom sheet on phones, a centered box on wider screens (layout in src/index.css).
// rows: from fetchReviewPlanRows(), or null while loading.
export default function ReviewPlanSheet({ rows, now, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (shouldCloseSheet(e)) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const plan = rows ? groupReviewPlan(rows, now) : null;

  return (
    <div
      className="review-plan-backdrop"
      onClick={(e) => { if (shouldCloseSheet(e)) onClose(); }}
      style={{ background: `color-mix(in srgb, ${colors.bg} 75%, transparent)` }}
    >
      <div
        className="review-plan-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-plan-title"
        style={{ background: colors.surface, border: `2px solid ${colors.line}`, color: colors.text, textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 id="review-plan-title" style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>復習の予定</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="閉じる (Close)"
            style={{ width: 44, height: 44, marginRight: -10, background: "transparent", border: "none", color: colors.muted, fontSize: 26, lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
        {plan ? (
          <div style={{ display: "grid", gap: 20 }}>
            <PlanSection title="今日" section={plan.today} emptyText="今日はもう復習はありません" />
            <PlanSection title="明日" section={plan.tomorrow} emptyText="明日の復習はありません" />
          </div>
        ) : (
          <p style={{ fontSize: 14, color: colors.muted, padding: "12px 0" }}>読み込み中…</p>
        )}
      </div>
    </div>
  );
}
