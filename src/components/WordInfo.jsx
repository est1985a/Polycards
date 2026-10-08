import { colors } from '../styles/theme';
import { dictionaryUrl } from '../lib/dictionary';

// Extra info shown after a card is answered: an example sentence (if the word has one)
// and a dictionary link.
export default function WordInfo({ english, exampleEn, exampleJa }) {
  const url = dictionaryUrl(english);
  if (!url && !exampleEn) return null;
  return (
    <div style={{ display: "grid", gap: 10, textAlign: "center" }}>
      {exampleEn && (
        <div>
          <div style={{ fontSize: 16, lineHeight: 1.5, color: colors.text }}>{exampleEn}</div>
          {exampleJa && <div style={{ fontSize: 13, lineHeight: 1.5, color: colors.muted, marginTop: 4 }}>{exampleJa}</div>}
        </div>
      )}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: colors.navy }}>
          辞書で調べる
        </a>
      )}
    </div>
  );
}
