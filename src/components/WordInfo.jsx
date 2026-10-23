import { colors, fontDisplay } from '../styles/theme';
import { dictionaryUrl } from '../lib/dictionary';
import Highlighted from './Highlighted';
import { t } from '../i18n';

// Extra info on the back of a card: an example sentence (if the word has one),
// with the word highlighted, and a dictionary link. wide: bigger text.
export default function WordInfo({ english, exampleEn, exampleJa, wide = false }) {
  const url = dictionaryUrl(english);
  if (!url && !exampleEn) return null;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {exampleEn && (
        <div style={{ background: colors.surface, borderRadius: 16, padding: "12px 14px", textAlign: "left" }}>
          <div style={{ fontFamily: fontDisplay, fontSize: wide ? 14 : 12, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>{t("wordInfo.example")}</div>
          <div style={{ fontSize: wide ? 24 : 16, lineHeight: 1.5, color: colors.text }}>
            <Highlighted sentence={exampleEn} english={english} />
          </div>
          {exampleJa && <div style={{ fontSize: wide ? 18 : 13, lineHeight: 1.5, color: colors.muted, marginTop: 4 }}>{exampleJa}</div>}
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
