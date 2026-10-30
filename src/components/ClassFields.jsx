import { colors, fontDisplay, panel } from '../styles/theme';
import { inputStyle, noAutoFix } from '../styles/forms';

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
