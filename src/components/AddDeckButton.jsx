import { colors, btnGhost } from '../styles/theme';
import { t } from '../i18n';

// "Add to My Cards" for a Card Sets deck, or a note that it is already added.
export default function AddDeckButton({ isAdded, saving, onAdd }) {
  if (isAdded) {
    return <div style={{ textAlign: "center", fontSize: 13, color: colors.text }}>{t("cardSets.added")}</div>;
  }
  return (
    <button onClick={onAdd} disabled={saving} style={{ ...btnGhost, padding: "8px 12px", fontSize: 13 }}>
      {saving ? t("cardSets.adding") : t("cardSets.add")}
    </button>
  );
}
