// Tests for the Mastered list (My Cards). Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MasteredList, { MasteredRow } from './MasteredList';

const CARDS = [
  { id: '5-jp2en', wordId: 5, direction: 'jp2en', en: 'harvest', jp: '収穫' },
  { id: '2-en2jp', wordId: 2, direction: 'en2jp', en: 'already', jp: 'もう、すでに' },
];

const render = (cards) => renderToStaticMarkup(<MasteredList cards={cards} restoringId={null} onRestore={() => {}} />);

describe('MasteredList', () => {
  it('shows every card in the given order (newest mastered first), with English and Japanese', () => {
    const html = render(CARDS);
    expect(html.indexOf('harvest')).toBeLessThan(html.indexOf('already'));
    expect(html).toContain('収穫');
    expect(html).toContain('もう、すでに');
  });

  it('labels the direction in English', () => {
    const html = render(CARDS);
    expect(html).toContain('Japanese to English');
    expect(html).toContain('English to Japanese');
  });

  it('has a 復習に戻す button for each card', () => {
    expect(render(CARDS).match(/復習に戻す/g)).toHaveLength(2);
  });

  it('shows the empty state when nothing is Mastered yet', () => {
    const html = render([]);
    expect(html).toContain('まだマスターしたカードはありません');
    expect(html).not.toContain('復習に戻す');
  });
});

describe('MasteredRow (asking before putting a card back)', () => {
  const row = (props) => renderToStaticMarkup(
    <MasteredRow card={CARDS[0]} confirming={false} restoring={false} onAsk={() => {}} onCancel={() => {}} onRestore={() => {}} {...props} />
  );

  it('shows only the 復習に戻す button at first', () => {
    const html = row();
    expect(html).toContain('復習に戻す');
    expect(html).not.toContain('復習に戻しますか？');
  });

  it('asks 復習に戻しますか？ on the card, with キャンセル and 戻す buttons', () => {
    const html = row({ confirming: true });
    expect(html).toContain('復習に戻しますか？');
    expect(html).toContain('>キャンセル</button>');
    expect(html).toContain('>戻す</button>');
    expect(html).not.toContain('>復習に戻す</button>');
  });
});
