import { colors, fontDisplay } from '../styles/theme';
import Highlighted from './Highlighted';
import { t } from '../i18n';

// Extra info on the back of a card: the example sentence, with the word highlighted, or nothing
// when the word has no English example. wide: bigger text. dense: a short screen, so the
// example box has less padding and slightly smaller text (everything is still shown).
export default function WordInfo({ english, exampleEn, exampleJa, wide = false, dense = false }) {
  if (!exampleEn) return null;
  return (
    <div style={{ background: colors.surface, borderRadius: 16, padding: dense ? "8px 12px" : "12px 14px", textAlign: "left" }}>
      <div style={{ fontFamily: fontDisplay, fontSize: wide ? 14 : 12, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>{t("wordInfo.example")}</div>
      <div style={{ fontSize: wide ? (dense ? 20 : 24) : 16, lineHeight: dense ? 1.4 : 1.5, color: colors.text }}>
        <Highlighted sentence={exampleEn} english={english} />
      </div>
      {exampleJa && <div style={{ fontSize: wide ? (dense ? 16 : 18) : 13, lineHeight: dense ? 1.4 : 1.5, color: colors.muted, marginTop: 4 }}>{exampleJa}</div>}
    </div>
  );
}
