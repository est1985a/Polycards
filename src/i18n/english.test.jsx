// Key screens in English mode, then back in Japanese. The switch needs no reload: every text is
// looked up when the screen is drawn. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { setLang } from './index';
import MyCardsTab from '../components/MyCardsTab';
import SettingsScreen from '../components/SettingsScreen';
import CardSetsTab from '../components/CardSetsTab';
import { AnswerArea } from '../components/StudySession';
import { shapeLibrary } from '../lib/library';

afterEach(() => setLang('ja'));

const noop = () => {};
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const myCards = () => renderToStaticMarkup(
  <MyCardsTab decks={[]} dueRows={[{ words: { deck_words: [] } }]} stats={null} onReview={noop} />,
);
const settings = (lang) => renderToStaticMarkup(
  <SettingsScreen
    themes={null} currentTheme="midnight" rank={3} onChooseTheme={noop}
    sessionSize={20} onSessionSizeChange={noop} answerMode="off" onAnswerModeChange={noop}
    reduceMotion={false} onReduceMotionChange={noop} lang={lang} onLangChange={noop} onBack={noop}
  />,
);
const buttons = () => renderToStaticMarkup(<AnswerArea revealed onReveal={noop} onAnswer={noop} />);
const LIBRARY = shapeLibrary([{ id: 1, name: 'New Horizon 1', school_level: 'JHS', units: [{ id: 10, name: 'Unit 1', unit_order: 1, decks: [
  { id: 100, name: 'Part 1', deck_words: [{ count: 1 }] },
  { id: 101, name: 'Part 2', deck_words: [{ count: 3 }] },
] }] }]);
const decks = () => renderToStaticMarkup(
  <CardSetsTab
    textbooks={LIBRARY} loading={false} path={{ screen: 'decks', textbookId: 1, unitId: 10, level: 'JHS' }}
    onNavigate={noop} onOpenDeck={noop} disabled={false}
  />,
);

describe('English mode', () => {
  it('My Cards switches to English and back', () => {
    setLang('en');
    const en = text(myCards());
    expect(en).toContain('Start review');
    expect(en).toContain('1 card');
    expect(en).toContain('No decks yet');
    expect(en).not.toContain('復習を始める');
    setLang('ja');
    expect(text(myCards())).toContain('復習を始める');
  });

  it('settings: English text, and the 言語 / Language switch looks the same in both languages', () => {
    setLang('en');
    const en = settings('en');
    expect(en).toContain('Settings');
    expect(en).toContain('Less motion');
    expect(en).toContain('言語 / Language');
    expect(en).toMatch(/lang="ja" aria-pressed="false"[^>]*>日本語</);
    expect(en).toMatch(/lang="en" aria-pressed="true"[^>]*>English</);
    setLang('ja');
    const ja = settings('ja');
    expect(ja).toContain('設定');
    expect(ja).toContain('言語 / Language');
    expect(ja).toMatch(/lang="ja" aria-pressed="true"[^>]*>日本語</);
  });

  it('answer buttons show only the English line, with no <br>', () => {
    setLang('en');
    const en = buttons();
    expect(en).toContain('>Still learning</button>');
    expect(en).toContain('>I knew it</button>');
    expect(en).not.toContain('<br');
    setLang('ja');
    expect(buttons()).toContain('Still learning<br/>まだ</button>');
  });

  it('Card Sets deck list: 1 word / 3 words', () => {
    setLang('en');
    const en = text(decks());
    expect(en).toContain(' 1 word ');
    expect(en).toContain(' 3 words ');
    setLang('ja');
    expect(decks()).toMatch(/>3<\/span>語/);
  });
});
