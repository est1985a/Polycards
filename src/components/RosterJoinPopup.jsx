import { useEffect, useRef } from 'react';
import { colors, fontDisplay, fontBody, btnPrimary } from '../styles/theme';
import { rosterJoinClass } from '../lib/rosterJoin';
import { NicknameForm } from './NicknameSheet';
import { t } from '../i18n';

// The card (tests render it as plain markup). state: from rosterJoinStart() / rosterJoinNext().
// onNext(): 次へ on the 「…に入りました！」 step. onSaveNickname(classId, nickname): saves it (a
// failure such as nickname_taken shows in the form) and moves on.
export function RosterJoinCard({ state, onNext, onSaveNickname, firstRef = null }) {
  const cls = rosterJoinClass(state);
  if (!cls) return null;
  return (
    <div
      key={`${cls.id}|${state.step}`}
      className="gacha-reveal-in"
      style={{
        width: "100%", maxWidth: 400, boxSizing: "border-box", textAlign: "center",
        background: colors.surface, border: `2px solid ${colors.accent}`, borderRadius: 24, padding: 24,
        boxShadow: `0 0 36px color-mix(in srgb, ${colors.accent} 40%, transparent)`, display: "grid", gap: 16,
      }}
    >
      {state.step === "joined" ? (
        <>
          <div aria-hidden="true" style={{ fontSize: 56, lineHeight: 1 }}>🏫</div>
          <h2 style={{ margin: 0, fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, color: colors.text, overflowWrap: "anywhere" }}>
            {t("rosterJoin.title", { name: cls.name })}
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: colors.muted }}>{t("rosterJoin.text")}</p>
          <button ref={firstRef} onClick={onNext} style={{ ...btnPrimary, minHeight: 48, fontSize: 17, fontWeight: 700, borderRadius: 14 }}>
            {t("rosterJoin.next")}
          </button>
        </>
      ) : (
        <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
          <h2 style={{ margin: 0, fontFamily: fontDisplay, fontWeight: 700, fontSize: 22, color: colors.text, textAlign: "center" }}>
            {t("rosterJoin.nicknameTitle")}
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: colors.muted }}>{t("rosterJoin.nicknameText", { name: cls.name })}</p>
          {/* No キャンセル: the nickname step can't be skipped (the クラス tab's prompt is only a fallback). */}
          <NicknameForm key={cls.id} autoFocus saveLabel={t("rosterJoin.save")} onSave={(nickname) => onSaveNickname(cls.id, nickname)} />
        </div>
      )}
    </div>
  );
}

// After sign-in, when a teacher's pre-filled roster put the student in one or more classes
// (claim_my_roster()): for each class, 「{name}に入りました！」 then the nickname. A full-screen
// pop-up like the award pop-up, with no × and no Escape, so the nickname is always chosen.
export default function RosterJoinPopup({ state, onNext, onSaveNickname }) {
  const firstRef = useRef(null);
  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
  }, [state?.index, state?.step]);

  return (
    <div
      role="dialog" aria-modal="true" aria-label={t("rosterJoin.label")}
      style={{
        position: "fixed", inset: 0, zIndex: 40, overflowY: "auto",
        background: `color-mix(in srgb, ${colors.bg} 94%, transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box",
        fontFamily: fontBody, color: colors.text,
      }}
    >
      <RosterJoinCard state={state} onNext={onNext} onSaveNickname={onSaveNickname} firstRef={firstRef} />
    </div>
  );
}
