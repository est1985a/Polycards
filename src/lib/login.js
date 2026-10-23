// Username/password sign-in for test accounts (made by tools/create-test-users.mjs).
// A username becomes an email on a fake domain: "aiden" -> aiden@polycards.test

export const TEST_EMAIL_DOMAIN = 'polycards.test';
export const LOGIN_FAILED_MESSAGE = 'ユーザー名かパスワードが違います';

// Trimmed and lowercased; the test domain is added unless it is already a full email.
export function testLoginEmail(username) {
  const name = String(username ?? '').trim().toLowerCase();
  return name.includes('@') ? name : `${name}@${TEST_EMAIL_DOMAIN}`;
}

// Name shown in the account menu: the username of a test account, otherwise the Google name,
// otherwise the email.
export function accountName(user) {
  const m = user?.user_metadata || {};
  return m.username || m.full_name || m.name || user?.email || "?";
}
