import { colors } from '../styles/theme';
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
