// Tests for the shared back button. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BackButton, { StickyBackButton } from './BackButton';

describe('BackButton', () => {
  it('is a 44 px pill with a drawn chevron and the label, no arrow character', () => {
    const html = renderToStaticMarkup(<BackButton label="マイデッキにもどる" onClick={() => {}} />);
    expect(html).toContain('class="back-button"');
    expect(html).toContain('type="button"');
    expect(html).toContain('min-height:44px');
    expect(html).toContain('<svg');
    expect(html).toContain('>マイデッキにもどる</span>');
    expect(html).not.toContain('←');
  });

  it('uses theme colors only', () => {
    const html = renderToStaticMarkup(<BackButton label="Back" onClick={() => {}} />);
    expect(html).toContain('var(--surface2)');
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
  });

  it('StickyBackButton: pinned to the top while the page scrolls; only the button takes taps', () => {
    const html = renderToStaticMarkup(<StickyBackButton label="戻る" onClick={() => {}} />);
    expect(html).toContain('data-sticky-back=""');
    expect(html).toContain('position:sticky');
    expect(html).toMatch(/data-sticky-back="" style="[^"]*pointer-events:none/);
    expect(html).toContain('pointer-events:auto');
    expect(html).toContain('class="back-button"');
    expect(html).toContain('>戻る</span>');
  });
});
