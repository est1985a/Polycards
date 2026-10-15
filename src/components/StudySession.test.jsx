// Tests for the answer area under the study card. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerArea } from './StudySession';

const NOTE = 'まだでも大丈夫！すぐにまた出てきます';
const render = (props) => renderToStaticMarkup(
  <AnswerArea revealed={false} onReveal={() => {}} onAnswer={() => {}} answerSize={{ minHeight: 52 }} {...props} />
);

describe('AnswerArea', () => {
  it('shows only 答えを見る before the card is flipped', () => {
    const html = render();
    expect(html).toContain('答えを見る');
    expect(html).not.toContain(NOTE);
  });

  it('shows the answer buttons and the reassuring note after revealing', () => {
    const html = render({ revealed: true });
    expect(html).toContain('まだ');
    expect(html).toContain('わかった');
    expect(html).toContain(NOTE);
    expect(html).not.toContain('答えを見る');
  });
});
