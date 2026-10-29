// Form styles shared by the teacher screens and the join-a-class pop-up (ClassFields.jsx and friends).
import { colors, fontBody, btnGhost, btnPrimary, btnDanger } from './theme';

export const inputStyle = {
  width: "100%", boxSizing: "border-box", minHeight: 44, padding: "10px 12px",
  borderRadius: 8, border: `1px solid ${colors.line}`, background: colors.surface2,
  color: colors.text, fontFamily: fontBody, fontSize: 16,
};

// Small buttons in rows (44 px tall).
export const smallBtn = { minHeight: 44, padding: "8px 14px", fontSize: 14, whiteSpace: "nowrap" };
export const ghostSmall = { ...btnGhost, ...smallBtn };
export const primarySmall = { ...btnPrimary, ...smallBtn };
export const dangerSmall = { ...btnDanger, ...smallBtn };

// iPad helpers that would change a name or code while typing are switched off.
export const noAutoFix = { autoCorrect: "off", spellCheck: false, autoComplete: "off" };
