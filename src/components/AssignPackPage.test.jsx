// Tests for choosing a pack to assign (teacher): choosing ONLY selects the pack. The picker never
// shows ＋ マイデッキに追加 or the drill and never writes the teacher's own My Deck.
// Static render; a tap is checked by calling the embedded Word Packs list's deck handler. Run with: npm test
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// Every function that could change the teacher's own data. None may be called while choosing.
const writes = vi.hoisted(() => ({
  addDeckToMyCards: vi.fn(), removeDeckFromMyCards: vi.fn(), fetchOwnedWordIds: vi.fn(), fetchDeckWords: vi.fn(),
  recordAnswer: vi.fn(), createAssignment: vi.fn(),
}));
vi.mock('../lib/api', () => writes);

import AssignPackPage, { PickStep, AssignForm } from './AssignPackPage';
import CardSetsTab from './CardSetsTab';
import { shapeLibrary } from '../lib/library';
import { setLang } from '../i18n';

afterEach(() => { setLang('ja'); vi.clearAllMocks(); });
const noop = () => {};

const LIBRARY = shapeLibrary([{
  id: 'tb1', name: 'New Horizon 1', school_level: 'JHS',
  units: [{ id: 'u1', name: 'Unit 1', unit_order: 1, decks: [
    { id: 'd1', name: 'Unit 1 Part 1', deck_words: [{ count: 12 }] },
    { id: 'd2', name: 'Unit 1 Part 2', deck_words: [{ count: 8 }] },
  ] }],
}]);
const DECKS_PATH = { screen: 'decks', textbookId: 'tb1', unitId: 'u1', level: 'JHS' };

// The React element of a type somewhere in a (not rendered) element tree.
function findElement(node, type) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findElement(child, type);
      if (hit) return hit;
    }
    return null;
  }
  if (node.type === type) return node;
  return findElement(node.props?.children, type);
}

const pickProps = (extra = {}) => ({
  className: '1年A組', textbooks: LIBRARY, collections: [], loading: false, path: DECKS_PATH,
  onNavigate: noop, assignedDeckIds: ['d2'], onPick: vi.fn(), onBack: noop, ...extra,
});

const ADD_OR_DRILL = ['マイデッキに追加', 'おためしドリル', 'Add to My Deck', 'Practice Drill', 'マイデッキへ'];

describe('choosing a pack to assign', () => {
  it('tapping a pack only selects it (onPick with its id, name, word count and source)', () => {
    const props = pickProps();
    const list = findElement(PickStep(props), CardSetsTab);
    expect(list).not.toBeNull();
    list.props.onOpenDeck(LIBRARY[0].units[0].decks[0]);
    expect(props.onPick).toHaveBeenCalledTimes(1);
    expect(props.onPick).toHaveBeenCalledWith({ id: 'd1', name: 'Unit 1 Part 1', wordCount: 12, source: 'New Horizon 1 · Unit 1' });
  });

  it('never touches the teacher\'s own data while choosing', () => {
    const props = pickProps();
    findElement(PickStep(props), CardSetsTab).props.onOpenDeck(LIBRARY[0].units[0].decks[0]);
    for (const fn of Object.values(writes)) expect(fn).not.toHaveBeenCalled();
  });

  it('the pack list shows 出題済み (not 追加済み) on packs this class already has', () => {
    const html = renderToStaticMarkup(<PickStep {...pickProps()} />);
    expect(html).toContain('Unit 1 Part 1');
    expect(html).toContain('出題済み');
    expect(html).not.toContain('追加済み');
  });

  it('no add-to-My-Deck or drill button on the pick step, the form, or the first screen', () => {
    setLang('ja');
    const pick = renderToStaticMarkup(<PickStep {...pickProps()} />);
    const form = renderToStaticMarkup(
      <AssignForm deck={{ id: 'd1', name: 'Unit 1 Part 1', wordCount: 12, source: 'New Horizon 1 · Unit 1' }} className="1年A組" onSubmit={noop} onBackToPick={noop} />,
    );
    const page = renderToStaticMarkup(<AssignPackPage className="1年A組" library={LIBRARY} collections={[]} onBack={noop} onCreate={noop} onDone={noop} />);
    for (const html of [pick, form, page]) {
      for (const text of ADD_OR_DRILL) expect(html).not.toContain(text);
    }
    setLang('en');
    const formEn = renderToStaticMarkup(
      <AssignForm deck={{ id: 'd1', name: 'Unit 1 Part 1', wordCount: 12, source: '' }} className="1年A組" onSubmit={noop} onBackToPick={noop} />,
    );
    for (const text of ADD_OR_DRILL) expect(formEn).not.toContain(text);
    for (const fn of Object.values(writes)) expect(fn).not.toHaveBeenCalled();
  });

  it('the form shows the pack, an optional due date and note, and 課題を出す', () => {
    const html = renderToStaticMarkup(
      <AssignForm deck={{ id: 'd1', name: 'Unit 1 Part 1', wordCount: 12, source: 'New Horizon 1 · Unit 1' }} className="1年A組" initialNote="金曜日の小テスト" onSubmit={noop} onBackToPick={noop} />,
    );
    expect(html).toContain('Unit 1 Part 1');
    expect(html).toContain('New Horizon 1 · Unit 1');
    expect(html).toContain('type="date"');
    expect(html).toContain('期限（なくてもOK）');
    expect(html).toContain('8/60');
    expect(html).toContain('課題を出す');
  });

  it('a note over 60 characters can\'t be sent', () => {
    const html = renderToStaticMarkup(
      <AssignForm deck={{ id: 'd1', name: 'P', wordCount: 1 }} className="A" initialNote={'あ'.repeat(61)} onSubmit={noop} onBackToPick={noop} />,
    );
    expect(html).toContain('メモは60文字までです');
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });
});
