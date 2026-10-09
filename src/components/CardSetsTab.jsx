import { colors, fontDisplay, panel } from '../styles/theme';
import { parentPath, resolvePath, schoolLabel, levelOptions, pickLevel, textbooksForLevel } from '../lib/library';
import CardSetsHub from './CardSetsHub';
import NavRow from './NavRow';
import LevelSwitch from './LevelSwitch';

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
      ← {label}
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

// Card Sets tab: hub → textbooks → units → decks (→ word list, shown by App), or Tests & Themes.
// path: which screen to show, plus the chosen school level (kept in App so it survives opening a deck);
// onNavigate(path) changes it.
export default function CardSetsTab({ textbooks, loading, path, onNavigate, onOpenDeck, disabled }) {
  const { path: current, textbook, unit } = resolvePath(textbooks, path);
  const back = () => onNavigate(parentPath(current));
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

  if (current.screen === "tests") {
    return screen("Card Sets", "Tests & Themes", "テスト・テーマ別", (
      <EmptyPanel>
        <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 6 }}>準備中 — Coming soon</div>
        英検などのセットは、もうすぐ追加されます。
      </EmptyPanel>
    ));
  }

  // The list screens need the library; show "loading" only before it first arrives,
  // so coming back to the dashboard doesn't flash the list away.
  if (loading && textbooks.length === 0) {
    return <p style={{ textAlign: "center", color: colors.muted }}>Loading library from database...</p>;
  }

  if (current.screen === "textbooks") {
    const options = levelOptions(textbooks);
    const shown = pickLevel(level, options);
    const list = textbooksForLevel(textbooks, shown);
    return screen("Card Sets", "Textbooks", "教科書から探す", list.length === 0
      ? <EmptyPanel>まだ教科書がありません。</EmptyPanel>
      : list.map((tb) => (
        <NavRow
          key={tb.id}
          title={tb.name}
          pill={<>{count(tb.units.length)} ユニット</>}
          onClick={() => onNavigate({ screen: "units", textbookId: tb.id, level: shown })}
        />
      )),
    <LevelSwitch options={options} value={shown} onChange={(l) => onNavigate({ screen: "textbooks", level: l })} />);
  }

  if (current.screen === "units") {
    return screen("Textbooks", textbook.name, schoolLabel(textbook.school_level), textbook.units.length === 0
      ? <EmptyPanel>まだユニットがありません。</EmptyPanel>
      : textbook.units.map((u) => (
        <NavRow
          key={u.id}
          title={u.name}
          pill={<>{count(u.decks.length)} デッキ</>}
          onClick={() => onNavigate({ screen: "decks", textbookId: textbook.id, unitId: u.id, level })}
        />
      )));
  }

  // decks
  return screen(textbook.name, unit.name, textbook.name, unit.decks.length === 0
    ? <EmptyPanel>まだデッキがありません。</EmptyPanel>
    : unit.decks.map((deck) => (
      <NavRow
        key={deck.id}
        title={deck.name}
        pill={<>{count(deck.wordCount)}語</>}
        onClick={() => onOpenDeck(deck)}
        disabled={disabled}
      />
    )));
}
