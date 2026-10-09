// Tests for the header. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Header from './Header';

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
