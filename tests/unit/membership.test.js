import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// One Supabase project and one login are shared with other apps. Language Dash lives in its own schema, and a login is a
// Language Dash member only after the player says so. Until then every backend feature stays off, exactly as for a guest.

let calls;
let user;
let member;          // what my_membership says
let joinReply;
let createArgs;
let events;
let channelArgs;
let signInReply;
let rpcOverride;

function builder(table) {
  const b = {
    select() { return b; }, eq() { return b; }, order() { return b; }, limit() { return b; }, insert() { calls.push('from:' + table); return b; }, upsert() { return b; }, delete() { return b; }, in() { return b; }, or() { return b; },
    maybeSingle() { return b; }, single() { return b; },
    then(ok) { calls.push('from:' + table); return Promise.resolve({ data: [], error: null }).then(ok); }
  };
  return b;
}

function fakeClient() {
  return {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: user ? { user } : null } }),
      signInWithPassword: async () => signInReply(),
      signOut: async () => ({}),
      signInAnonymously: async () => ({ data: { session: { user: { id: 'anon', is_anonymous: true } } } })
    },
    rpc: (name, args) => {
      calls.push('rpc:' + name);
      if (rpcOverride) { const r = rpcOverride(name, args); if (r) return Promise.resolve(r); }
      if (name === 'my_membership') return Promise.resolve({ data: member, error: null });
      if (name === 'join_language_dash') return Promise.resolve(joinReply());
      return Promise.resolve({ data: null, error: null });
    },
    from: (t) => builder(t),
    functions: { invoke: async () => ({ data: { ok: true }, error: null }) },
    channel: (name) => { const ch = { on(kind, filter) { channelArgs.push([name, kind, filter]); return ch; }, subscribe() { return ch; } }; return ch; }
  };
}

async function boot() {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  window.supabase = { createClient: (url, key, opts) => { createArgs = [url, key, opts]; return fakeClient(); } };
  const { leaderboard } = await import('../../js/leaderboard.js');
  leaderboard.onAuthEvent((e) => events.push(e));
  await leaderboard.init();
  return leaderboard;
}
const tick = () => new Promise((r) => setTimeout(r, 5));

