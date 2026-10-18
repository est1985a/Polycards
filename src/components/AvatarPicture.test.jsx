// Tests for the avatar picture and its rarity sparkles. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AvatarPicture from './AvatarPicture';

const avatar = (rarity, extra = {}) => ({ slug: 'fox', name_en: 'Fox', rarity, image_url: null, ...extra });
const html = (props) => renderToStaticMarkup(<AvatarPicture size={64} {...props} />);
const count = (s, text) => s.split(text).length - 1;

describe('AvatarPicture sparkles', () => {
  it('an owned Rare gets 3 sparkles, hidden from screen readers, and no glow', () => {
    const s = html({ avatar: avatar('rare') });
    expect(count(s, 'class="rarity-sparkle"')).toBe(3);
    expect(count(s, '<span aria-hidden="true" class="rarity-sparkle"')).toBe(3);
    expect(s).toContain('pointer-events:none');
    expect(s).not.toContain('rarity-glow');
  });

  it('Normal gets nothing', () => {
    const s = html({ avatar: avatar('normal') });
    expect(s).not.toContain('rarity-sparkle');
    expect(s).not.toContain('rarity-glow');
  });

  it('a silhouette gets nothing', () => {
    const s = html({ avatar: avatar('secret'), silhouette: true });
    expect(s).not.toContain('rarity-sparkle');
    expect(s).not.toContain('rarity-glow');
    expect(s).toContain('filter:brightness(0)');
  });

  it('sparkles={false} turns them off', () => {
    expect(html({ avatar: avatar('super_rare'), sparkles: false })).not.toContain('rarity-');
  });

  it('Super Rare gets 5 sparkles and the gold glow', () => {
    const s = html({ avatar: avatar('super_rare') });
    expect(count(s, 'class="rarity-sparkle"')).toBe(5);
    expect(s).toContain('<span aria-hidden="true" class="rarity-glow-super"');
    expect(s).not.toContain('rarity-glow-secret');
  });

  it('Secret gets 6 sparkles and the pulsing glow', () => {
    const s = html({ avatar: avatar('secret') });
    expect(count(s, 'class="rarity-sparkle"')).toBe(6);
    expect(s).toContain('<span aria-hidden="true" class="rarity-glow-secret"');
  });

  it('pictures with an image also sparkle', () => {
    const s = html({ avatar: avatar('rare', { image_url: 'https://example.com/fox.png' }) });
    expect(s).toContain('src="https://example.com/fox.png"');
    expect(count(s, 'class="rarity-sparkle"')).toBe(3);
  });

  it('the starter cat gets nothing', () => {
    expect(html({ avatar: null })).not.toContain('rarity-');
  });
});
