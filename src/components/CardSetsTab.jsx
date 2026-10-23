import { colors, fontDisplay, panel } from '../styles/theme';
import {
  parentPath, resolvePath, schoolLabel, levelOptions, pickLevel, textbooksForLevel, isDeckAdded,
  findCollection, collectionParentPath,
} from '../lib/library';
import CardSetsHub from './CardSetsHub';
import NavRow from './NavRow';
import LevelSwitch from './LevelSwitch';
import { t, tx } from '../i18n';

// "← back" button above every Card Sets list. label: the name of the screen it goes back to.
function BackButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        alignSelf: "start", justifySelf: "start", minHeight: 44, padding: "0 16px 0 12px", borderRadius: 999,
        background: colors.surface2, border: `2px solid ${colors.line}`, color: colors.text,
        fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, cursor: "pointer", maxWidth: "100%",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}
    >
      {t("cardSets.back", { label })}
    </button>
  );
}

// Title of a list screen, with an optional small line above it (e.g. the textbook name).
function ScreenTitle({ kicker, title }) {
  return (
    <div>
      {kicker && <div style={{ fontSize: 13, color: colors.muted }}>{kicker}</div>}
      <h2 style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, margin: 0, color: colors.text, overflowWrap: "anywhere" }}>{title}</h2>
    </div>
  );
}

function EmptyPanel({ children }) {
  return <div style={{ ...panel, padding: 24, textAlign: "center", fontSize: 14, color: colors.muted }}>{children}</div>;
}

// Number in a pill (e.g. 6 ユニット, 12語), in Chakra Petch.
const count = (n) => <span style={{ fontFamily: fontDisplay }}>{n}</span>;

// Small accent pill on a deck that is already in My Cards: a check mark and 追加済み.
function AddedBadge() {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, padding: "4px 10px",
        borderRadius: 999, background: colors.accent, color: colors.accentInk, whiteSpace: "nowrap",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <polyline points="2,6.5 5,9.5 10,3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("cardSets.addedBadge")}
    </span>
  );
}

// Card Sets tab: hub → textbooks → units → decks (→ word list, shown by App), or
// hub → Tests & Themes → collections (as deep as the tree goes) → decks.
// path: which screen to show, plus the chosen school level (kept in App so it survives opening a deck);
// onNavigate(path) changes it. myDeckIds: decks already in My Cards (they get a 追加済み badge).
// collections: the Tests & Themes tree from shapeCollections, null until it first loads.
export default function CardSetsTab({ textbooks, loading, collections = null, path, onNavigate, onOpenDeck, myDeckIds, disabled }) {
  const resolved = resolvePath(textbooks, path);
  let current = resolved.path;
  const { textbook, unit } = resolved;
  // A collection that no longer exists (once the tree has loaded) falls back to the Tests & Themes list.
  const collection = current.screen === "collection" ? findCollection(collections, current.collectionId) : null;
  if (current.screen === "collection" && collections && !collection) current = { screen: "tests", level: current.level };
  const back = () => onNavigate(current.screen === "collection" ? collectionParentPath(collection, current.level) : parentPath(current));
  const { level } = current;

  if (current.screen === "hub") {
    return (
      <CardSetsHub
        onOpenTextbooks={() => onNavigate({ screen: "textbooks", level })}
        onOpenTests={() => onNavigate({ screen: "tests", level })}
      />
    );
  }

  // above: optional controls between the title and the list (the level switch)
  const screen = (backLabel, title, kicker, body, above = null) => (
    <div style={{ display: "grid", gap: 16, textAlign: "left" }}>
      <BackButton label={backLabel} onClick={back} />
      <ScreenTitle kicker={kicker} title={title} />
      {above}
      <div style={{ display: "grid", gap: 10 }}>{body}</div>
    </div>
  );

  // One deck row (textbook and collection decks look the same and open the same word list).
  const deckRow = (deck) => (
    <NavRow
      key={deck.id}
      title={deck.name}
      pill={tx("cardSets.wordCount", { n: count(deck.wordCount), count: deck.wordCount })}
      badge={isDeckAdded(myDeckIds, deck.id) && <AddedBadge />}
      onClick={() => onOpenDeck(deck)}
      disabled={disabled}
    />
  );
  // One collection row, with the number of decks inside it (sub-collections included).
  const collectionRow = (c) => (
    <NavRow
      key={c.id}
      title={c.name}
      pill={tx("cardSets.deckCount", { n: count(c.deckCount), count: c.deckCount })}
      onClick={() => onNavigate({ screen: "collection", collectionId: c.id, level })}
    />
  );
  const loadingText = <p style={{ textAlign: "center", color: colors.muted }}>{t("cardSets.loading")}</p>;

  if (current.screen === "tests") {
    // Coming soon only when there are no collections at all.
    const body = collections === null ? loadingText
      : collections.length === 0 ? (
        <EmptyPanel>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 6 }}>{t("cardSets.comingSoon")}</div>
          {t("cardSets.comingSoonNote")}
        </EmptyPanel>
      )
      : collections.map(collectionRow);
    return screen(t("cardSets.title"), t("cardSets.tests"), t("cardSets.testsLabel"), body);
  }

  if (current.screen === "collection") {
    if (!collection) return loadingText;
    const parent = findCollection(collections, collection.parentId);
    const backLabel = parent ? parent.name : t("cardSets.tests");
    const empty = collection.children.length === 0 && collection.decks.length === 0;
    return screen(backLabel, collection.name, parent ? parent.name : t("cardSets.testsLabel"), empty
      ? <EmptyPanel>{t("cardSets.noDecks")}</EmptyPanel>
      : [...collection.children.map(collectionRow), ...collection.decks.map(deckRow)]);
  }

  // The list screens need the library; show "loading" only before it first arrives,
  // so coming back to the dashboard doesn't flash the list away.
  if (loading && textbooks.length === 0) return loadingText;

  if (current.screen === "textbooks") {
    const options = levelOptions(textbooks);
    const shown = pickLevel(level, options);
    const list = textbooksForLevel(textbooks, shown);
    return screen(t("cardSets.title"), t("cardSets.textbooks"), t("cardSets.textbooksLabel"), list.length === 0
      ? <EmptyPanel>{t("cardSets.noTextbooks")}</EmptyPanel>
      : list.map((tb) => (
        <NavRow
          key={tb.id}
          title={tb.name}
          pill={tx("cardSets.unitCount", { n: count(tb.units.length), count: tb.units.length })}
          onClick={() => onNavigate({ screen: "units", textbookId: tb.id, level: shown })}
        />
      )),
    <LevelSwitch options={options} value={shown} onChange={(l) => onNavigate({ screen: "textbooks", level: l })} />);
  }

  if (current.screen === "units") {
    return screen(t("cardSets.textbooks"), textbook.name, schoolLabel(textbook.school_level), textbook.units.length === 0
      ? <EmptyPanel>{t("cardSets.noUnits")}</EmptyPanel>
      : textbook.units.map((u) => (
        <NavRow
          key={u.id}
          title={u.name}
          pill={tx("cardSets.deckCount", { n: count(u.decks.length), count: u.decks.length })}
          onClick={() => onNavigate({ screen: "decks", textbookId: textbook.id, unitId: u.id, level })}
        />
      )));
  }

  // decks
  return screen(textbook.name, unit.name, textbook.name, unit.decks.length === 0
    ? <EmptyPanel>{t("cardSets.noDecks")}</EmptyPanel>
    : unit.decks.map(deckRow));
}
