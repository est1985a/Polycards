// Tests for the settings screen and theme previews. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SettingsScreen, { ThemeTile, SessionSizeSwitch } from './SettingsScreen';
import ThemePreview from './ThemePreview';
import ThemeUnlockSheet from './ThemeUnlockSheet';
import { themes } from '../themes';
import { themeList } from '../lib/themeUnlocks';

const ROWS = [
  ['midnight', 1], ['ryukoku', 5], ['snow', 10], ['pizza', 15], ['lagoon', 20],
  ['sakura', 30], ['matcha', 40], ['autumn', 50], ['neon', 60], ['galaxy', 70],
].map(([theme_key, unlock_level]) => ({ theme_key, unlock_level }));
const list = themeList(ROWS, themes);
const noop = () => {};

const render = (props = {}) => renderToStaticMarkup(
  <SettingsScreen
    themes={list} currentTheme="ryukoku" rank={12} onChooseTheme={noop}
    sessionSize={20} onSessionSizeChange={noop}
    answerMode="off" onAnswerModeChange={noop}
    reduceMotion={false} onReduceMotionChange={noop}
    onBack={noop}
    {...props}
  />,
);

// The HTML of one theme tile, found by its key.
const tile = (html, key) => html.match(new RegExp(`<button[^>]*data-theme-key="${key}"[\\s\\S]*?</button>`))[0];

