// Tests for the header. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Header, { GachaButton, AccountMenu, AccountButton } from './Header';
import { accountName } from '../lib/login';
import { themes } from '../themes';

describe('Header', () => {
  it('the logo is a "My Deck" (マイデッキ) button at least 44 px tall', () => {
    for (const variant of ['band', 'compact']) {
      const html = renderToStaticMarkup(<Header variant={variant} user={null} onHome={() => {}} />);
      expect(html).toMatch(/<h1[^>]*><button[^>]*aria-label="マイデッキ"/);
      expect(html).toContain('min-height:44px');
      expect(html).toContain('Polycards');
    }
  });

  it('the top row sits above the sticky and fixed layers (so the account menu is on top), below the pop-ups', () => {
    const html = renderToStaticMarkup(<Header user={null} onHome={() => {}} />);
    const z = Number(html.match(/position:relative;z-index:(\d+)/)[1]);
    expect(z).toBeGreaterThan(10); // word list bar 5, drill button and tabs 10
    expect(z).toBeLessThan(30); // pop-ups 30, gacha reveal 40
  });

  it('the logo is always in Midnight colors, whatever the theme', () => {
    const html = renderToStaticMarkup(<Header user={null} onHome={() => {}} />);
    expect(html).toMatch(new RegExp(`<svg[^>]*style="[^"]*--accent:${themes.midnight.colors.accent};`));
    expect(html).toContain(`--danger:${themes.midnight.colors.danger}`);
  });
});

describe('GachaButton', () => {
  it('no tickets: accent outline and icon, no badge', () => {
    const html = renderToStaticMarkup(<GachaButton tickets={0} onOpen={() => {}} />);
    expect(html).toContain('border:2px solid var(--accent)');
    expect(html).toContain('color:var(--accent)');
    expect(html).not.toContain('data-badge');
    expect(html).toContain('aria-label="ガチャ"');
  });

  it('tickets waiting: gold outline and icon, and a badge with the number', () => {
    const html = renderToStaticMarkup(<GachaButton tickets={3} onOpen={() => {}} />);
    expect(html).toContain('border:2px solid var(--gold)');
    expect(html).toMatch(/data-badge=""[^>]*>3<\/span>/);
    expect(html).toContain('ガチャ (券 3枚)');
  });

  it('pulses only when asked and tickets are waiting', () => {
    expect(renderToStaticMarkup(<GachaButton tickets={2} pulse onOpen={() => {}} />)).toContain('gacha-pulse');
    expect(renderToStaticMarkup(<GachaButton tickets={0} pulse onOpen={() => {}} />)).not.toContain('gacha-pulse');
    expect(renderToStaticMarkup(<GachaButton tickets={2} onOpen={() => {}} />)).not.toContain('gacha-pulse');
  });

  it('is shown next to the account button only when signed in', () => {
    const user = { email: 'a@b.c', user_metadata: {} };
    expect(renderToStaticMarkup(<Header user={user} gacha={{ tickets: 1 }} onHome={() => {}} />)).toContain('ガチャ (券 1枚)');
    expect(renderToStaticMarkup(<Header user={null} onHome={() => {}} />)).not.toContain('ガチャ');
  });
});

describe('account menu', () => {
  const user = { email: 'aiden@polycards.test', user_metadata: { username: 'aiden' } };
  const menu = (props = {}) => renderToStaticMarkup(<AccountMenu user={user} rank={7} {...props} />);

  it('shows the name and rank, then 設定, 使い方, a divider and ログアウト in the danger color', () => {
    const html = menu();
    expect(html).toContain('aiden');
    expect(html).toMatch(/ランク <span[^>]*>7<\/span>/);
    const order = ['aiden', '設定', '使い方', 'aria-hidden="true"', 'ログアウト'].map((t) => html.indexOf(t));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toMatch(/color:var\(--danger\)[^>]*>ログアウト</);
  });

  it('lists 学習の記録 just before 設定', () => {
    const html = menu();
    const stats = html.indexOf('>学習の記録<');
    expect(stats).toBeGreaterThan(html.indexOf('aiden'));
    expect(stats).toBeLessThan(html.indexOf('>設定<'));
    expect(html).toMatch(/role="menuitem"[^>]*>学習の記録</);
  });

  it('asks before logging out', () => {
    const html = menu({ confirming: true });
    expect(html).toContain('ログアウトしますか？');
    expect(html).toMatch(/>ログアウト<\/button><button[^>]*>キャンセル</);
    expect(html).not.toContain('設定');
  });

  it('picks the username, then the Google name, then the email', () => {
    expect(accountName(user)).toBe('aiden');
    expect(accountName({ email: 'x@y.z', user_metadata: { full_name: 'Andre K' } })).toBe('Andre K');
    expect(accountName({ email: 'x@y.z', user_metadata: { name: 'Andre' } })).toBe('Andre');
    expect(accountName({ email: 'x@y.z', user_metadata: {} })).toBe('x@y.z');
  });

  it('the circle keeps the initial and shows an accent dot only for new themes', () => {
    const plain = renderToStaticMarkup(<AccountButton user={user} onSignOut={() => {}} />);
    expect(plain).toMatch(/>A<\/button>/);
    expect(plain).not.toContain('data-dot');
    const dotted = renderToStaticMarkup(<AccountButton user={user} dot onSignOut={() => {}} />);
    expect(dotted).toMatch(/data-dot=""[^>]*background:var\(--accent\)/);
  });
});

describe('header band', () => {
  it('fades the triangles with a mask instead of painting the page color over the backdrop', () => {
    const html = renderToStaticMarkup(<Header variant="band" user={null} onHome={() => {}} />);
    expect(html).toContain('class="header-band-art"');
    expect(html).not.toContain('linear-gradient(to bottom, transparent, var(--bg))');
  });
});
