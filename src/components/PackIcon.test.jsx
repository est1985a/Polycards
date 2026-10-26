// Tests for the shared foil pack drawing, the hub's pack pictures and the tab bar icons. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PackIcon from './PackIcon';
import { crimp, PACK_BODY, PACK_STRIP } from '../lib/packShape';
import CardSetsHub from './CardSetsHub';
import { themes } from '../themes';
import Tabs from './Tabs';

describe('PackIcon', () => {
  it('has a crimped edge of 15 teeth points', () => {
    expect(crimp(144, 1)).toHaveLength(15);
    expect(crimp(144, 1)[1]).toBe('12,150');
    expect(PACK_BODY.startsWith('4,22 116,22')).toBe(true);
    expect(PACK_STRIP.endsWith('116,22 4,22')).toBe(true);
  });

  it('draws each emblem with theme colors only', () => {
    const diamond = renderToStaticMarkup(<PackIcon emblem="diamond" />);
    const book = renderToStaticMarkup(<PackIcon emblem="book" />);
    const plain = renderToStaticMarkup(<PackIcon emblem="none" />);
    expect(diamond).toContain('points="60,72 74,88 60,104 46,88"');
    expect(book).toContain('points="34,78 60,84 60,110 34,104"');
    expect(plain.match(/<polygon/g).length).toBeLessThan(book.match(/<polygon/g).length);
    for (const html of [diamond, book, plain]) {
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
    }
  });

  it('draws the logo emblem (Select Packs) as LogoMark on a plate, always in Midnight colors', () => {
    const html = renderToStaticMarkup(<PackIcon emblem="logo" />);
    expect(html).toContain('viewBox="0 0 84.3 73.4"'); // LogoMark itself, not a copy
    expect(html.match(/<polygon/g).length).toBeGreaterThanOrEqual(16 + 1);
    expect(html).toContain('points="30,66 90,66 96,92 90,118 30,118 24,92"'); // the plate
    // Midnight's variables are set around the plate, whatever theme the app uses
    expect(html).toContain(`--surface2:${themes.midnight.colors.surface2}`);
    expect(html).toContain(`--accent:${themes.midnight.colors.accent}`);
  });

  it('puts the animation classes on the strip and the shine', () => {
    const html = renderToStaticMarkup(<PackIcon stripClass="pack-strip-off" shineClass="pack-shine" />);
    expect(html).toContain('class="pack-strip-off"');
    expect(html).toContain('class="pack-shine"');
  });

  it('is scaled by width and height', () => {
    expect(renderToStaticMarkup(<PackIcon width={72} height={96} />)).toMatch(/width="72" height="96"/);
  });
});

describe('Word Packs hub pictures', () => {
  it('shows a pack on each card: a book on Textbook Packs (accent), the logo on Select Packs (gold)', () => {
    const html = renderToStaticMarkup(<CardSetsHub onOpenTextbooks={() => {}} onOpenTests={() => {}} />);
    expect(html.match(/viewBox="0 0 120 160"/g)).toHaveLength(2);
    expect(html.match(/points="34,78 60,84 60,110 34,104"/g)).toHaveLength(1);
    expect(html.match(/viewBox="0 0 84.3 73.4"/g)).toHaveLength(1); // the logo on Select Packs
    expect(html).toContain('color-mix(in srgb, var(--gold) 75%, var(--surface))');
  });
});

describe('tab bar icons', () => {
  const TABS = [
    { id: 'myCards', label: 'tabs.myCards' },
    { id: 'cardSets', label: 'tabs.cardSets' },
    { id: 'training', label: 'tabs.training' },
  ];
  const html = renderToStaticMarkup(<Tabs tabs={TABS} active="myCards" onChange={() => {}} />);

  it('uses the new names', () => {
    expect(html).toContain('マイデッキ');
    expect(html).toContain('単語パック');
    expect(html).toContain('トレーニング');
  });

  it('draws a stack of cards, a pile of three packs, and keeps the pencil', () => {
    const icons = html.split('<svg').slice(1);
    expect(icons).toHaveLength(3);
    expect(icons[0].match(/<rect/g)).toHaveLength(4);
    expect(icons[1].match(new RegExp(`points="${PACK_BODY}"`, 'g'))).toHaveLength(3);
    expect(icons[2]).toContain('M4 20l1.2-4.6');
    for (const icon of icons) expect(icon).toContain('currentColor');
  });
});
