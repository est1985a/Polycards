// Tests for the sign-in screen and its test-account login form. Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LoginScreen from './LoginScreen';

const noop = () => {};

describe('LoginScreen', () => {
  it('keeps Sign In with Google as the main button', () => {
    const html = renderToStaticMarkup(<LoginScreen onGoogleLogin={noop} onPasswordLogin={noop} />);
    expect(html).toContain('Sign In with Google');
    expect(html.indexOf('Sign In with Google')).toBeLessThan(html.indexOf('テスト用ログイン'));
  });

  it('starts with the test login collapsed', () => {
    const html = renderToStaticMarkup(<LoginScreen onGoogleLogin={noop} onPasswordLogin={noop} />);
    expect(html).toContain('テスト用ログイン');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('type="password"');
  });

  it('shows the username and password form when opened', () => {
    const html = renderToStaticMarkup(<LoginScreen onGoogleLogin={noop} onPasswordLogin={noop} initialOpen />);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('ユーザー名');
    expect(html).toContain('パスワード');
    expect(html).toContain('type="password"');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>ログイン<\/button>/);
  });

  it('turns off auto-capitalize, auto-correct and spell check on both inputs', () => {
    const html = renderToStaticMarkup(<LoginScreen onGoogleLogin={noop} onPasswordLogin={noop} initialOpen />);
    const inputs = html.match(/<input[^>]*>/g);
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input).toContain('autoCapitalize="off"');
      expect(input).toContain('autoCorrect="off"');
      expect(input).toContain('spellCheck="false"');
    }
  });

  it('disables ログイン until something is typed', () => {
    const html = renderToStaticMarkup(<LoginScreen onGoogleLogin={noop} onPasswordLogin={noop} initialOpen />);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  });

  it('shows the error message', () => {
    const html = renderToStaticMarkup(
      <LoginScreen error="ユーザー名かパスワードが違います" onGoogleLogin={noop} onPasswordLogin={noop} />
    );
    expect(html).toContain('ユーザー名かパスワードが違います');
  });

  it('has no sign-up or password reset', () => {
    const html = renderToStaticMarkup(<LoginScreen onGoogleLogin={noop} onPasswordLogin={noop} initialOpen />);
    expect(html).not.toMatch(/sign up|新規登録|パスワードを忘れ|reset/i);
  });
});
