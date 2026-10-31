import { colors, fontDisplay, panel } from '../styles/theme';
import { inputStyle, noAutoFix } from '../styles/forms';
import { cleanNickname, NICKNAME_MAX } from '../lib/classes';
import { t } from '../i18n';

// Form parts shared by the teacher screens and the join-a-class pop-up.

// A labeled input. hint: a small line under it.
export function Field({ label, hint, children }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 14, fontWeight: 700, color: colors.text }}>
      {label}
      {children}
      {hint && <span style={{ fontSize: 12, fontWeight: 400, color: colors.muted }}>{hint}</span>}
    </label>
  );
}

// Red error text under a form (role="alert", so it is read aloud).
export function ErrorText({ children }) {
  if (!children) return null;
  return <div role="alert" style={{ fontSize: 14, color: colors.danger }}>{children}</div>;
}

// Real name + 出席番号, side by side (the number field is narrow).
export function StudentFields({ name, number, onName, onNumber, nameLabel, numberLabel, numberHint, namePlaceholder, autoFocus = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 150px", gap: 10, alignItems: "start" }}>
      <Field label={nameLabel}>
        <input
          type="text" value={name} onChange={(e) => onName(e.target.value)} maxLength={40}
          placeholder={namePlaceholder} autoFocus={autoFocus} {...noAutoFix} style={inputStyle}
        />
      </Field>
      <Field label={numberLabel} hint={numberHint}>
        <input
          type="text" inputMode="numeric" value={number} onChange={(e) => onNumber(e.target.value)} maxLength={2}
          {...noAutoFix} style={inputStyle}
        />
      </Field>
    </div>
  );
}

// A teacher-page panel: a title row (with an optional button on the right) and its contents.
export function Panel({ title, action, children }) {
  return (
    <section style={{ ...panel, display: "grid", gap: 12, alignContent: "start" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, color: colors.text }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// A 44 px checkbox (role="checkbox") for choosing students to give tickets to.
export function SelectBox({ checked, label, onToggle }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onToggle}
      style={{ width: 44, height: 44, flexShrink: 0, display: "grid", placeItems: "center", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24, height: 24, borderRadius: 6, boxSizing: "border-box", display: "grid", placeItems: "center",
          border: `2px solid ${checked ? colors.accent : colors.line}`, background: checked ? colors.accent : colors.surface,
          color: colors.accentInk, fontSize: 16, fontWeight: 700, lineHeight: 1,
        }}
      >
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

// Next to a 出席番号 that another student in the class also has: a small gold "!" (a hint to check,
// never the danger color). The tooltip and label say why.
export function SameNumberMark({ size = 16 }) {
  const label = t("teacher.sameNumber");
  return (
    <svg
      data-same-number="" width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label={label}
      style={{ color: colors.gold, flexShrink: 0 }}
    >
      <title>{label}</title>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 6.5v7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="1.6" fill="currentColor" />
    </svg>
  );
}

// On the roster, after the real name of every student whose 出席番号 another student also has
// (often two students typed the same number when joining): a small gold 番号重複 pill. A hint, never the danger color.
export function DuplicateNumberTag() {
  return (
    <span
      data-duplicate-number=""
      title={t("teacher.sameNumber")}
      style={{
        display: "inline-block", padding: "1px 8px", borderRadius: 999, border: `1.5px solid ${colors.gold}`,
        fontSize: 12, fontWeight: 700, lineHeight: 1.5, color: colors.gold, whiteSpace: "nowrap",
      }}
    >
      {t("teacher.duplicateNumberTag")}
    </span>
  );
}

// A class nickname (1–12 characters) with a counter and the note that classmates will see it.
// note: false hides the note (the teacher's roster form).
export function NicknameField({ value, onChange, label, hint, note = true, autoFocus = false }) {
  const n = Array.from(cleanNickname(value)).length;
  return (
    <Field label={label ?? t("nickname.label")} hint={hint ?? (note ? t("nickname.note") : null)}>
      <span style={{ position: "relative", display: "block" }}>
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={NICKNAME_MAX + 8}
          placeholder={t("nickname.placeholder")} autoFocus={autoFocus} {...noAutoFix}
          style={{ ...inputStyle, width: "100%", boxSizing: "border-box", paddingRight: 56 }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 400,
            color: n > NICKNAME_MAX ? colors.danger : colors.muted, fontVariantNumeric: "tabular-nums",
          }}
        >
          {t("nickname.count", { n })}
        </span>
      </span>
    </Field>
  );
}
