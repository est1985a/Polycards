import { useState } from 'react';
import SheetFrame from './SheetFrame';
import { colors } from '../styles/theme';
import { COUNTABLE_KEYS } from '../lib/dictionary';
import { t } from '../i18n';

// Same look as the 品詞 chip, so the two sit together in the word pop-up.
const tapArea = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxSizing: "border-box",
  minWidth: 44, minHeight: 44, padding: "0 4px", margin: "-11px -4px", lineHeight: 1,
  background: "transparent", border: "none", borderRadius: 999, cursor: "pointer",
};

// The explanation of all four kinds, the tapped one highlighted. No state, so tests can render it.
export function CountableList({ highlight }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
      {COUNTABLE_KEYS.map((key) => (
        <li
          key={key}
          aria-current={key === highlight ? "true" : undefined}
          style={{ padding: "10px 14px", borderRadius: 14, background: colors.surface2, border: `2px solid ${key === highlight ? colors.accent : colors.line}` }}
        >
          <div style={{ fontWeight: 700, color: colors.text }}>{t(`countable.label.${key}`)}</div>
          <div style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>{t(`countable.desc.${key}`)}</div>
          <div lang="en" style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{t(`countable.example.${key}`)}</div>
        </li>
      ))}
    </ul>
  );
}

// 数えられる / 数えられない / … chip for a noun (words.countable); nothing when it is null. Tapping it
// opens a small pop-up that explains the four kinds (on top of the word pop-up; Escape closes only it).
export default function CountableChip({ countable, fontSize = 13 }) {
  const [open, setOpen] = useState(false);
  if (!COUNTABLE_KEYS.includes(countable)) return null;
  const label = t(`countable.label.${countable}`);
  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-label={t("countable.chipAria", { label })} onClick={() => setOpen(true)} style={tapArea}>
        <span
          style={{
            fontSize, fontWeight: 700, lineHeight: 1.4, whiteSpace: "nowrap", padding: "1px 9px", borderRadius: 999,
            color: colors.muted, background: colors.surface2, border: `1px solid ${colors.line}`,
          }}
        >
          {label}
        </span>
      </button>
      {open && (
        <SheetFrame titleId="countable-title" title={t("countable.title")} onClose={() => setOpen(false)} className="about-sheet">
          <CountableList highlight={countable} />
        </SheetFrame>
      )}
    </>
  );
}
