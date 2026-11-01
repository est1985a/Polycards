// Guard: student-facing text must live in src/i18n/ja.js and en.js, never in the code itself.
// Fails if a code line (comments don't count) in the app's screens or helpers contains Japanese.
// When this fails: move the text into both ja.js and en.js and use t() / tx(). Run with: npm test
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';


const SRC = join(import.meta.dirname, '..');
const CHECKED = ['components', 'lib', 'content', 'handwriting', 'App.jsx'];

// Allowed to contain Japanese: the login screen (always Japanese), the i18n folder itself,
// and the hidden /hw-test page with its self-check tooling. Test files are skipped too.
const ALLOWED_FILES = new Set([
  'components/LoginScreen.jsx',
  'lib/login.js',
  'handwriting/HwTestPage.jsx',
  'handwriting/HwLettersPage.jsx',
  'handwriting/HwTestRoot.jsx',
  'handwriting/selfCheck.js',
]);

// spelling.js clean-up rules remove Japanese punctuation, the same as spelling_normalize() in
// the database. Only these characters, and only on its .replace( lines.
const SPELLING_FILE = 'lib/spelling.js';
const SPELLING_CHARS = /[〜、。！？]/g;

// The tiny theme preview shows a fixed sample card (familiar / よく知られた), like word content.
const PREVIEW_FILE = 'components/ThemePreview.jsx';
const PREVIEW_SAMPLE = 'よく知られた';

// Hiragana, katakana, kanji, Japanese punctuation and full-width forms.
const RANGES = [[0x3000, 0x303f], [0x3040, 0x309f], [0x30a0, 0x30ff], [0x4e00, 0x9fff], [0xff00, 0xffef]];
const JAPANESE = new RegExp(`[${RANGES.map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join('')}]`);

function files(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

// The code part of each line: /* … */ and // comments removed (not the // in "https://").
function codeLines(source) {
  let inBlock = false;
  return source.split(/\r?\n/).map((line) => {
    let code = '';
    let i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i);
        if (end === -1) break;
        inBlock = false;
        i = end + 2;
      } else if (line.startsWith('/*', i)) {
        inBlock = true;
        i += 2;
      } else if (line.startsWith('//', i) && line[i - 1] !== ':') {
        break;
      } else {
        code += line[i];
        i += 1;
      }
    }
    return code;
  });
}

function findJapanese() {
  const found = [];
  for (const path of CHECKED.flatMap((p) => files(join(SRC, p)))) {
    const file = relative(SRC, path).replaceAll('\\', '/');
    if (!/\.jsx?$/.test(file) || /\.test\.jsx?$/.test(file) || ALLOWED_FILES.has(file)) continue;
    codeLines(readFileSync(path, 'utf8')).forEach((code, i) => {
      let checked = code;
      if (file === SPELLING_FILE && code.includes('.replace(')) checked = checked.replace(SPELLING_CHARS, '');
      if (file === PREVIEW_FILE) checked = checked.replace(PREVIEW_SAMPLE, '');
      if (JAPANESE.test(checked)) found.push(`src/${file}:${i + 1}: ${code.trim()}`);
    });
  }
  return found;
}

describe('no Japanese text outside src/i18n/', () => {
  it('finds none in components, lib, content, handwriting and App.jsx', () => {
    expect(findJapanese()).toEqual([]);
  });

  it('ignores comments but sees code', () => {
    expect(codeLines('const a = 1; // 日本語\n/* 日本語\n 日本語 */ const b = "日本語";\nfetch("https://x/日本語")')).toEqual([
      'const a = 1; ', '', ' const b = "日本語";', 'fetch("https://x/日本語")',
    ]);
  });
});

// Guard: the app is called Polyvo (renamed from Polycards on 2026-11-01). The old name must not
// come back in visible text: i18n, components, content, App.jsx and index.html (comments and
// test files don't count). Case-sensitive, so the names that stay lowercase (polycards.* storage
// keys, polycards-* CSS names, the polycards.test login domain) pass, and so do Polyavatars.
// The import path of src/content/aboutPolycards.js is the one allowed exception.
const OLD_NAME = /Polycards|ポリカード/;
const BRAND_CHECKED = ['i18n', 'components', 'content', 'App.jsx'];

function findOldName() {
  const found = [];
  for (const path of BRAND_CHECKED.flatMap((p) => files(join(SRC, p)))) {
    const file = relative(SRC, path).replaceAll('\\', '/');
    if (!/\.jsx?$/.test(file) || /\.test\.jsx?$/.test(file)) continue;
    codeLines(readFileSync(path, 'utf8')).forEach((code, i) => {
      if (OLD_NAME.test(code.replaceAll('aboutPolycards', ''))) found.push(`src/${file}:${i + 1}: ${code.trim()}`);
    });
  }
  const html = readFileSync(join(SRC, '..', 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  html.split(/\r?\n/).forEach((line, i) => {
    if (OLD_NAME.test(line)) found.push(`index.html:${i + 1}: ${line.trim()}`);
  });
  return found;
}

describe('the old app name (Polycards / ポリカード) is not shown anywhere', () => {
  it('finds none in i18n, components, content, App.jsx and index.html', () => {
    expect(findOldName()).toEqual([]);
  });

  it('catches it in code but not in comments or the aboutPolycards path', () => {
    const lines = codeLines('// Polycards\nconst a = "ポリカード";\nimport { ABOUT } from "../content/aboutPolycards";');
    expect(lines.map((c) => OLD_NAME.test(c.replaceAll('aboutPolycards', '')))).toEqual([false, true, false]);
  });
});