describe('SettingsScreen', () => {
  it('has a back button, the title and three sections', () => {
    const html = render();
    expect(html).toContain('class="back-button"');
    expect(html).toContain('>戻る</span>');
    expect(html).toMatch(/<h2[^>]*>設定<\/h2>/);
    for (const title of ['テーマ', '学習', '表示']) expect(html).toMatch(new RegExp(`<h3[^>]*>${title}</h3>`));
  });

  it('the back button stays pinned to the top while the page scrolls', () => {
    expect(render()).toMatch(/data-sticky-back="" style="position:sticky/);
  });

  it('shows one tile per theme, in unlock order', () => {
    const keys = [...render().matchAll(/data-theme-key="([a-z]+)"/g)].map((m) => m[1]);
    expect(keys).toEqual(['midnight', 'ryukoku', 'snow', 'pizza', 'lagoon', 'sakura', 'matcha', 'autumn', 'neon', 'galaxy']);
  });

  it('uses 2 columns on phones and 5 on wide screens', () => {
    expect(render()).toMatch(/data-theme-grid=""[^>]*repeat\(2, minmax\(0, 1fr\)\)/);
    expect(render({ wide: true })).toMatch(/data-theme-grid=""[^>]*repeat\(5, minmax\(0, 1fr\)\)/);
  });

  it('labels Midnight, unlocked and locked themes', () => {
    const html = render();
    expect(tile(html, 'midnight')).toContain('はじめから');
    expect(tile(html, 'snow')).toContain('ランク 10 で解放ずみ');
    expect(tile(html, 'pizza')).toContain('ランク 15 で解放');
    expect(tile(html, 'pizza')).not.toContain('解放ずみ');
  });

  it('marks the selected theme with an accent border and a check badge', () => {
    const t = tile(render(), 'ryukoku');
    expect(t).toContain('aria-pressed="true"');
    expect(t).toContain('border:2px solid var(--accent)');
    expect(t).toContain('data-badge="check"');
    expect(tile(render(), 'snow')).toContain('aria-pressed="false"');
  });

  it('dims locked themes and gives them a lock badge', () => {
    const t = tile(render(), 'galaxy');
    expect(t).toContain('aria-disabled="true"');
    expect(t).toContain('data-badge="lock"');
    expect(t).toContain('filter:saturate(0.55) brightness(0.75)');
    const open = tile(render(), 'snow');
    expect(open).not.toContain('data-badge="lock"');
    expect(open).not.toContain('saturate(0.55)');
  });

  it('shows a save error, and a note when the themes could not be loaded', () => {
    expect(render({ themeError: 'このテーマはまだ使えません' })).toMatch(/role="alert"[^>]*>このテーマはまだ使えません/);
    const failed = render({ themes: themeList([ROWS[0]], themes), themesFailed: true });
    expect(failed).toContain('テーマを読み込めませんでした');
    expect([...failed.matchAll(/data-theme-key="([a-z]+)"/g)].map((m) => m[1])).toEqual(['midnight']);
  });

  it('shows 読み込み中… while the themes load', () => {
    expect(render({ themes: null })).toContain('読み込み中…');
  });

  it('shows no tile as locked while the rank is loading, and none can be tapped yet', () => {
    const html = render({ rank: null });
    expect(html).not.toContain('data-badge="lock"');
    expect(html).not.toContain('saturate(0.55)');
    expect(html).not.toContain('で解放');
    expect(html).not.toContain('はじめから');
    for (const key of ['midnight', 'galaxy']) expect(tile(html, key)).toMatch(/<button[^>]*disabled=""/);
    expect(tile(render(), 'snow')).not.toMatch(/<button[^>]*disabled=""/);
  });

  it("puts the student's rank in every preview", () => {
    const ranks = [...render({ rank: 37 }).matchAll(/ランク<\/span><span[^>]*>(\d+)</g)].map((m) => m[1]);
    expect(ranks).toHaveLength(10);
    expect(new Set(ranks)).toEqual(new Set(['37']));
  });

  it('has 1回の枚数, the 答え方 switch and the reduce-motion switch', () => {
    const html = render({ answerMode: 'typing', reduceMotion: true });
    expect(html).toContain('1回の復習で出てくるカードの数');
    expect(html).toContain('答え方（日本語 → English）');
    expect(html).toMatch(/aria-pressed="true"[^>]*>タイピング</);
    expect(html).toMatch(/role="switch" aria-checked="true"[^>]*><span>カードの動きを減らす<\/span>/);
    expect(html).toContain('カードをめくる動きやキラキラを止めます');
    expect(render()).toContain('role="switch" aria-checked="false"');
  });

  it('has no log-out button', () => {
    expect(render()).not.toContain('ログアウト');
  });
});

describe('SessionSizeSwitch', () => {
  it('offers 10, 20 and 30 and highlights the chosen one', () => {
    const html = renderToStaticMarkup(<SessionSizeSwitch size={30} onChange={noop} />);
    const pressed = [...html.matchAll(/aria-pressed="(true|false)"[^>]*><span[^>]*>(\d+)<\/span>枚/g)].map((m) => [m[2], m[1]]);
    expect(pressed).toEqual([['10', 'false'], ['20', 'false'], ['30', 'true']]);
  });
});

describe('ThemeTile', () => {
  it('reads out the name and status', () => {
    const html = renderToStaticMarkup(<ThemeTile item={list[9]} rank={3} selected={false} onChoose={noop} onLocked={noop} />);
    expect(html).toContain('aria-label="Galaxy（ランク 70 で解放）"');
  });
});

describe('ThemePreview', () => {
  const html = renderToStaticMarkup(<ThemePreview theme={themes.neon} rank={7} />);

  it("sets that theme's colors on its own box, whatever theme the app uses", () => {
    expect(html).toContain(`--bg:${themes.neon.colors.bg}`);
    expect(html).toContain(`--accent:${themes.neon.colors.accent}`);
    expect(html).toContain(`--lv7:${themes.neon.levels[7]}`);
    expect(html).toContain('--backdrop:radial-gradient');
    expect(html).toContain('container-type:inline-size');
    expect(renderToStaticMarkup(<ThemePreview theme={themes.snow} />)).toContain('--backdrop:none');
  });

  it('draws the mini app: header, rank, 8 level bars, card back and answer buttons', () => {
    expect(html).toContain('background:var(--backdrop), var(--bg)');
    expect(html).toContain('Polycards');
    expect(html).toMatch(/ランク<\/span><span[^>]*color:var\(--accentText\)[^>]*>7</);
    for (let i = 0; i < 8; i++) expect(html).toContain(`background:var(--lv${i})`);
    expect(html).toContain('EN → JP');
    expect(html).toMatch(/color:var\(--gold\)[^>]*>Lv 3</);
    expect(html).toMatch(/color:var\(--muted\)[^>]*>familiar</);
    expect(html).toMatch(/color:var\(--accentText\)[^>]*>よく知られた</);
    expect(html).toMatch(/background:var\(--danger\)[^>]*>まだ</);
    expect(html).toMatch(/background:var\(--accent\)[^>]*>わかった</);
    expect(html).toContain('color-mix(in srgb, var(--text) 18%, transparent)');
    expect(html).toContain('aria-label="Neon Tokyo のプレビュー"');
  });

  it('shows an example rank only when there is none', () => {
    expect(renderToStaticMarkup(<ThemePreview theme={themes.snow} />)).toMatch(/ランク<\/span><span[^>]*>12</);
    expect(renderToStaticMarkup(<ThemePreview theme={themes.snow} rank={null} />)).toMatch(/ランク<\/span><span[^>]*>12</);
  });
});

describe('ThemeUnlockSheet', () => {
  const lagoon = list.find((t) => t.key === 'lagoon');

  it('shows the rank, the theme, a big preview and both buttons', () => {
    const html = renderToStaticMarkup(<ThemeUnlockSheet item={lagoon} others={3} rank={23} onUse={noop} onLater={noop} />);
    expect(html).toContain('role="dialog"');
    expect(html).toMatch(/color:var\(--gold\)[^>]*>ランク (<!-- -->)?20(<!-- -->)? 達成！/);
    expect(html).toContain('新しいテーマ「<span style="font-weight:700">Lagoon</span>」が解放されました');
    expect(html).toContain('data-theme-preview');
    expect(html).not.toContain('saturate(0.55)');
    expect(html).toContain('ほかにも 3 つのテーマが解放されています');
    expect(html).toMatch(/ランク<\/span><span[^>]*>23</); // the preview shows the student's own rank
    expect(html).toContain('今すぐ使う');
    expect(html).toContain('あとで');
  });

  it('has no "others" line when only one theme is new', () => {
    const html = renderToStaticMarkup(<ThemeUnlockSheet item={lagoon} others={0} onUse={noop} onLater={noop} />);
    expect(html).not.toContain('ほかにも');
  });
});

describe('発音 settings (自動再生, ゆっくり)', () => {
  it('shows both switches, off by default, only when the browser can speak', () => {
    const html = render({ canSpeak: true });
    expect(html).toContain('発音');
    expect(html).toMatch(/aria-checked="false"[^>]*><span>自動再生<\/span>/);
    expect(html).toMatch(/aria-checked="false"[^>]*><span>ゆっくり<\/span>/);
    expect(render({ canSpeak: true, autoPlay: true, slowSpeech: true })).toMatch(/aria-checked="true"[^>]*><span>自動再生/);
    expect(render()).not.toContain('自動再生');
  });
});

describe('SettingsScreen: クラス', () => {
  it('lists the class names and offers クラスに参加', () => {
    const h = render({ classes: [{ id: 'c1', name: '1年A組' }, { id: 'c2', name: '英語クラブ' }] });
    expect(h).toContain('1年A組');
    expect(h).toContain('英語クラブ');
    expect(h).toContain('クラスに参加');
  });

  it('loading, none and a failed load', () => {
    expect(render({ classes: [] })).toContain('まだクラスに入っていません');
    expect(render({ classes: 'failed' })).toContain('クラスを読み込めませんでした');
  });
});
