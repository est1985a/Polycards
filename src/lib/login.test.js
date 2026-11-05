// Tests for turning a test-account username into its email. Run with: npm test
import { describe, it, expect } from 'vitest';
import { testLoginEmail, oauthErrorFromUrl, cleanOAuthErrorUrl, OAUTH_NOTICES } from './login';

describe('testLoginEmail', () => {
  it('adds the test domain to a plain username', () => {
    expect(testLoginEmail('aiden')).toBe('aiden@polycards.test');
  });

  it('trims spaces and lowercases', () => {
    expect(testLoginEmail('  Aiden ')).toBe('aiden@polycards.test');
    expect(testLoginEmail('TEST1')).toBe('test1@polycards.test');
  });

  it('keeps a full email as it is (just tidied)', () => {
    expect(testLoginEmail(' Test1@Example.com ')).toBe('test1@example.com');
  });
});

describe('oauthErrorFromUrl', () => {
  it('finds no error in a normal address', () => {
    expect(oauthErrorFromUrl('https://www.polyvocards.com/')).toBe(null);
    expect(oauthErrorFromUrl('https://www.polyvocards.com/#access_token=abc&type=bearer')).toBe(null);
  });

  it('reads the expired state error from the query or the hash', () => {
    expect(oauthErrorFromUrl('https://www.polyvocards.com/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+not+found+or+expired')).toBe('expired');
    expect(oauthErrorFromUrl('https://www.polyvocards.com/#error=invalid_request&error_code=bad_oauth_state&error_description=OAuth%20state%20has%20expired')).toBe('expired');
    // No code, only the description
    expect(oauthErrorFromUrl('https://www.polyvocards.com/?error_description=OAuth+state+has+expired')).toBe('expired');
  });

  it('tells a cancelled sign-in apart', () => {
    expect(oauthErrorFromUrl('https://www.polyvocards.com/?error=access_denied&error_description=')).toBe('cancelled');
  });

  it('anything else is "other"', () => {
    expect(oauthErrorFromUrl('https://www.polyvocards.com/#error=server_error&error_description=Database+error')).toBe('other');
  });

  it('every kind has a notice', () => {
    for (const kind of ['expired', 'cancelled', 'other']) {
      expect(OAUTH_NOTICES[kind].title).toBeTruthy();
      expect(OAUTH_NOTICES[kind].body).toBeTruthy();
    }
  });
});

describe('cleanOAuthErrorUrl', () => {
  it('removes the error from the query and the hash and keeps the rest', () => {
    expect(cleanOAuthErrorUrl('https://www.polyvocards.com/?error=invalid_request&error_code=bad_oauth_state&error_description=x')).toBe('/');
    expect(cleanOAuthErrorUrl('https://www.polyvocards.com/?theme=galaxy&error=access_denied#error=access_denied&error_description=x')).toBe('/?theme=galaxy');
    expect(cleanOAuthErrorUrl('https://www.polyvocards.com/hw-test?debugpen=1#error=x&foo=1')).toBe('/hw-test?debugpen=1#foo=1');
  });
});
