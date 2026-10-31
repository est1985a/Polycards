// Tests for the 自動再生 switch in the review's top row. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AutoPlayToggle from './AutoPlayToggle';
import { setLang } from '../i18n';

const render = (props) => renderToStaticMarkup(<AutoPlayToggle onChange={() => {}} {...props} />);

describe('AutoPlayToggle', () => {
  afterEach(() => setLang('ja'));

  it('a switch named 自動再生, on or off', () => {
    expect(render({ on: true })).toMatch(/role="switch" aria-checked="true" aria-label="自動再生"/);
    expect(render({ on: false })).toMatch(/role="switch" aria-checked="false" aria-label="自動再生"/);
  });

  it('sound waves when on, a slash when off', () => {
    expect(render({ on: true })).toContain('M15.5 9a4 4 0 0 1 0 6');
    expect(render({ on: false })).toContain('M16 9.5l5 5M21 9.5l-5 5');
    expect(render({ on: false })).not.toContain('M15.5 9a4 4 0 0 1 0 6');
  });

  it('44 px round button', () => {
    expect(render()).toContain('width:44px;height:44px');
  });

  it('English: Auto-play', () => {
    setLang('en');
    expect(render()).toContain('aria-label="Auto-play"');
  });
});
