// Notices when the browser has quietly lost its sign-in.
//
// Why (logs, 2026-11-05): a school iPad's stored session vanished while the app still showed the
// student as signed in. Every call then went out with only the public key, the database answered
// 401 (PostgREST error 42501: "permission denied" for the anonymous role), and the nickname form
// showed a technical message the student kept tapping. A signed-in user never gets a 401 from
// /rest/v1/ (a refused right is 403 for them), so a 401 there means "not signed in any more".

// Is this response the sign of a lost or expired sign-in?
export function isSessionLostResponse(url, status) {
  if (status !== 401) return false;
  const text = typeof url === "string" ? url : url?.url ?? String(url ?? "");
  return text.includes("/rest/v1/");
}

// Wraps fetch so every such response calls onLost() (the response itself is returned unchanged,
// so each caller still sees its own error).
export function watchedFetch(fetchImpl, onLost) {
  return async (input, init) => {
    const response = await fetchImpl(input, init);
    if (isSessionLostResponse(input, response?.status)) {
      try { onLost(); } catch { /* a listener problem must never break the request */ }
    }
    return response;
  };
}

// One shared list of listeners (App subscribes once).
const listeners = new Set();
export function onSessionLost(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function notifySessionLost() {
  listeners.forEach((listener) => listener());
}

// What App does when it hears about it. Several calls fail at once (a dashboard load sends ~15),
// so the busy flag makes it run once. getSession / refreshSession / signOutLocal are passed in
// (the Supabase client in the app, fakes in the tests).
// Returns 'kept' (a fresh sign-in is in place, nothing to do) or 'signed_out'.
export function createSessionLostHandler({ getSession, refreshSession, signOutLocal, onSignedOut }) {
  let busy = null;
  return function handle() {
    if (busy) return busy;
    busy = (async () => {
      try {
        const { data } = await getSession();
        if (data?.session) {
          // The stored session looks fine but the server refused it (e.g. the token expired and
          // the refresh was missed): try one real refresh before giving up.
          const refreshed = await refreshSession();
          if (refreshed?.data?.session && !refreshed.error) return "kept";
        }
      } catch { /* treated as signed out */ }
      try { await signOutLocal(); } catch { /* the session is gone anyway */ }
      onSignedOut();
      return "signed_out";
    })().finally(() => { busy = null; });
    return busy;
  };
}

// Supabase signed the browser out by itself (e.g. its background refresh got
// "refresh_token_not_found" / "refresh_token_already_used", logs 2026-11-05): show the
// login screen with the "sign-in expired" message, unless the student pressed ログアウト.
export function isUnexpectedSignOut({ event, wasSignedIn, userChoseLogout }) {
  return event === "SIGNED_OUT" && !!wasSignedIn && !userChoseLogout;
}
