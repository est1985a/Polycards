import { useEffect, useState } from 'react';
import SheetFrame from './SheetFrame';
import PosChip from './PosChip';
import SpeakerButton from './SpeakerButton';
import WordInfo from './WordInfo';
import { colors, fontDisplay, btnPrimary } from '../styles/theme';
import { baseFormWords, sameEnglishWords, relatedWords, wordPackPaths } from '../lib/dictionary';
import { directionLabel } from '../lib/drill';
import { MASTERED } from '../lib/srs';
import * as api from '../lib/api';
import { t } from '../i18n';

const sectionTitle = { margin: "18px 0 8px", fontFamily: fontDisplay, fontSize: 14, fontWeight: 700, color: colors.muted };
const chipButton = {
  minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: 15,
  background: colors.surface2, border: `2px solid ${colors.line}`, color: colors.text,
};

// A row of word chips (base form, other meanings, related words); tapping one shows that word.
function WordChips({ title, words, onOpen }) {
  if (!words.length) return null;
  return (
    <section>
      <h3 style={sectionTitle}>{title}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {words.map((w) => (
          <button key={w.id} type="button" onClick={() => onOpen(w)} style={chipButton}>
            <span lang="en" style={{ fontFamily: fontDisplay, fontWeight: 700 }}>{w.english}</span>
            <span style={{ color: colors.muted, marginLeft: 8, fontSize: 13 }}>{w.japanese}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// What the pop-up shows; no loading or state, so tests can render it.
// details: from fetchDictionaryWord (null while loading); failed: it couldn't load.
// packs: wordPackPaths; inReview: pack links off (opening a pack would end the review) and no 外す
// (a card of this review could disappear under it).
// Adding one word (polycards-user-words.sql): ＋ マイデッキに追加 when the word isn't in My Deck; a word
// added on its own gets 辞書から追加 and 外す (asks first). Nothing when details.single is null (unknown).
// action: { busy: 'add' | 'remove' | null, error, confirming }; onAdd / onAskRemove / onRemove / onCancelRemove.
export function WordSheetBody({
  word, details = null, failed = false, packs = [], baseWords = [], otherMeanings = [], related = [],
  inReview = false, speech = null, onOpenWord, onOpenPack, onBack = null,
  action = {}, onAdd = null, onAskRemove = null, onRemove = null, onCancelRemove = null,
}) {
  const canAdd = Boolean(onAdd) && details?.single != null;
  const cards = details?.cards ?? [];
  const order = { jp2en: 0, en2jp: 1 };
  return (
    <div>
      {onBack && (
        <button type="button" onClick={onBack} style={{ ...chipButton, minHeight: 36, fontSize: 13, marginBottom: 10 }}>
          ‹ {t("dictionary.previous")}
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <PosChip pos={word.pos} fontSize={13} />
        {speech && <SpeakerButton text={word.english} audioPath={details?.word?.audio_path ?? null} slow={speech.slow} />}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 20, lineHeight: 1.5, color: colors.text }}>{word.japanese}</p>

      <div style={{ marginTop: 10, fontSize: 13, color: colors.muted }}>
        {details && (cards.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ color: colors.accentText, fontWeight: 700 }}>✓ {t("dictionary.inMyDeck")}</span>
            {details.single && <span style={{ fontSize: 12 }}>{t("dictionary.singleTag")}</span>}
            {[...cards].sort((a, b) => order[a.direction] - order[b.direction]).map((c) => (
              <span key={c.direction} lang="en" style={{ border: `1px solid ${colors.line}`, borderRadius: 999, padding: "2px 10px", color: c.level >= MASTERED ? colors.gold : colors.text }}>
                {directionLabel(c.direction)} · {c.level >= MASTERED ? "Mastered" : `Lv ${c.level}`}
              </span>
            ))}
            {canAdd && details.single && !inReview && !action.confirming && (
              <button type="button" onClick={onAskRemove} disabled={Boolean(action.busy)} style={{ ...chipButton, minHeight: 36, fontSize: 13, color: colors.muted }}>
                {t("dictionary.removeWord")}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <span>{t("dictionary.notInMyDeck")}</span>
            {canAdd && (
              <button
                type="button" onClick={onAdd} disabled={Boolean(action.busy)}
                style={{ ...btnPrimary, minHeight: 48, padding: "0 20px", fontSize: 16, justifySelf: "start", opacity: action.busy ? 0.6 : 1 }}
              >
                {action.busy === "add" ? t("dictionary.adding") : t("cardSets.add")}
              </button>
            )}
          </div>
        ))}
        {action.confirming && (
          <div role="alertdialog" aria-label={t("dictionary.removeWord")} style={{ marginTop: 10, padding: 12, borderRadius: 14, border: `2px solid ${colors.line}`, background: colors.surface2, color: colors.text, fontSize: 14 }}>
            <p style={{ margin: "0 0 10px" }}>{t("dictionary.removeWordConfirm", { english: word.english })}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={onCancelRemove} disabled={Boolean(action.busy)} style={{ ...chipButton, minHeight: 44 }}>{t("common.cancel")}</button>
              <button type="button" onClick={onRemove} disabled={Boolean(action.busy)} style={{ ...chipButton, minHeight: 44, color: colors.danger, borderColor: colors.danger }}>
                {t("dictionary.removeWord")}
              </button>
            </div>
          </div>
        )}
        {action.error && <p role="alert" style={{ margin: "8px 0 0", color: colors.danger }}>{action.error}</p>}
      </div>

      {details?.word?.example_en && (
        <div style={{ marginTop: 14 }}>
          <WordInfo english={word.english} exampleEn={details.word.example_en} exampleJa={details.word.example_ja} />
        </div>
      )}
      {failed && <p role="alert" style={{ color: colors.danger, fontSize: 14 }}>{t("dictionary.wordFailed")}</p>}
      {!details && !failed && <p style={{ color: colors.muted, fontSize: 14 }}>{t("common.loading")}</p>}

      <WordChips title={t("dictionary.baseForm")} words={baseWords} onOpen={onOpenWord} />
      <WordChips title={t("dictionary.otherMeanings")} words={otherMeanings} onOpen={onOpenWord} />
      <WordChips title={t("dictionary.related")} words={related} onOpen={onOpenWord} />

      {packs.length > 0 && (
        <section>
          <h3 style={sectionTitle}>{t("dictionary.packs")}</h3>
          {inReview && <p style={{ margin: "0 0 8px", fontSize: 13, color: colors.muted }}>{t("dictionary.packsLocked")}</p>}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {packs.map(({ deck, parts }) => {
              const path = parts.slice(0, -1).join(" › ");
              const content = (
                <>
                  <span style={{ display: "block", fontSize: 12, color: colors.muted }}>{path}</span>
                  <span style={{ display: "block", fontWeight: 700, color: colors.text }}>{deck.name}</span>
                </>
              );
              const box = { display: "block", width: "100%", boxSizing: "border-box", textAlign: "left", padding: "8px 14px", minHeight: 44, borderRadius: 14, border: `2px solid ${colors.line}`, background: colors.surface2, fontSize: 15 };
              return (
                <li key={deck.id}>
                  {inReview || !onOpenPack
                    ? <div style={{ ...box, opacity: 0.75 }}>{content}</div>
                    : <button type="button" onClick={() => onOpenPack(deck)} style={{ ...box, cursor: "pointer" }}>{content}</button>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// The word pop-up opened from the dictionary search. Tapping a related word shows it in the same
// pop-up (‹ 前の単語 goes back). The pop-up is drawn over whatever is on screen and changes nothing
// there: a review underneath keeps its pile, undo and held answer.
// index: the search index (buildDictionaryIndex); textbooks / collections: App's library (for the pack paths).
export default function WordSheet({ word, index, textbooks, collections, userId, inReview = false, speech = null, onOpenPack, onChanged = null, onClose }) {
  const [history, setHistory] = useState([word]);
  const current = history[history.length - 1];
  const [loaded, setLoaded] = useState({ id: null, details: null, failed: false });
  const [reload, setReload] = useState(0); // after adding or removing, the word loads again
  const [action, setAction] = useState({ id: null, busy: null, error: null, confirming: false });

  useEffect(() => {
    let cancelled = false;
    api.fetchDictionaryWord(current.id, userId)
      .then((details) => { if (!cancelled) setLoaded({ id: current.id, details, failed: false }); })
      .catch((e) => { console.error(e); if (!cancelled) setLoaded({ id: current.id, details: null, failed: true }); });
    return () => { cancelled = true; };
  }, [current.id, userId, reload]);

  const ready = loaded.id === current.id;
  const details = ready ? loaded.details : null;
  const bases = baseFormWords(index, current);
  // Only the shown word's add / remove state counts (another word in the history starts clean).
  const shownAction = action.id === current.id ? action : {};

  async function run(kind, call, errorKey) {
    const id = current.id;
    setAction({ id, busy: kind, error: null, confirming: kind === "remove" });
    try {
      await call();
      setAction({ id, busy: null, error: null, confirming: false });
      setReload((r) => r + 1);
      onChanged?.();
    } catch (e) {
      console.error(e);
      setAction({ id, busy: null, error: t(errorKey), confirming: false });
    }
  }

  return (
    <SheetFrame titleId="word-sheet-title" title={<span lang="en">{current.english}</span>} onClose={onClose} className="about-sheet">
      <WordSheetBody
        word={current}
        details={details}
        failed={ready && loaded.failed}
        packs={details ? wordPackPaths(details.deckIds, textbooks, collections) : []}
        baseWords={bases}
        otherMeanings={sameEnglishWords(index, current).filter((w) => !bases.some((b) => b.id === w.id))}
        related={relatedWords(index, current.id)}
        inReview={inReview}
        speech={speech}
        onOpenWord={(w) => setHistory((h) => [...h, w])}
        onOpenPack={onOpenPack}
        onBack={history.length > 1 ? () => setHistory((h) => h.slice(0, -1)) : null}
        action={shownAction}
        onAdd={userId ? () => run("add", () => api.addWordToMyCards(userId, current.id), "dictionary.addFailed") : null}
        onAskRemove={() => setAction({ id: current.id, busy: null, error: null, confirming: true })}
        onRemove={() => run("remove", () => api.removeSingleWords(userId, current.id), "dictionary.removeFailed")}
        onCancelRemove={() => setAction({ id: current.id, busy: null, error: null, confirming: false })}
      />
    </SheetFrame>
  );
}
