import { colors, btnPrimary } from '../styles/theme';

// One school level of the library: textbooks → units → deck buttons.
export default function LibrarySection({ title, textbooks, onOpenDeck, disabled }) {
  if (textbooks.length === 0) return null;
  return (
    <div>
      <h2 style={{ fontSize: 18, color: colors.navy, borderBottom: `2px solid ${colors.lineDark}`, paddingBottom: 6 }}>{title}</h2>
      {textbooks.map((tb) => (
        <div key={tb.id} style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 15, margin: "0 0 8px", color: colors.text }}>📖 {tb.name}</h3>
          {tb.units?.map((unit) => (
            <div key={unit.id} style={{ marginLeft: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: colors.textSoft, marginBottom: 6 }}>{unit.name}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {unit.decks?.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => onOpenDeck(deck)}
                    disabled={disabled}
                    style={{ ...btnPrimary, background: colors.blue, fontSize: 13, padding: "8px 12px" }}
                  >
                    {deck.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
