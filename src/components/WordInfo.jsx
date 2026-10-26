import { colors, fontDisplay } from '../styles/theme';
import { dictionaryUrl } from '../lib/dictionary';
import Highlighted from './Highlighted';
import { t } from '../i18n';

// Extra info on the back of a card: an example sentence (if the word has one),
// with the word highlighted, and a dictionary link. wide: bigger text. dense: a short screen, so the
// example box has less padding and slightly smaller text (everything is still shown).
export default function WordInfo({ english, exampleEn, exampleJa, wide = false, dense = false }) {
  const url = dictionaryUrl(english);
  if (!url && !exampleEn) return null;
  return (
    <div style={{ display: "grid", gap: dense ? 2 : 6 }}>
      {exampleEn && (
        <div style={{ background: colors.surface, borderRadius: 16, padding: dense ? "8px 12px" : "12px 14px", textAlign: "left" }}>
          <div style={{ fontFamily: fontDisplay, fontSize: wide ? 14 : 12, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>{t("wordInfo.example")}</div>
          <div style={{ fontSize: wide ? (dense ? 20 : 24) : 16, lineHeight: dense ? 1.4 : 1.5, color: colors.text }}>
            <Highlighted sentence={exampleEn} english={english} />
          </div>
          {exampleJa && <div style={{ fontSize: wide ? (dense ? 16 : 18) : 13, lineHeight: dense ? 1.4 : 1.5, color: colors.muted, marginTop: 4 }}>{exampleJa}</div>}
        </div>
      )}
      {url && (
        <a
          href={url} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, fontSize: wide ? 16 : 14, color: colors.text }}
        >
          {t("wordInfo.dictionary")}
        </a>
      )}
    </div>
  );
}
