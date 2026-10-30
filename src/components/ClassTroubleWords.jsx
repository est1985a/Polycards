import { useState } from 'react';
import { colors, fontDisplay } from '../styles/theme';
import { ghostSmall } from '../styles/forms';
import { troubleListText } from '../lib/classOverview';
import { toggleId } from '../lib/library';
import { Panel } from './ClassFields';
import PosChip from './PosChip';
import { t } from '../i18n';

// One word: tapping it shows who missed it (出席番号, real name, ×misses).
function TroubleWordRow({ word, open, onToggle }) {
  const listId = `trouble-${word.word_id}`;
  return (
    <li style={{ display: "grid", gap: 6, padding: "6px 12px", borderRadius: 12, background: colors.surface2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={listId}
          style={{
            flex: "1 1 160px", minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", gap: 8, padding: 0,
            border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: colors.text,
          }}
        >
          <span aria-hidden="true" style={{ width: 12, fontSize: 12, color: colors.muted }}>{open ? "▼" : "▶"}</span>
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <span lang="en" style={{ display: "block", fontSize: 17, fontWeight: 700 }}>{word.english}</span>
            <span style={{ display: "block", fontSize: 14, color: colors.muted }}>{word.japanese}</span>
          </span>
        </button>
        <PosChip pos={word.pos} />
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, marginLeft: "auto", whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: colors.gold }}>
            {t("classTrouble.students", { n: word.student_count, count: word.student_count })}
          </span>
          <span style={{ fontSize: 13, color: colors.muted }}>{t("classTrouble.misses", { n: word.misses, count: word.misses })}</span>
        </span>
      </div>
      {open && (
        <ul id={listId} style={{ listStyle: "none", margin: 0, padding: "0 0 6px 20px", display: "grid", gap: 4 }}>
          {(word.students || []).map((s) => (
            <li key={s.student_id} style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 15, color: colors.text }}>
              <span style={{ width: 24, textAlign: "right", fontFamily: fontDisplay, fontWeight: 700, color: colors.gold }}>{s.student_number ?? "–"}</span>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{s.real_name}</span>
              <span style={{ fontFamily: fontDisplay, fontWeight: 700, color: colors.muted }}>{t("classTrouble.missCount", { n: s.misses })}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// よく間違えた単語: the class's most-missed words in the period (class_trouble_words()), with コピー
// (one "english – japanese" line per word). words: null while loading.
export default function ClassTroubleWords({ words, days, initialOpen = [] }) {
  const [open, setOpen] = useState(() => new Set(initialOpen));
  const [copyNote, setCopyNote] = useState(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(troubleListText(words));
      setCopyNote(t("teacher.copied"));
    } catch {
      setCopyNote(t("teacher.copyFailed"));
    }
  }

  const action = words?.length > 0 && <button onClick={copy} style={ghostSmall}>{t("classTrouble.copy")}</button>;
  return (
    <Panel title={t("classTrouble.title", { n: days })} action={action}>
      <div role="status" style={{ fontSize: 13, color: colors.muted, minHeight: copyNote ? 18 : 0 }}>{copyNote}</div>
      {words === null ? (
        <div style={{ fontSize: 14, color: colors.muted }}>{t("common.loading")}</div>
      ) : words.length === 0 ? (
        <div style={{ fontSize: 14, color: colors.muted }}>{t("classTrouble.empty")}</div>
      ) : (
        <ul data-class-trouble="" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {words.map((w) => (
            <TroubleWordRow key={w.word_id} word={w} open={open.has(w.word_id)} onToggle={() => setOpen((old) => toggleId(old, w.word_id))} />
          ))}
        </ul>
      )}
      <div style={{ fontSize: 12, color: colors.muted }}>{t("classTrouble.note")}</div>
    </Panel>
  );
}
