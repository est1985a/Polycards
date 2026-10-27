// Tests for the large Polyavatar view in the ポリアバター図鑑. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AvatarViewerBox } from './AvatarViewer';
import { setLang } from '../i18n';

afterEach(() => setLang('ja'));

const shiba = {
  id: 2, slug: 'shiba', rarity: 'super_rare', series: 'Series 1', owned: true, equipped: true,
  name_ja: '柴犬', name_en: 'Shiba Inu', image_url: null, obtained_at: '2026-10-26T15:30:00+00:00',
};
const box = (avatar) => renderToStaticMarkup(<AvatarViewerBox avatar={avatar} onClose={() => {}} />);

describe('AvatarViewerBox', () => {
  it('shows the reveal look: rarity, names, the date in Japan time, and ×', () => {
    const html = box(shiba);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('★★★');
    expect(html).toContain('ポリアバター');
    expect(html).toContain('Shiba Inu');
    expect(html).toContain('柴犬');
    expect(html).toContain('入手日：2026年10月27日');
    expect(html).toContain('>×</button>');
    expect(html).not.toContain('NEW');
  });

  it('English mode: English name only, US-style date', () => {
    setLang('en');
    const html = box(shiba);
    expect(html).toContain('Unlocked: Oct 27, 2026');
    expect(html).not.toContain('柴犬');
  });

  it('no date: no date line', () => {
    expect(box({ ...shiba, obtained_at: null })).not.toContain('入手日');
  });
});
