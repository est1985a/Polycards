// Tests for the アバター図鑑 (collection). Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GachaCollection, { CollectionTile } from './GachaCollection';

const owned = { id: 2, slug: 'shiba', rarity: 'normal', series: 'Series 1', owned: true, equipped: false, name_ja: '柴犬', name_en: 'Shiba Inu', image_url: null };
const unowned = { id: 3, slug: null, rarity: 'rare', series: 'Series 1', owned: false, equipped: false, name_ja: null, name_en: null, image_url: null };
const secret = { id: 4, slug: null, rarity: 'secret', series: 'Series 1', owned: false, equipped: false, name_ja: null, name_en: null, image_url: null };

const tile = (avatar) => renderToStaticMarkup(<CollectionTile avatar={avatar} onEquip={() => {}} />);

describe('CollectionTile', () => {
  it('owned: picture and English name, tappable to wear it', () => {
    const html = tile(owned);
    expect(html).toContain('data-tile="owned"');
    expect(html).toContain('>Shiba Inu</div>');
    expect(html).not.toContain('>柴犬<');
    expect(html).toContain('aria-label="柴犬 (Shiba Inu) をつける"');
    expect(html).toMatch(/^<button/);
    expect(html).not.toContain('つけ中');
  });

  it('owned and worn: shows つけ中', () => {
    expect(tile({ ...owned, equipped: true })).toContain('つけ中');
  });

  it('not owned: a dark silhouette with no name', () => {
    const html = tile(unowned);
    expect(html).toContain('data-tile="silhouette"');
    expect(html).toContain('filter:brightness(0)');
    expect(html).not.toMatch(/^<button/);
    expect(html).not.toContain('柴犬');
    expect(html).not.toContain('Shiba Inu');
  });

  it('not owned Secret: a locked ??? tile', () => {
    const html = tile(secret);
    expect(html).toContain('data-tile="secret"');
    expect(html).toContain('???');
    expect(html).not.toContain('<svg');
  });

  it('shows the picture when image_url is set', () => {
    expect(tile({ ...owned, image_url: 'https://example.com/shiba.png' })).toContain('src="https://example.com/shiba.png"');
  });
});

describe('GachaCollection', () => {
  it('shows owned / total and per-rarity counts with the Secret total hidden', () => {
    const cat = { ...owned, id: 1, slug: 'cat', name_ja: 'ネコ', name_en: 'Cat', equipped: true };
    for (const wide of [false, true]) {
      const html = renderToStaticMarkup(<GachaCollection rows={[cat, owned, unowned, secret]} onEquip={() => {}} onBack={() => {}} wide={wide} />);
      expect(html).toContain('← ガチャ');
      expect(html).toContain('アバター図鑑');
      expect(html).toContain('2 / 4');
      expect(html).toContain('0 / ?');
      expect(html).toContain('Series 1');
      expect(html).toContain('>Cat</div>');
    }
  });
});
