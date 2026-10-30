import { useState } from 'react';
import { colors, fontDisplay, panel, btnPrimary } from '../styles/theme';
import { sortMyAssignments, DONE_SHOWN } from '../lib/assignments';
import { DuePill, ProgressBar, StatusBadge } from './AssignmentParts';
import { ghostSmall } from '../styles/forms';
import { t } from '../i18n';

// One of my assignments: pack name and source, the due chip, the teacher's note, then:
//   not in My Deck (and not done): a big ＋ マイデッキに追加 (the normal add, with the pack opening)
//   in My Deck: my progress bar, N% and 復習する (this pack's due cards; disabled when none are due)
//   done: a gold 完了 badge
// Only my own progress: the student never sees classmates' progress.
function AssignmentCard({ a, now, due, busy, adding, onAdd, onReview }) {
  const { status } = a;
  const done = status.key === "done";
  const needsAdd = !done && !a.added;
  return (
    <li data-my-assignment={status.key} style={{ display: "grid", gap: 10, padding: "14px 16px", borderRadius: 16, background: colors.surface2, border: `2px solid ${needsAdd ? colors.accent : colors.line}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 180px" }}>
          {a.source && <div style={{ fontSize: 12, color: colors.muted, overflowWrap: "anywhere" }}>{a.source}</div>}
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{a.deck_name}</div>
        </div>
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {!done && <DuePill dueDate={a.due_date} now={now} relative />}
          {done && <StatusBadge status={status} />}
        </span>
      </div>
      {a.note && <div style={{ fontSize: 15, color: colors.text, overflowWrap: "anywhere" }}>{t("myAssign.note", { note: a.note })}</div>}
      {!done && status.percent > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}><ProgressBar percent={status.percent} label={t("myAssign.progressAria", { n: status.percent })} /></div>
          <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 16, color: colors.accentText, minWidth: 44, textAlign: "right" }}>
            {t("assignment.percent", { n: status.percent })}
          </span>
        </div>
      )}
      {needsAdd ? (
        <button onClick={() => onAdd(a)} disabled={busy} style={{ ...btnPrimary, minHeight: 52, width: "100%", opacity: busy ? 0.6 : 1 }}>
          {adding ? t("cardSets.adding") : t("cardSets.add")}
        </button>
      ) : !done && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => onReview(a)} disabled={due === 0 || busy} style={{ ...ghostSmall, opacity: due === 0 ? 0.6 : 1 }}>
            {due > 0 ? t("myAssign.reviewCount", { n: due, count: due }) : t("myCards.deckNothingDue")}
          </button>
        </div>
      )}
    </li>
  );
}

// 課題 in the クラス tab (the Phase 4 slot under the class header). assignments: my_class_assignments()
// rows (nothing shown while loading or when there are none). dueFor(deckId): due cards in that pack.
// busyDeckId: the pack being added. onAdd(a) / onReview(a). now: a fixed time for tests.
export default function ClassAssignmentsSection({ assignments, dueFor = () => 0, busyDeckId = null, onAdd = () => {}, onReview = () => {}, now = null }) {
  const [openedAt] = useState(() => Date.now());
  const [showAllDone, setShowAllDone] = useState(false);
  if (!assignments || assignments.length === 0) return null;
  const { open, done } = sortMyAssignments(assignments);
  const doneShown = showAllDone ? done : done.slice(0, DONE_SHOWN);
  const card = (a) => (
    <AssignmentCard
      key={a.id} a={a} now={now ?? openedAt} due={dueFor(a.deck_id)} busy={busyDeckId != null} adding={busyDeckId === a.deck_id}
      onAdd={onAdd} onReview={onReview}
    />
  );
  return (
    <section data-class-assignments="" style={{ ...panel, display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, color: colors.text }}>{t("myAssign.title")}</h3>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {open.map(card)}
        {doneShown.map(card)}
      </ul>
      {done.length > DONE_SHOWN && (
        <button onClick={() => setShowAllDone((v) => !v)} style={{ ...ghostSmall, justifySelf: "center" }}>
          {showAllDone ? t("myAssign.hideDone") : t("myAssign.showDone", { n: done.length })}
        </button>
      )}
    </section>
  );
}
