import { describe, it, expect, vi } from 'vitest';
import { isSessionLostResponse, watchedFetch, onSessionLost, notifySessionLost, createSessionLostHandler, isUnexpectedSignOut } from './sessionWatch';

const REST = 'https://x.supabase.co/rest/v1/rpc/set_my_nickname';

describe('isSessionLostResponse', () => {
  it('is true only for a 401 from the database API', () => {
    expect(isSessionLostResponse(REST, 401)).toBe(true);
    expect(isSessionLostResponse(new URL(REST), 401)).toBe(true);
    expect(isSessionLostResponse({ url: REST }, 401)).toBe(true);
    expect(isSessionLostResponse(REST, 403)).toBe(false);
    expect(isSessionLostResponse(REST, 200)).toBe(false);
    // A wrong password or a dead refresh token is the auth API's own business.
    expect(isSessionLostResponse('https://x.supabase.co/auth/v1/token?grant_type=refresh_token', 401)).toBe(false);
  });
});

describe('watchedFetch', () => {
  it('returns the response unchanged and calls onLost on a 401', async () => {
    const onLost = vi.fn();
    const response = { status: 401 };
    const f = watchedFetch(async () => response, onLost);
    expect(await f(REST)).toBe(response);
    expect(onLost).toHaveBeenCalledTimes(1);
    await f('https://x.supabase.co/rest/v1/user_cards', {});
    expect(onLost).toHaveBeenCalledTimes(2);
  });

  it('stays quiet on other answers, and a throwing listener never breaks the request', async () => {
    const quiet = vi.fn();
    await watchedFetch(async () => ({ status: 200 }), quiet)(REST);
    expect(quiet).not.toHaveBeenCalled();
    const response = await watchedFetch(async () => ({ status: 401 }), () => { throw new Error('x'); })(REST);
    expect(response.status).toBe(401);
  });
});

describe('onSessionLost', () => {
  it('tells every listener until it unsubscribes', () => {
    const a = vi.fn();
    const stop = onSessionLost(a);
    notifySessionLost();
    stop();
    notifySessionLost();
    expect(a).toHaveBeenCalledTimes(1);
  });
});

function fakes({ session, refreshed }) {
  return {
    getSession: vi.fn(async () => ({ data: { session } })),
    refreshSession: vi.fn(async () => refreshed),
    signOutLocal: vi.fn(async () => {}),
    onSignedOut: vi.fn(),
  };
}

describe('createSessionLostHandler', () => {
  it('no stored session (the 2026-11-05 case): signs out on this device and tells App', async () => {
    const f = fakes({ session: null });
    expect(await createSessionLostHandler(f)()).toBe('signed_out');
    expect(f.refreshSession).not.toHaveBeenCalled();
    expect(f.signOutLocal).toHaveBeenCalledTimes(1);
    expect(f.onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('a stored session that refreshes: keeps the student signed in', async () => {
    const f = fakes({ session: { user: {} }, refreshed: { data: { session: { user: {} } }, error: null } });
    expect(await createSessionLostHandler(f)()).toBe('kept');
    expect(f.signOutLocal).not.toHaveBeenCalled();
    expect(f.onSignedOut).not.toHaveBeenCalled();
  });

  it('a stored session whose refresh fails: signs out', async () => {
    const f = fakes({ session: { user: {} }, refreshed: { data: { session: null }, error: { message: 'refresh_token_not_found' } } });
    expect(await createSessionLostHandler(f)()).toBe('signed_out');
    expect(f.onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('a burst of 401s runs it once', async () => {
    const f = fakes({ session: null });
    const handle = createSessionLostHandler(f);
    await Promise.all([handle(), handle(), handle(), handle()]);
    expect(f.getSession).toHaveBeenCalledTimes(1);
    expect(f.onSignedOut).toHaveBeenCalledTimes(1);
  });

  it('a failing getSession still ends signed out', async () => {
    const f = fakes({ session: null });
    f.getSession = vi.fn(async () => { throw new Error('storage blocked'); });
    expect(await createSessionLostHandler(f)()).toBe('signed_out');
  });
});

describe('isUnexpectedSignOut', () => {
  it('is true only for a SIGNED_OUT the student did not ask for', () => {
    expect(isUnexpectedSignOut({ event: 'SIGNED_OUT', wasSignedIn: true, userChoseLogout: false })).toBe(true);
    expect(isUnexpectedSignOut({ event: 'SIGNED_OUT', wasSignedIn: true, userChoseLogout: true })).toBe(false);
    expect(isUnexpectedSignOut({ event: 'SIGNED_OUT', wasSignedIn: false, userChoseLogout: false })).toBe(false);
    expect(isUnexpectedSignOut({ event: 'TOKEN_REFRESHED', wasSignedIn: true, userChoseLogout: false })).toBe(false);
    expect(isUnexpectedSignOut({ event: 'INITIAL_SESSION', wasSignedIn: false, userChoseLogout: false })).toBe(false);
  });
});
