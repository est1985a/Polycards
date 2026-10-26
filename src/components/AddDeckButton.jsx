import { colors, btnGhost } from '../styles/theme';
import { t } from '../i18n';

// The add button's text. counts: from ownedCounts() in src/lib/library.js, or null (plain button).
function addLabel(counts) {
  if (!counts) return t("cardSets.add");
  if (counts.allOwned) return t("cardSets.addAllOwned");
  return t("cardSets.addCounts", { new: counts.newCount, owned: counts.ownedCount });
}

// "Add to My Deck" for a Word Packs deck, or a note that it is already added.
// counts: how many of its words are new / already owned (null when unknown or none owned).
export default function AddDeckButton({ isAdded, saving, onAdd, counts = null }) {
  if (isAdded) {
    return <div style={{ textAlign: "center", fontSize: 13, color: colors.text }}>{t("cardSets.added")}</div>;
  }
  return (
    <button onClick={onAdd} disabled={saving} style={{ ...btnGhost, padding: "8px 12px", fontSize: 13 }}>
      {saving ? t("cardSets.adding") : addLabel(counts)}
    </button>
  );
}
