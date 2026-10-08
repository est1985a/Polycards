import { colors, btnGhost } from '../styles/theme';

// "Add to My Cards" for a Card Sets deck, or a note that it is already added.
export default function AddDeckButton({ isAdded, saving, onAdd }) {
  if (isAdded) {
    return <div style={{ textAlign: "center", fontSize: 13, color: colors.text }}>✓ マイカードに追加済み (Added to My Cards)</div>;
  }
  return (
    <button onClick={onAdd} disabled={saving} style={{ ...btnGhost, padding: "8px 12px", fontSize: 13 }}>
      {saving ? "追加中..." : "＋ マイカードに追加 (Add to My Cards)"}
    </button>
  );
}