beforeEach(() => {
  calls = []; events = []; channelArgs = []; rpcOverride = null;
  user = { id: 'u1', email: 'a@example.com', is_anonymous: false };
  member = { member: false, joined_at: null };
  joinReply = () => ({ data: { member: true, joined_at: '2026-11-22T10:00:00Z' }, error: null });
  signInReply = () => ({ data: { session: { user } }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); delete window.supabase; });

describe('the client talks to the language_dash schema, with its own session key', () => {
  it('creates the client with db.schema and auth.storageKey', async () => {
    await boot();
    expect(createArgs[2]).toMatchObject({ db: { schema: 'language_dash' }, auth: { storageKey: 'langdash-auth' } });
  });

  it('listens for realtime invites in the language_dash schema', async () => {
    member = { member: true, joined_at: 'x' };
    const lb = await boot();
    lb.subscribeToInvites(() => {});
    expect(channelArgs[0][2]).toMatchObject({ schema: 'language_dash', table: 'match_invites' });
  });
});

describe('a signed-in login that is not a member', () => {
  it('is asked once, on start-up, and every backend feature stays off', async () => {
    const lb = await boot();
    expect(calls.filter((c) => c === 'rpc:my_membership')).toHaveLength(1);
    expect(lb.isSignedIn()).toBe(true);
    expect(lb.isMember()).toBe(false);
    expect(lb.isAuthenticated()).toBe(false);
    expect(lb.getStatus()).toMatchObject({ signedIn: true, member: false, authenticated: false, membershipKnown: true, email: 'a@example.com' });
    calls.length = 0;
    const results = await Promise.all([
      lb.submitVerifiedScore({ runId: 'r1', correct: 1, wrong: 0 }), lb.ensureProfile({ playerName: 'A' }), lb.sendFriendRequest('u2'),
      lb.pullSave(), lb.pushSave({}, 1, null), lb.getMyPro(), lb.getFeed(), lb.getMyGroups(), lb.subscribeToInvites(() => {})
    ]);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(false);
    expect(calls.filter((c) => c.startsWith('from:') || (c.startsWith('rpc:') && c !== 'rpc:my_membership'))).toEqual([]);   // nothing was sent to Language Dash tables or functions
    expect(channelArgs).toEqual([]);
  });

  it('creates nothing by itself: join_language_dash is never called unless the player chooses it', async () => {
    await boot();
    await tick();
    expect(calls).not.toContain('rpc:join_language_dash');
  });

  it('becomes a member only through joinLanguageDash, which turns the features on and announces it', async () => {
    const lb = await boot();
    const res = await lb.joinLanguageDash();
    expect(res).toEqual({ success: true, error: null });
    expect(calls).toContain('rpc:join_language_dash');
    expect(lb.isMember()).toBe(true);
    expect(lb.isAuthenticated()).toBe(true);
    expect(lb.getStatus().joinedAt).toBe('2026-11-22T10:00:00Z');
    await tick();
    expect(events).toContain('SIGNED_IN');   // (cloud save and friends start)
    calls.length = 0;
    await lb.ensureProfile({ playerName: 'A' });
    expect(calls).toContain('rpc:upsert_player_profile');
  });

  it('keeps everything off when joining fails', async () => {
    joinReply = () => ({ data: null, error: { message: 'boom' } });
    const lb = await boot();
    expect((await lb.joinLanguageDash())).toMatchObject({ success: false, error: 'boom' });
    expect(lb.isMember()).toBe(false);
  });
});

describe('an existing member', () => {
  it('is recognised on start-up with no prompt', async () => {
    member = { member: true, joined_at: '2026-10-01T00:00:00Z' };
    const lb = await boot();
    expect(lb.isMember()).toBe(true);
    expect(lb.isAuthenticated()).toBe(true);
    expect(lb.getStatus()).toMatchObject({ member: true, authenticated: true, joinedAt: '2026-10-01T00:00:00Z' });
  });

  it('is checked right after a password sign-in', async () => {
    user = null;
    member = { member: true, joined_at: 'x' };
    const lb = await boot();
    expect(lb.isMember()).toBe(false);
    calls.length = 0;
    const u = { id: 'u7', email: 'b@example.com', is_anonymous: false };
    signInReply = () => ({ data: { session: { user: u } }, error: null });
    const res = await lb.signIn('b@example.com', 'password1');
    expect(res).toMatchObject({ success: true, member: true });
    expect(calls).toContain('rpc:my_membership');
    expect(lb.isMember()).toBe(true);
  });

  it('a membership answer never carries over to a different login', async () => {
    member = { member: true, joined_at: 'x' };
    const lb = await boot();
    expect(lb.isMember()).toBe(true);
    member = { member: false, joined_at: null };
    const u = { id: 'u9', email: 'c@example.com', is_anonymous: false };
    signInReply = () => ({ data: { session: { user: u } }, error: null });
    const res = await lb.signIn('c@example.com', 'password1');
    expect(res.member).toBe(false);
    expect(lb.isMember()).toBe(false);
  });
});

describe('guests', () => {
  it('are never asked about membership and are never offered to join', async () => {
    user = { id: 'g1', email: '', is_anonymous: true };
    const lb = await boot();
    expect(calls).not.toContain('rpc:my_membership');
    expect(lb.isMember()).toBe(false);
    expect((await lb.joinLanguageDash()).success).toBe(false);
    expect(calls).not.toContain('rpc:join_language_dash');
  });
});

describe('not_a_member from the server', () => {
  it('re-checks membership, switches the features off and tells the account screen', async () => {
    member = { member: true, joined_at: 'x' };
    const lb = await boot();
    expect(lb.isMember()).toBe(true);
    member = { member: false, joined_at: null };   // (the account was deleted elsewhere)
    rpcOverride = (name) => (name === 'upsert_player_profile' ? { data: null, error: { code: '42501', message: 'not_a_member' } } : null);
    calls.length = 0;
    const res = await lb.ensureProfile({ playerName: 'A' });
    expect(res.success).toBe(false);
    await tick();
    expect(calls).toContain('rpc:my_membership');   // re-checked
    expect(lb.isMember()).toBe(false);
    expect(events).toContain('MEMBERSHIP_REQUIRED');
  });
});

describe('the account screen', () => {
  let body;
  let toasts;
  let rerenders;
  beforeEach(() => { document.body.innerHTML = '<div id="b"></div>'; body = document.getElementById('b'); toasts = []; rerenders = 0; });

  async function render(lb) {
    const { renderAccountPanel } = await import('../../js/accountui.js');
    body.innerHTML = '';
    renderAccountPanel(body, { leaderboard: lb, cloudSync: null, toast: (m) => toasts.push(m), rerender: () => { rerenders++; } });
  }

  it('shows a deliberate "Create your Language Dash account" step, with the explanation and a guest option', async () => {
    const lb = await boot();
    await render(lb);
    const step = body.querySelector('[data-join-step]');
    expect(step).toBeTruthy();
    expect(step.textContent).toContain('Create your Language Dash account with a@example.com');
    expect(step.textContent).toContain('You are signed in with a login that other apps may also use. Your Language Dash data, progress and subscription are separate.');
    expect(step.querySelector('[data-join]').className).toContain('btn-primary');
    expect(step.querySelector('[data-join-later]').textContent).toBe('Not now, keep playing as a guest');
    expect(body.textContent).not.toMatch(/Sync now|Change password/);   // (no account features until it is a member)
    expect(calls).not.toContain('rpc:join_language_dash');
  });

  it('the primary button calls join_language_dash; "Not now" calls nothing and keeps features off', async () => {
    const lb = await boot();
    await render(lb);
    body.querySelector('[data-join-later]').click();
    await tick();
    expect(calls).not.toContain('rpc:join_language_dash');
    expect(lb.isMember()).toBe(false);
    await render(lb);
    expect(body.querySelector('[data-join-later]')).toBeNull();                 // (it was answered)
    expect(body.textContent).toMatch(/guest for now/);
    body.querySelector('[data-join]').click();
    await tick();
    expect(calls).toContain('rpc:join_language_dash');
    expect(lb.isMember()).toBe(true);
    expect(toasts.join(' ')).toMatch(/Language Dash account is ready/);
    await render(lb);
    expect(body.querySelector('[data-join-step]')).toBeNull();
    expect(body.textContent).toMatch(/Signed in as a@example.com/);
  });

  it('offers the two removal actions apart from each other', async () => {
    member = { member: true, joined_at: 'x' };
    const lb = await boot();
    await render(lb);
    const del = body.querySelector('[data-delete-ld]');
    const gone = body.querySelector('[data-remove-signin]');
    expect(del.textContent).toBe('Delete my Language Dash account');
    expect(gone.textContent).toBe('Remove my sign-in (all apps)');
    expect(body.textContent).toMatch(/keeps your login/);
    // a non-member can still remove the login, but has no Language Dash account to delete
    member = { member: false, joined_at: null };
    const lb2 = await boot();
    await render(lb2);
    expect(body.querySelector('[data-delete-ld]')).toBeNull();
    expect(body.querySelector('[data-remove-signin]')).toBeTruthy();
  });

  it('"Delete my Language Dash account" asks first, and does nothing when declined', async () => {
    member = { member: true, joined_at: 'x' };
    const lb = await boot();
    await render(lb);
    body.querySelector('[data-delete-ld]').click();
    await tick();
    expect(document.querySelector('[data-confirm-dialog]')).toBeTruthy();   // an in-page dialog, not the browser's confirm()
    document.querySelector('[data-confirm-no]').click();
    await tick(); await tick();
    expect(calls).not.toContain('rpc:delete_my_ld_data');
    body.querySelector('[data-delete-ld]').click();
    await tick();
    document.querySelector('[data-confirm-yes]').click();
    await tick(); await tick(); await tick();
    expect(calls).toContain('rpc:delete_my_ld_data');
    expect(toasts.join(' ')).toMatch(/login was kept/);
  });

  it('"Remove my sign-in" only goes ahead after the exact phrase is typed', async () => {
    member = { member: true, joined_at: 'x' };
    const lb = await boot();
    const spy = vi.spyOn(lb, 'removeSignIn').mockResolvedValue({ success: true, error: null });
    await render(lb);
    body.querySelector('[data-remove-signin]').click();
    await tick();
    const dialog = document.querySelector('[data-remove-signin-dialog]');
    expect(dialog.textContent).toMatch(/used by every app/);
    expect(dialog.textContent).toMatch(/may be deleted/);
    const input = dialog.querySelector('[data-confirm-input]');
    const go = dialog.querySelector('[data-confirm-go]');
    expect(go.disabled).toBe(true);
    input.value = 'remove my sign-in'; input.dispatchEvent(new Event('input'));
    expect(go.disabled).toBe(true);
    input.value = 'REMOVE MY SIGN-IN'; input.dispatchEvent(new Event('input'));
    expect(go.disabled).toBe(false);
    go.click();
    await tick(); await tick();
    expect(spy).toHaveBeenCalledWith('REMOVE MY SIGN-IN');
    expect(document.querySelector('[data-remove-signin-dialog]')).toBeNull();
    // cancelling calls nothing
    spy.mockClear();
    body.querySelector('[data-remove-signin]').click();
    await tick();
    document.querySelector('[data-confirm-cancel]').click();
    await tick();
    expect(spy).not.toHaveBeenCalled();
  });
});
