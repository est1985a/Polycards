import { colors } from '../styles/theme';
import { dictionaryUrl } from '../lib/dictionary';

// Extra info shown after a card is answered. Only a dictionary link for now;
// an example sentence can be added above the link later.
export default function WordInfo({ english }) {
  const url = dictionaryUrl(english);
  if (!url) return null;
  return (
    <div style={{ textAlign: "center", fontSize: 13 }}>
      {/* Example sentence goes here later. */}
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: colors.navy }}>
        辞書で調べる
      </a>
    </div>
  );
}
