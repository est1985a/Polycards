// Tests for turning a test-account username into its email. Run with: npm test
import { describe, it, expect } from 'vitest';
import { testLoginEmail } from './login';

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
