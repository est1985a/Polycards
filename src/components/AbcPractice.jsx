import { useEffect } from 'react';
import { colors, fontBody, fontDisplay } from '../styles/theme';
import { alphabet, stepLetter, trainingParent } from '../lib/training';
import LetterPractice from '../handwriting/LetterPractice.jsx';
import LetterGlyph from '../handwriting/LetterGlyph.jsx';
import { loadModel } from '../handwriting/model.js';
import { HW_COLORS } from '../handwriting/config.js';
import { t, tx } from '../i18n';

// "← back" (same look as the Card Sets back button). label: the screen it goes back to.
function BackButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        justifySelf: "start", minHeight: 44, padding: "0 16px 0 12px", borderRadius: 999,
        background: colors.surface2, border: `2px solid ${colors.line}`, color: colors.text,
        fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, cursor: "pointer",
      }}
    >
      {t("cardSets.back", { label })}
    </button>
  );
}

// 大文字 (A–Z) | 小文字 (a–z), the same look as LevelSwitch.
function CaseSwitch({ lowercase, onChange }) {
  return (
    <div role="group" aria-label={t("practice.caseSwitch")} style={{
      display: "flex", gap: 4, padding: 4, borderRadius: 999, background: colors.surface, border: `2px solid ${colors.line}`,
    }}>
      {[false, true].map((lower) => {
        const selected = lower === lowercase;
        return (
          <button
            key={String(lower)} type="button" aria-pressed={selected} onClick={() => onChange(lower)}
            style={{
              flex: 1, minHeight: 44, padding: "0 8px", borderRadius: 999, border: "none", cursor: "pointer",
              background: selected ? colors.accent : "transparent", color: selected ? colors.accentInk : colors.muted,
              fontFamily: fontBody, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap",
            }}
          >
            {t(lower ? "training.abc.small" : "training.abc.capitals")}
          </button>
        );
      })}
    </div>
  );
}

// One letter on the grid, drawn from its stroke data; a green ✓ once completed this visit.
function LetterTile({ letter, done, onClick }) {
  return (
    <button
      type="button" onClick={onClick}
      aria-label={done ? t("training.abc.doneAria", { letter }) : letter}
      style={{
        position: "relative", minHeight: 88, padding: "6px 0", borderRadius: 14, cursor: "pointer",
        display: "grid", placeItems: "center", background: colors.surface,
        border: `2px solid ${done ? HW_COLORS.pass : colors.line}`,
      }}
    >
      <LetterGlyph letter={letter} width={48} height={70} />
      {done && (
        <span aria-hidden="true" style={{
          position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 999,
          display: "grid", placeItems: "center", background: HW_COLORS.pass, color: HW_COLORS.passInk, fontSize: 12, fontWeight: 700,
        }}>✓</span>
      )}
    </button>
  );
}

// ABCを書こう: the A–Z / a–z grid (path.screen "abc") and one letter's practice page ("letter").
// path: the Training tab's trainingPath (lib/training.js); onNavigate(path) moves between screens.
// done: letters completed this visit (case-sensitive, a Set); onComplete(letter): all 4 boxes green.
// Practice saves nothing.
export default function AbcPractice({ path, onNavigate, done, onComplete }) {
  // Load the letter model in the background, so the first letter can be checked straight away.
  useEffect(() => { loadModel().catch(() => {}); }, []);

  if (path.screen === "letter" && path.letter) {
    const { letter } = path;
    const prev = stepLetter(letter, -1);
    const next = stepLetter(letter, 1);
    const go = (l) => onNavigate({ ...path, letter: l, lowercase: l === l.toLowerCase() });
    const arrow = (target, dir) => (
      <button
        type="button" disabled={!target} onClick={() => go(target)}
        aria-label={t(dir < 0 ? "training.prev" : "training.next")}
        style={{
          minWidth: 64, minHeight: 44, padding: "0 12px", borderRadius: 999, cursor: target ? "pointer" : "default",
          background: colors.surface2, border: `2px solid ${colors.line}`, color: colors.text, opacity: target ? 1 : 0.4,
          fontFamily: fontDisplay, fontWeight: 700, fontSize: 18,
        }}
      >
        {dir < 0 ? `‹ ${target ?? ""}` : `${target ?? ""} ›`}
      </button>
    );
    return (
      <div style={{ display: "grid", gap: 14, paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <BackButton label={t("training.abc.title")} onClick={() => onNavigate(trainingParent(path))} />
          <div lang="en" style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {arrow(prev, -1)}
            {arrow(next, 1)}
          </div>
        </div>
        <div style={{ background: colors.surface, border: `2px solid ${colors.line}`, borderRadius: 20, padding: 16 }}>
          <LetterPractice
            key={letter}
            letter={letter}
            titleId="training-letter-title"
            onClose={() => onNavigate(trainingParent(path))}
            onComplete={onComplete}
            onLetterChange={go}
            onNext={next ? () => go(next) : undefined}
          />
        </div>
      </div>
    );
  }

  const letters = alphabet(path.lowercase);
  const doneCount = letters.filter((l) => done.has(l)).length;
  return (
    <div style={{ display: "grid", gap: 14, paddingTop: 8 }}>
      <BackButton label={t("training.title")} onClick={() => onNavigate(trainingParent(path))} />
      <div>
        <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, margin: 0, color: colors.text }}>{t("training.abc.title")}</h2>
        <div style={{ fontSize: 13, color: colors.muted }}>{t("training.abc.pencil")}</div>
      </div>
      <CaseSwitch lowercase={path.lowercase} onChange={(lowercase) => onNavigate({ ...path, lowercase })} />
      <div style={{ fontSize: 14, color: colors.muted, textAlign: "right" }}>
        {tx("training.abc.doneCount", {
          n: <span style={{ fontFamily: fontDisplay, fontWeight: 700, color: colors.gold }}>{doneCount}</span>,
          count: doneCount,
        })}
      </div>
      <div lang="en" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))" }}>
        {letters.map((l) => (
          <LetterTile key={l} letter={l} done={done.has(l)} onClick={() => onNavigate({ ...path, screen: "letter", letter: l })} />
        ))}
      </div>
    </div>
  );
}
