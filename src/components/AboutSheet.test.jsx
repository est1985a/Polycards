// Tests for the "What is Polycards?" pop-up. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AboutSheet from './AboutSheet';
import { ABOUT } from '../content/aboutPolycards';
import { levelLadder } from '../lib/schedule';
import { LEVEL_HOURS } from '../lib/srs';

const render = () => renderToStaticMarkup(<AboutSheet onClose={() => {}} />);

// The wait text of each Lv chip, in order.
const chipLabels = (html) =>
  [...html.matchAll(/class="about-ladder-chip"[^>]*><span[^>]*>Lv\d<\/span><span>([^<]+)<\/span>/g)].map((m) => m[1]);

describe('AboutSheet', () => {
  it('is a dialog with an X close button', () => {
    const html = render();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="閉じる (Close)"');
  });

  it('shows the title, subtitle and all five section headings', () => {
    const html = render();
    expect(html).toContain('What is Polycards?');
    expect(html).toContain('ポリカードのしくみ');
    expect(ABOUT.sections).toHaveLength(5);
    ['Forgetting is normal', 'The level ladder', 'The science', 'Why it helps you', 'Tips'].forEach((heading, i) => {
      expect(html).toMatch(new RegExp(`<h3[^>]*><span[^>]*>${i + 1}\\.</span> ${heading}</h3>`));
    });
  });

  it('builds the ladder chips from LEVEL_HOURS', () => {
    const labels = chipLabels(render());
    expect(labels).toHaveLength(LEVEL_HOURS.length - 1);
    expect(labels).toEqual(levelLadder().map((s) => s.label));
    expect(labels).toEqual(['4時間', '1日', '3日', '1週間', '2週間', '1か月', '4か月']);
  });

  it('ends the ladder with a Mastered! chip on the accent color', () => {
    expect(render()).toMatch(/class="about-ladder-mastered"[^>]*background:var\(--accent\)[^>]*>Mastered!<\/li>/);
  });

  it('puts the chips between the わかった and まだ paragraphs', () => {
    const html = render();
    const before = html.indexOf('「わかった」を押すと');
    const chips = html.indexOf('about-ladder-chip');
    const after = html.indexOf('「まだ」を押すと');
    expect(before).toBeGreaterThan(-1);
    expect(before).toBeLessThan(chips);
    expect(chips).toBeLessThan(after);
  });

  it('shows list items as a list, without the ・ mark', () => {
    const html = render();
    expect(html).toMatch(/<li[^>]*>毎日少しずつやろう/);
    expect(html).not.toContain('・');
  });
});
