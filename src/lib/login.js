// Username/password sign-in for test accounts (made by tools/create-test-users.mjs).
// A username becomes an email on a fake domain: "aiden" -> aiden@polycards.test

export const TEST_EMAIL_DOMAIN = 'polycards.test';
export const LOGIN_FAILED_MESSAGE = 'ユーザー名かパスワードが違います';
// Shown on the login screen when the sign-in was lost or ran out (sessionWatch.js).
export const SESSION_EXPIRED_MESSAGE = 'ログインの期限が切れました。もう一度ログインしてください。';

// Google sign-in that came back with an error (Supabase sends the student back to the site with
// error / error_code / error_description in the address). The login screen shows one of these
// as a notice above the Google button. The login screen is always Japanese, so the text lives here.
export const OAUTH_NOTICES = {
  // "OAuth state not found or expired" / "OAuth state has expired": the sign-in page was left open
  // too long (over about 15 minutes), or the student went back to Google's account page after
  // signing in and chose the account again (seen in the logs on 2026-11-04 / 05).
  expired: {
    title: 'ログインの時間が切れました',
    body: 'ログインの画面を長く開いたままにしたか、前の画面にもどったためです。下の「Sign In with Google」をもう一度おしてください。',
  },
  // The student pressed キャンセル on Google's page.
  cancelled: {
    title: 'ログインがキャンセルされました',
    body: 'もう一度ためすときは、下の「Sign In with Google」をおしてください。',
  },
  other: {
    title: 'ログインできませんでした',
    body: 'もう一度「Sign In with Google」をおしてください。何回やってもできないときは、先生に知らせてください。',
  },
};

const OAUTH_ERROR_KEYS = ['error', 'error_code', 'error_description'];
const STATE_ERROR_CODES = ['bad_oauth_state', 'bad_oauth_callback', 'flow_state_expired', 'flow_state_not_found'];

// Both the query (?error=…) and the hash (#error=…), because Supabase may use either.
function urlParams(href) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  return { url, query: url.searchParams, hash };
}

// Which notice a sign-in error in the address needs: 'expired' | 'cancelled' | 'other', or null
// when the address has no sign-in error.
export function oauthErrorFromUrl(href) {
  let parts;
  try { parts = urlParams(href); } catch { return null; }
  const get = (key) => parts.query.get(key) ?? parts.hash.get(key);
  const error = get('error');
  const code = get('error_code');
  const description = get('error_description');
  if (!error && !code && !description) return null;
  if (STATE_ERROR_CODES.includes(code) || /oauth state|flow state/i.test(description ?? '')) return 'expired';
  if (error === 'access_denied') return 'cancelled';
  return 'other';
}

// The same address without the sign-in error, so a reload doesn't show the notice again.
// Everything else (path, other parameters) is kept.
export function cleanOAuthErrorUrl(href) {
  const { url, query, hash } = urlParams(href);
  for (const key of OAUTH_ERROR_KEYS) { query.delete(key); hash.delete(key); }
  const rest = hash.toString();
  url.hash = rest ? `#${rest}` : '';
  return url.pathname + url.search + url.hash;
}

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
