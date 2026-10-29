import { colors, btnGhost, btnPrimary } from '../styles/theme';
import { t } from '../i18n';

// The add button's text. counts: from ownedCounts() in src/lib/library.js, or null (plain button).
function addLabel(counts) {
  if (!counts) return t("cardSets.add");
  if (counts.allOwned) return t("cardSets.addAllOwned");
  return t("cardSets.addCounts", { new: counts.newCount, owned: counts.ownedCount });
}

const bigButton = { ...btnPrimary, width: "100%", minHeight: 56, fontSize: 17, fontWeight: 700 };

// "Add to My Deck" for a Word Packs deck, or a note that it is already added.
// counts: how many of its words are new / already owned (null when unknown or none owned).
// primary: the big main button of the word list's bottom bar. Once added it becomes
// ✓ マイデッキに追加済み plus a マイデッキへ › button (onGoToMyDeck), never a disabled look.
// Without primary (the drill) it is the small outline button.
export default function AddDeckButton({ isAdded, saving, onAdd, counts = null, primary = false, onGoToMyDeck = null }) {
  if (primary) {
    if (isAdded) {
      return (
        <div style={{ display: "grid", gap: 6, width: "100%" }}>
          <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: colors.accentText }}>{t("cardSets.added")}</div>
          {onGoToMyDeck && <button onClick={onGoToMyDeck} style={bigButton}>{t("cardSets.goToMyDeck")}</button>}
        </div>
      );
    }
    return (
      <button onClick={onAdd} disabled={saving} style={{ ...bigButton, padding: "8px 16px", lineHeight: 1.3 }}>
        {saving ? t("cardSets.adding") : addLabel(counts)}
      </button>
    );
  }
  if (isAdded) {
    return <div style={{ textAlign: "center", fontSize: 13, color: colors.text }}>{t("cardSets.added")}</div>;
  }
  return (
    <button onClick={onAdd} disabled={saving} style={{ ...btnGhost, padding: "8px 12px", fontSize: 13 }}>
      {saving ? t("cardSets.adding") : addLabel(counts)}
    </button>
  );
}
