// Tests for what the handwriting answer shows (before and after answering). The model and the
// pen can't run here, so results are passed in. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HandwritingInput from './HandwritingInput.jsx';
import { scoreWord } from './checkAnswer.js';
import { HW_COLORS } from './config.js';

const render = (props) => renderToStaticMarkup(
  <HandwritingInput answer="fish" onResult={() => {}} onDontKnow={() => {}} onError={() => {}} {...props} />,
);
const result = (reads, probs = []) => {
  const target = 'fish';
  const s = scoreWord([...target].map((t, i) => ({ target: t, read: reads[i], targetProb: probs[i] ?? (reads[i] === t ? 0.9 : 0) })));
  return { ...s, reads, text: reads.map((r) => r ?? '?').join('') };
};

describe('HandwritingInput', () => {
  it('before answering: the hint, わからない and こたえる (off until something is written)', () => {
    const h = render({});
    expect(h).toContain('Apple Pencil で、1マスに1文字ずつ書いてください');
    expect(h).toContain('わからない');
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>こたえる<\/button>/);
  });

  it('a wrong answer shows 読み取り with the wrong letters in red, and the right answer', () => {
    const h = render({ answered: true, result: result(['f', 'o', 's', null]) });
    expect(h).toContain('読み取り');
    expect(h).toContain('<span style="color:var(--danger)">o</span>');
    expect(h).toContain('<span style="color:var(--danger)">?</span>');
    expect(h).toContain('正しい答え');
    expect(h).not.toContain('こたえる');
    expect(h).not.toContain('わからない');
  });

  it('a lenient answer shows the orange warning, naming the letter read, and no 読み取り', () => {
    const h = render({ answered: true, result: result(['f', 'j', 's', 'h'], [0.9, 0.45, 0.9, 0.9]) });
    expect(h).toContain('「i」が「j」に見えるかも。気をつけて書こう！');
    expect(h).toContain(`color:${HW_COLORS.lenient}`);
    expect(h).not.toContain('読み取り');
  });

  it('the warning stays with a wrong answer too, each pair once', () => {
    const h = render({ answered: true, result: result(['f', 'l', 'o', 'h']) });
    expect(h.match(/「i」が「l」に見えるかも/g)).toHaveLength(1);
    expect(h).toContain('読み取り');
  });

  it('after わからない (answered, nothing read) the boxes stay open to practice in: 消す / 戻す, no こたえる', () => {
    const h = render({ answered: true, result: null });
    expect(h).toContain('>消す<');
    expect(h).toContain('>戻す<');
    expect(h).not.toContain('こたえる');
  });

  it('after a read answer the boxes are locked (no 消す / 戻す)', () => {
    const h = render({ answered: true, result: result(['f', 'o', 's', 'h']) });
    expect(h).not.toContain('>消す<');
  });

  it('a correct answer shows no reading and no warning', () => {
    const h = render({ answered: true, result: result(['f', 'i', 's', 'h']) });
    expect(h).not.toContain('読み取り');
    expect(h).not.toContain('見えるかも');
  });
});
