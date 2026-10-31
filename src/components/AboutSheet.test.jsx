// Tests for the "What is Polycards?" pop-up. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AboutSheet from './AboutSheet';
import { ABOUT } from '../content/aboutPolycards';
import { TEACHER_GUIDE } from '../content/teacherGuide';
import { setLang } from '../i18n';
import { levelLadder } from '../lib/schedule';
import { LEVEL_HOURS } from '../lib/srs';

const render = (props = {}) => renderToStaticMarkup(<AboutSheet onClose={() => {}} {...props} />);
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

afterEach(() => setLang('ja'));

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

  it('shows the title, subtitle, the intro and the nine numbered sections ①–⑨ in order', () => {
    const html = render();
    expect(html).toContain('Polycardsとは？');
    expect(html).toContain('ポリカードのしくみ');
    expect(html).toContain('英単語をカードで覚えるアプリです');
    expect(ABOUT.sections).toHaveLength(9);
    const headings = ['パックを選ぶ', 'マイデッキで復習', '正直に答えよう', '答え方を選ぶ', 'EXPとランク', 'ガチャ券とポリアバター', 'トレーニング', 'クラス', '自分の記録'];
    let last = -1;
    headings.forEach((heading, i) => {
      const at = html.search(new RegExp(`<h3[^>]*><span aria-hidden="true"[^>]*>[^<]+</span><span[^>]*>${String.fromCharCode(0x2460 + i)} </span>${heading}</h3>`));
      expect(at, heading).toBeGreaterThan(last);
      last = at;
    });
  });

  it('ends the student part with the tips box', () => {
    const html = render();
    expect(html).toMatch(/class="about-tips"[^>]*border:2px solid var\(--gold\)/);
    expect(html).toContain('上手に使うコツ');
  });

  it('keeps the forgetting curve and the science in もっと詳しく, closed by default', () => {
    const html = render();
    const details = html.slice(html.indexOf('<details'), html.indexOf('</details>'));
    expect(html).toContain('<details class="about-more"');
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(details).toContain('もっと詳しく');
    expect(details).toContain('忘れるのはふつうのこと');
    expect(details).toContain('研究でわかっていること');
    expect(details).toContain('Spaced repetition');
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

  it("shows the student's own cards per review", () => {
    expect(render()).toContain('1回は20枚まで');
    expect(renderToStaticMarkup(<AboutSheet onClose={() => {}} sessionSize={10} />)).toContain('1回は10枚まで');
    expect(renderToStaticMarkup(<AboutSheet onClose={() => {}} sessionSize={30} />)).not.toContain('{sessionSize}');
  });

  it('shows list items as a list, without the ・ mark', () => {
    const html = render();
    expect(html).toMatch(/<li[^>]*>毎日少しずつやろう/);
    expect(html).not.toContain('・');
  });

  it('shows the teacher guide only for teachers', () => {
    expect(render()).not.toContain('先生用ガイド');
    expect(render()).not.toContain('teacher-guide');
    const html = render({ isTeacher: true });
    expect(html).toContain('id="teacher-guide"');
    expect(html).toContain('先生用ガイド');
    expect(TEACHER_GUIDE.sections).toHaveLength(10);
    const guide = html.slice(html.indexOf('id="teacher-guide"'));
    ['クラスを作って、生徒に参加してもらう', '生徒を検索して追加する', '名簿：本名と出席番号', '名簿を貼り付け：ログインで自動参加', '生徒の記録と「答え方のようす」', '一覧と、よく間違えた単語', '課題（パックを出す）', 'ガチャ券を贈る', 'クラスのランキング', 'CSVで保存'].forEach((heading, i) => {
      expect(guide).toMatch(new RegExp(`<span[^>]*>${String.fromCharCode(0x2460 + i)} </span>${heading}</h3>`));
    });
    expect(guide).toContain('先生へのヒント');
  });

  it('quotes the real button names in the teacher guide', () => {
    const guide = text(render({ isTeacher: true }));
    ['＋ クラスを作る', '大きく表示', '＋ 生徒を追加', 'チケットを贈る', '＋ 課題を出す', '生徒にランキングを表示', 'CSVで保存', 'クラスに参加', '＋ 名簿を貼り付け', '名簿に追加'].forEach((label) => {
      expect(guide).toContain(label);
    });
  });

  it('is all English in English mode, teacher guide included', () => {
    setLang('en');
    const html = text(render({ isTeacher: true }));
    expect(html).toContain('What is Polycards?');
    expect(html).toContain('Teacher Guide');
    expect(html).toContain('Learn more');
    expect(html).not.toMatch(/[\u3040-\u30ff\u4e00-\u9fff]/);
  });

  it('uses the student-facing names only', () => {
    ['ja', 'en'].forEach((lang) => {
      setLang(lang);
      const html = text(render({ isTeacher: true }));
      expect(html).not.toContain('ワードパック');
      expect(html).not.toContain('Card Sets');
      expect(html).not.toContain('My Cards');
      expect(html).not.toMatch(/\bpt\b/);
      expect(html).not.toMatch(/(?<!Poly)avatar/i);
    });
  });
});
