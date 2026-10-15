// Tests for the header. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Header, { GachaButton } from './Header';

describe('Header', () => {
  it('the logo is a "My Cards" button at least 44 px tall', () => {
    for (const variant of ['band', 'compact']) {
      const html = renderToStaticMarkup(<Header variant={variant} user={null} onHome={() => {}} />);
      expect(html).toMatch(/<h1[^>]*><button[^>]*aria-label="My Cards"/);
      expect(html).toContain('min-height:44px');
      expect(html).toContain('Polycards');
    }
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
