import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Two separate, explicit deletions: (a) the Language Dash account (database function; the login stays) and (b) the sign-in
// itself, for every app (the ld-remove-signin function, after a typed confirmation).

let calls;
let fnReply;      // what a function answers: (name, body) => reply
let rpcReply;     // what the database answers to an rpc: (name) => reply
let user;

function fakeClient() {
  return {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: { user } } }),
      signOut: async () => { calls.push('signOut'); return {}; },
      signInAnonymously: async () => { calls.push('signInAnonymously'); return { data: { session: { user: { id: 'anon', is_anonymous: true } } } }; }
    },
    functions: { invoke: async (name, o) => { calls.push('fn:' + name + ':' + (o.body.action || o.body.confirm)); return fnReply(name, o.body); } },
    rpc: async (name) => { calls.push('rpc:' + name); return rpcReply(name); }
  };
}

async function boot() {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  window.supabase = { createClient: () => fakeClient() };
  const { leaderboard } = await import('../../js/leaderboard.js');
  await leaderboard.init();
  return leaderboard;
}

beforeEach(() => {
  calls = [];
  user = { id: 'u1', email: 'a@example.com', is_anonymous: false };
  fnReply = () => ({ data: { ok: true }, error: null });
  rpcReply = (name) => (name === 'my_membership' || name === 'join_language_dash' ? { data: { member: true, joined_at: '2026-11-01T00:00:00Z' }, error: null } : { data: { profiles: 1 }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); delete window.supabase; });

describe('delete my Language Dash account (the login stays)', () => {
  it('cancels a billing subscription, deletes only the Language Dash data, and keeps the login', async () => {
    const lb = await boot();
    expect(lb.isMember()).toBe(true);
    const res = await lb.deleteLanguageDashAccount();
    expect(res.success).toBe(true);
    expect(calls.filter((c) => c.startsWith('fn:') || (c.startsWith('rpc:') && c !== 'rpc:my_membership'))).toEqual(['fn:ld-pro-checkout:cancel_subscription', 'rpc:delete_my_ld_data']);
    expect(calls).not.toContain('signOut');                       // (the login is kept)
    expect(calls).not.toContain('signInAnonymously');
    expect(calls.some((c) => /ld-remove-signin|delete_my_account/.test(c))).toBe(false);
    expect(lb.isMember()).toBe(false);                            // (back to a signed-in non-member: every backend feature is off)
    expect(lb.isSignedIn()).toBe(true);
  });

  it('deletes nothing when the subscription could not be cancelled', async () => {
    fnReply = () => ({ data: null, error: { message: 'edge fn failed', context: { json: async () => ({ error: 'Could not cancel your subscription, so nothing was deleted. Please try again.' }) } } });
    const lb = await boot();
    const res = await lb.deleteLanguageDashAccount();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/nothing was deleted/i);
    expect(calls).not.toContain('rpc:delete_my_ld_data');
    expect(lb.isMember()).toBe(true);
  });

  it('still deletes when web payments are not set up on the project', async () => {
    fnReply = () => ({ data: null, error: { message: 'Requested function was not found' } });
    const lb = await boot();
    expect((await lb.deleteLanguageDashAccount()).success).toBe(true);
    expect(calls).toContain('rpc:delete_my_ld_data');
  });

  it('shows the database\'s refusal', async () => {
    rpcReply = (name) => (name === 'my_membership' ? { data: { member: true }, error: null } : { data: null, error: { message: 'Could not delete.' } });
    const lb = await boot();
    const res = await lb.deleteLanguageDashAccount();
    expect(res).toMatchObject({ success: false, error: 'Could not delete.' });
    expect(lb.isMember()).toBe(true);
  });
});

describe('remove my sign-in (all apps)', () => {
  it('needs the exact typed confirmation before it calls anything', async () => {
    const lb = await boot();
    for (const bad of ['', 'remove my sign-in', 'REMOVE', undefined]) {
      expect((await lb.removeSignIn(bad)).success).toBe(false);
    }
    expect(calls.some((c) => c.startsWith('fn:'))).toBe(false);
  });

  it('calls ld-remove-signin with the confirmation, then signs out and stays signed out', async () => {
    const lb = await boot();
    const res = await lb.removeSignIn('REMOVE MY SIGN-IN');
    expect(res.success).toBe(true);
    expect(calls).toContain('fn:ld-remove-signin:REMOVE MY SIGN-IN');
    expect(calls.some((c) => c.includes('delete_my_ld_data') || c.includes('cancel_subscription'))).toBe(false);   // (the function does all of that on the server)
    expect(calls).toContain('signOut');
    expect(calls).not.toContain('signInAnonymously');
    expect(lb.isMember()).toBe(false);
  });

  it('keeps the player signed in when the server could not remove the sign-in', async () => {
    fnReply = () => ({ data: null, error: { message: 'edge fn failed', context: { json: async () => ({ error: 'Could not cancel your subscription, so nothing was removed. Please try again.' }) } } });
    const lb = await boot();
    const res = await lb.removeSignIn('REMOVE MY SIGN-IN');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/nothing was removed/i);
    expect(calls).not.toContain('signOut');
    expect(lb.isMember()).toBe(true);
  });

  it('is not offered to a guest', async () => {
    user = { id: 'g1', email: '', is_anonymous: true };
    const lb = await boot();
    expect((await lb.removeSignIn('REMOVE MY SIGN-IN')).success).toBe(false);
    expect(calls.some((c) => c.startsWith('fn:'))).toBe(false);
  });
});
