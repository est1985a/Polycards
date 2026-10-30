import { useState } from 'react';
import { colors, fontDisplay, panel, btnPrimary } from '../styles/theme';
import { loadSchoolLevel, deckSource } from '../lib/library';
import { cleanNote, noteValid } from '../lib/assignments';
import CardSetsTab from './CardSetsTab';
import BackButton from './BackButton';
import { Field, ErrorText } from './ClassFields';
import { inputStyle, ghostSmall, noAutoFix } from '../styles/forms';
import { t, tx } from '../i18n';

// ＋ 課題を出す (teacher): 1) choose a pack by browsing the same library as Word Packs, 2) due date
// and note, then 課題を出す. Choosing a pack ONLY selects it: this page never opens the word list,
// the drill or ＋ マイデッキに追加, and never writes anything to the teacher's own My Deck.
// The only write is onCreate (create_assignment).

// Step 1 (no state of its own, so tests can check what a tap does). Packs this class already has
// get a 出題済み badge. onPick({ id, name, wordCount, source }).
export function PickStep({ className, textbooks, collections, loading, path, onNavigate, assignedDeckIds, onPick, onBack }) {
  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left", width: "100%", maxWidth: 720, margin: "0 auto" }}>
      <div><BackButton label={className} onClick={onBack} /></div>
      <div>
        <h2 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 26, fontWeight: 700, color: colors.text }}>{t("assign.pickTitle")}</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: colors.muted }}>{t("assign.pickNote")}</p>
      </div>
      <CardSetsTab
        textbooks={textbooks}
        loading={loading}
        collections={collections}
        path={path}
        onNavigate={onNavigate}
        onOpenDeck={(deck) => onPick({ id: deck.id, name: deck.name, wordCount: deck.wordCount, source: deckSource(path, textbooks, collections) })}
        myDeckIds={assignedDeckIds}
        addedLabel={t("assign.assignedBadge")}
        hubIntro={false}
        disabled={false}
      />
    </div>
  );
}

// Step 2: the chosen pack, 期限 (optional, a Japan date from the date picker) and メモ (optional, 60).
// onSubmit(dueDate | null, note | null) returns a promise; its error shows above the button.
export function AssignForm({ deck, className, initialDue = "", initialNote = "", busy = false, error = null, onSubmit, onBackToPick }) {
  const [due, setDue] = useState(initialDue);
  const [note, setNote] = useState(initialNote);
  const ok = noteValid(note);
  const length = Array.from(cleanNote(note)).length;

  function submit(e) {
    e.preventDefault();
    if (ok && !busy) onSubmit(due || null, cleanNote(note) || null);
  }

  return (
    <div style={{ display: "grid", gap: 16, textAlign: "left", width: "100%", maxWidth: 720, margin: "0 auto" }}>
      <div><BackButton label={t("assign.backToPick")} onClick={onBackToPick} /></div>
      <form onSubmit={submit} aria-label={t("assign.formTitle")} style={{ ...panel, display: "grid", gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: colors.muted }}>{className}</div>
          <h2 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 24, fontWeight: 700, color: colors.text }}>{t("assign.formTitle")}</h2>
        </div>
        <div style={{ display: "grid", gap: 2, padding: "10px 14px", borderRadius: 14, background: colors.surface2 }}>
          {deck.source && <span style={{ fontSize: 12, color: colors.muted, overflowWrap: "anywhere" }}>{deck.source}</span>}
          <span style={{ fontSize: 18, fontWeight: 700, color: colors.text, overflowWrap: "anywhere" }}>{deck.name}</span>
          {deck.wordCount != null && (
            <span style={{ fontSize: 13, color: colors.muted }}>
              {tx("cardSets.wordCount", { n: <span style={{ fontFamily: fontDisplay }}>{deck.wordCount}</span>, count: deck.wordCount })}
            </span>
          )}
        </div>
        <Field label={t("assign.dueLabel")}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
            {due && <button type="button" onClick={() => setDue("")} style={ghostSmall}>{t("assign.clearDue")}</button>}
          </div>
        </Field>
        <Field label={t("assign.noteLabel")}>
          <input
            type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("assign.notePlaceholder")}
            {...noAutoFix} style={inputStyle}
          />
          <span style={{ display: "block", textAlign: "right", fontSize: 12, color: ok ? colors.muted : colors.danger }}>
            {t("assign.noteCount", { n: length })}
          </span>
        </Field>
        {!ok && <ErrorText>{t("errors.noteTooLong")}</ErrorText>}
        <div style={{ fontSize: 13, color: colors.muted }}>{t("assign.studentsNote")}</div>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={!ok || busy} style={{ ...btnPrimary, minHeight: 52, opacity: !ok || busy ? 0.6 : 1 }}>
          {busy ? t("teacher.saving") : t("assign.submit")}
        </button>
      </form>
    </div>
  );
}

// The whole page (teacherPath.screen = 'assignNew'). library / collections / libraryLoading: the
// Word Packs data App already loaded. assignedDeckIds: this class's assigned packs.
// onCreate(deckId, dueDate, note): saves (create_assignment); onDone(): back to the 課題 view.
export default function AssignPackPage({
  className, library, collections, libraryLoading = false, assignedDeckIds = [], onBack, onCreate, onDone,
}) {
  // Starts at the Word Packs hub with the level last chosen on this device (not saved from here).
  const [path, setPath] = useState(() => ({ screen: "hub", level: loadSchoolLevel(typeof window === "undefined" ? null : window.localStorage) }));
  const [deck, setDeck] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const navigate = (next) => { setPath(next); window.scrollTo(0, 0); };

  if (!deck) {
    return (
      <PickStep
        className={className} textbooks={library} collections={collections} loading={libraryLoading}
        path={path} onNavigate={navigate} assignedDeckIds={assignedDeckIds}
        onPick={(d) => { setError(null); setDeck(d); window.scrollTo(0, 0); }}
        onBack={onBack}
      />
    );
  }
  return (
    <AssignForm
      key={deck.id}
      deck={deck} className={className} busy={busy} error={error}
      onBackToPick={() => { setDeck(null); setError(null); }}
      onSubmit={async (dueDate, note) => {
        setBusy(true); setError(null);
        try {
          await onCreate(deck.id, dueDate, note);
          setBusy(false);
          onDone();
        } catch (e) {
          setError(e.message);
          setBusy(false);
        }
      }}
    />
  );
}
