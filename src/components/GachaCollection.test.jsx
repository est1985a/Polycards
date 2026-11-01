// Tests for the ポリアバター図鑑 (collection). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import GachaCollection, { CollectionTile } from './GachaCollection';
import { setLang } from '../i18n';

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
      expect(html).toContain('>ガチャ</span>');
      expect(html).toContain('ポリアバター図鑑');
      expect(html).toContain('2 / 4');
      expect(html).toContain('0 / ?');
      expect(html).toContain('Series 1');
      expect(html).toContain('>Cat</div>');
    }
  });

  it('the back button follows where the collection was opened from', () => {
    const at = (from) => renderToStaticMarkup(<GachaCollection rows={[]} onEquip={() => {}} onBack={() => {}} from={from} />);
    expect(at(undefined)).toContain('>ガチャ</span>');
    expect(at('gacha')).toContain('>ガチャ</span>');
    expect(at('dashboard')).toContain('>戻る</span>');
    expect(at('dashboard')).not.toContain('>ガチャ</span>');
  });
});

describe('worn Polyavatar in the summary panel', () => {
  const cat = { ...owned, id: 1, slug: 'cat', name_ja: 'ネコ', name_en: 'Cat', equipped: true };

  it('is a button with the tap-to-enlarge hint; grid tiles stay the same', () => {
    const html = renderToStaticMarkup(<GachaCollection rows={[cat, owned]} onEquip={() => {}} onBack={() => {}} />);
    expect(html).toContain('aria-label="ネコ (Cat) を大きく見る"');
    expect(html).toContain('タップで大きく');
    expect(html).toContain('aria-label="柴犬 (Shiba Inu) をつける"');
    expect(html).not.toContain('role="dialog"');
  });

  it('no worn Polyavatar: nothing to tap', () => {
    const html = renderToStaticMarkup(<GachaCollection rows={[{ ...owned }]} onEquip={() => {}} onBack={() => {}} />);
    expect(html).not.toContain('大きく見る');
    expect(html).not.toContain('タップで大きく');
  });
});

describe('Special Polyavatars in the collection', () => {
  afterEach(() => setLang('ja'));
  const lockedSpecial = { id: 50, slug: null, rarity: 'special', series: 'Special', owned: false, equipped: false, name_ja: null, name_en: null, image_url: null, unlock_rank: 80 };
  const ownedSpecial = { id: 51, slug: 'special-silver', rarity: 'special', series: 'Special', owned: true, equipped: false, name_ja: 'ポリボ シルバー', name_en: 'Polyvo Silver', image_url: null, unlock_rank: 90 };

  it('a locked Special: silhouette and the rank that gives it', () => {
    const html = tile(lockedSpecial);
    expect(html).toContain('data-tile="special"');
    expect(html).toContain('filter:brightness(0)');
    expect(html).toContain('ランク80になるとゲット！');
    expect(html).not.toMatch(/^<button/);
    setLang('en');
    expect(tile(lockedSpecial)).toContain('Reach Rank 80 to unlock');
  });

  it('an owned Special works like any owned avatar (tap to wear it)', () => {
    const html = tile(ownedSpecial);
    expect(html).toContain('data-tile="owned"');
    expect(html).toMatch(/^<button/);
    expect(html).toContain('Polyvo Silver');
  });

  it('gets its own スペシャル section with the how-to line', () => {
    const html = renderToStaticMarkup(<GachaCollection rows={[owned, lockedSpecial, ownedSpecial]} onEquip={() => {}} onBack={() => {}} />);
    expect(html).toContain('ランク80から10ランクごとにゲット');
    expect(html).toContain('>スペシャル</h3>');
    expect(html).not.toContain('>Special</h3>');
  });
});

describe('GachaCollection: Halloween 2026', () => {
  const h = (id, rarity, isOwned) => ({
    id, slug: isOwned ? `halloween-${id}` : null, rarity, series: 'Halloween 2026', owned: isOwned, equipped: false,
    name_ja: isOwned ? 'おばけ' : null, name_en: isOwned ? 'Ghost' : null, image_url: `/avatars/halloween-${id}.svg`,
  });
  const halloween = [h(51, 'super_rare', false), h(52, 'rare', true), h(53, 'rare', false), h(54, 'normal', true), h(55, 'normal', false), h(56, 'normal', false)];

  it('has its own section after Series 1 with a translated heading, N / 6, and ★★★ / ★★ / ★', () => {
    const html = renderToStaticMarkup(<GachaCollection rows={[...halloween, owned, unowned]} onEquip={() => {}} onBack={() => {}} />);
    expect(html.indexOf('Series 1')).toBeLessThan(html.indexOf('ハロウィン 2026'));
    expect(html).toMatch(/ハロウィン 2026<\/h3><span data-series-count=""[^>]*>2 \/ 6</);
    const section = html.slice(html.indexOf('ハロウィン 2026'));
    expect(section.indexOf('★★★')).toBeLessThan(section.indexOf('★★<'));
    expect(section.indexOf('★★<')).toBeLessThan(section.indexOf('★<'));
    // Not owned yet: an ordinary silhouette (not the locked ??? tile)
    expect(section).toContain('data-tile="silhouette"');
    expect(section).not.toContain('???');
  });
});
