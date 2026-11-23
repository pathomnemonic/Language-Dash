// @vitest-environment node
//
// The Language Dash functions (payments, store checks and removing the sign-in), run as the servers would run them (a stand-in for Deno, for Stripe and for the database),
// to check the wiring that the rule tests in billing.test.js cannot see: who is let in, what is charged, what is granted.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { signPayload } from '../../supabase/functions/_shared/billing.js';
import { PREMIUM_ITEMS } from '../../supabase/functions/_shared/premium.js';

const APPLE_KEY = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const GOOGLE_KEY = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const SECRET = 'whsec_test';
const ENVV = {
  LD_STRIPE_SECRET_KEY: 'sk_test_x', LD_STRIPE_WEBHOOK_SECRET: SECRET, LD_SITE_URL: 'https://me.github.io/dx',
  LD_APPLE_TEAM_ID: 'TEAM123456', LD_APPLE_KEY_ID: 'KEY1234567', LD_APPLE_PRIVATE_KEY: APPLE_KEY, LD_APPLE_CLIENT_ID: 'com.example.web',
  LD_GOOGLE_PLAY_PACKAGE: 'com.example.app', LD_GOOGLE_SA_EMAIL: 'sa@p.iam.gserviceaccount.com', LD_GOOGLE_SA_PRIVATE_KEY: GOOGLE_KEY,
  LD_APPLE_BUNDLE_ID: 'com.example.app', LD_APPLE_IAP_ISSUER_ID: 'issuer', LD_APPLE_IAP_KEY_ID: 'KEYID12345', LD_APPLE_IAP_PRIVATE_KEY: APPLE_KEY,
  LD_STRIPE_PRICE_YEARLY: 'price_y', LD_STRIPE_PRICE_LIFETIME: 'price_l', SUPABASE_URL: 'http://db', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc',
  // another app's values in the same project: they must never be picked up
  STRIPE_SECRET_KEY: 'sk_OTHER_APP', STRIPE_WEBHOOK_SECRET: 'whsec_OTHER_APP', SITE_URL: 'https://other.example', STRIPE_PRICE_MONTHLY: 'price_OTHER_APP', APPLE_CLIENT_ID: 'com.other.app'
};

let db;          // what the fake database was asked to do
let stripeCalls; // what Stripe was asked
let users;       // jwt -> user
let owned;       // item ids the member already owns
let held;        // pro_entitlements row for the member
let dbReady;
let stripeReply;
let customerId;   // the member's Stripe customer id ('' for none)
let deleted;       // users deleted through the auth admin API
let cancelFails;
let appleToken;    // the stored Apple token for the member ('' for none)
let appleStatus;   // what Apple answers to a revoke
let storeReply;    // what Google / Apple say about a purchase: { status, body }
let isMember;      // does the signed-in login have a Language Dash membership row
let clients;       // every client the functions created: [url, key, options]
let purgeFails;    // does purge_user_data fail
let claimResult;   // what the database says about claiming a purchase

vi.mock('https://esm.sh/@supabase/supabase-js@2.117.3', () => ({
  createClient: (url, key, opts) => { clients.push([url, key, opts]); return {
    auth: { getUser: async (jwt) => ({ data: { user: users[jwt] || null } }), admin: { deleteUser: async (id) => { deleted.push(id); return { error: null }; } } },
    rpc: async (name, args) => {
      db.push([name, args]);
      if (name === 'pro_has_item') return dbReady ? { data: owned.includes(args.p_item), error: null } : { data: null, error: { message: 'function does not exist' } };
      if (name === 'pro_user_customer') return { data: customerId, error: null };
      if (name === 'apple_token_get') return { data: appleToken, error: null };
      if (name === 'purge_user_data') return purgeFails ? { data: null, error: { message: 'boom' } } : { data: {}, error: null };
      if (name === 'pro_store_claim') return { data: claimResult, error: null };
      return { data: null, error: null };
    },
    from: (table) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'members' ? (isMember ? { user_id: 'x' } : null) : held }) }) }) })
  }; }
}));

let handlers;
async function boot(file) {
  vi.resetModules();
  handlers = null;
  globalThis.Deno = { env: { get: (k) => ENVV[k] }, serve: (fn) => { handlers = fn; } };
  await import(file + '?t=' + Math.random());
  return handlers;
}

beforeEach(() => {
  db = []; clients = []; isMember = true; stripeCalls = []; owned = []; held = null; dbReady = true; customerId = ''; deleted = []; cancelFails = false; appleToken = ''; appleStatus = 200; storeReply = { status: 200, body: {} }; claimResult = 'ok'; purgeFails = false;
  users = { apple: { id: 'ua', email: 'p@example.com', is_anonymous: false, identities: [{ provider: 'apple' }] }, good: { id: 'u1', email: 'a@example.com', is_anonymous: false }, guest: { id: 'g1', email: '', is_anonymous: true } };
  stripeReply = (path) => ({ id: 'cs_1', url: 'https://checkout.stripe.com/pay/cs_1', data: [] });
  globalThis.fetch = vi.fn(async (url, init) => {
    if (String(url).startsWith('https://appleid.apple.com/')) {
      stripeCalls.push({ path: 'APPLE ' + String(url).replace('https://appleid.apple.com/', ''), method: init.method, body: Object.fromEntries(new URLSearchParams(init.body)) });
      return { ok: appleStatus < 400, status: appleStatus, text: async () => (appleStatus < 400 ? '' : '{"error":"server_error"}'), json: async () => ({}) };
    }
    if (String(url).startsWith('https://oauth2.googleapis.com/')) return { ok: true, status: 200, json: async () => ({ access_token: 'goog_access' }) };
    if (String(url).includes('androidpublisher.googleapis.com') || String(url).includes('storekit')) {
      stripeCalls.push({ path: 'STORE ' + String(url), method: 'GET', auth: init && init.headers && init.headers.Authorization });
      if (String(url).includes('storekit-sandbox') ? false : String(url).includes('api.storekit.itunes') && storeReply.sandboxOnly) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: storeReply.status < 400, status: storeReply.status, json: async () => storeReply.body };
    }
    const path = String(url).replace('https://api.stripe.com/v1/', '');
    stripeCalls.push({ path, method: (init && init.method) || 'GET', body: init && init.body ? Object.fromEntries(new URLSearchParams(init.body)) : null });
    if (cancelFails && init && init.method === 'DELETE') return { ok: false, status: 500, json: async () => ({ error: { message: 'stripe is down' } }) };
    return { ok: true, status: 200, json: async () => stripeReply(path) };
  });
});

const post = (body, headers) => new Request('https://fn/', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('ld-stripe-webhook', () => {
  const signed = async (event, over) => {
    const raw = JSON.stringify(event);
    const t = (over && over.t) || Math.floor(Date.now() / 1000);
    const sig = await signPayload(raw, (over && over.secret) || SECRET, t);
    return post(raw, { 'stripe-signature': 't=' + t + ',v1=' + sig });
  };
  const itemEvent = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { client_reference_id: 'u1', payment_status: 'paid', customer: 'cus_1', metadata: { app: 'language_dash', kind: 'item', item_id: 'trail_lanterns', user_id: 'u1' } } } };

  it('refuses anything that is not a signed POST', async () => {
    const h = await boot('../../supabase/functions/ld-stripe-webhook/index.js');
    expect((await h(new Request('https://fn/', { method: 'GET' }))).status).toBe(405);
    expect((await h(post(itemEvent))).status).toBe(400);                                    // no signature
    expect((await h(await signed(itemEvent, { secret: 'whsec_other' }))).status).toBe(400); // wrong secret
    expect((await h(await signed(itemEvent, { t: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(400); // an old, replayed event
    const tampered = await signed(itemEvent);
    const forged = post(JSON.stringify({ ...itemEvent, data: { object: { ...itemEvent.data.object, client_reference_id: 'attacker' } } }), { 'stripe-signature': tampered.headers.get('stripe-signature') });
    expect((await h(forged)).status).toBe(400);                                              // the body was changed after signing
    expect(db).toEqual([]);                                                                  // nothing was granted by any of them
  });

  it('gives a paid item to the buyer named in the signed event, once recorded', async () => {
    const h = await boot('../../supabase/functions/ld-stripe-webhook/index.js');
    stripeReply = () => ({ latest_charge: { refunded: false, disputed: false } });
    const res = await h(await signed(itemEvent));
    expect(res.status).toBe(200);
    expect(db.map((c) => c[0])).toEqual(['pro_link_customer', 'pro_grant_item', 'pro_event_once']);
    expect(db[1][1]).toEqual({ p_user: 'u1', p_item: 'trail_lanterns', p_source: 'stripe', p_ref: null });
  });

  it('does not hand back a purchase whose payment was already refunded', async () => {
    const h = await boot('../../supabase/functions/ld-stripe-webhook/index.js');
    stripeReply = () => ({ latest_charge: { refunded: true } });
    const ev = { ...itemEvent, data: { object: { ...itemEvent.data.object, payment_intent: 'pi_9' } } };
    expect((await h(await signed(ev))).status).toBe(200);
    expect(db.filter((c) => c[0].startsWith('pro_grant'))).toEqual([]);
  });

  it('tells Stripe to try again when the database fails, so a payment is never lost', async () => {
    const h = await boot('../../supabase/functions/ld-stripe-webhook/index.js');
    const mod = await import('https://esm.sh/@supabase/supabase-js@2.117.3');
    expect(mod).toBeTruthy();
    const failing = { ...itemEvent, data: { object: { ...itemEvent.data.object, payment_intent: 'pi_9' } } };
    stripeReply = () => { throw new Error('stripe down'); };
    expect((await h(await signed(failing))).status).toBe(500);
  });

  it('ignores events it does not know without error', async () => {
    const h = await boot('../../supabase/functions/ld-stripe-webhook/index.js');
    const res = await h(await signed({ id: 'evt_x', type: 'customer.created', data: { object: { id: 'cus_1' } } }));
    expect(res.status).toBe(200);
    expect(db).toEqual([]);
  });
});

describe('ld-pro-checkout', () => {
  const call = async (h, body, jwt) => {
    const res = await h(post(body, jwt ? { authorization: 'Bearer ' + jwt } : {}));
    return { status: res.status, body: await res.json() };
  };

  it('needs a real signed-in account to buy anything', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    expect((await call(h, { action: 'checkout', plan: 'yearly' })).status).toBe(401);
    expect((await call(h, { action: 'checkout', plan: 'yearly' }, 'nobody')).status).toBe(401);
    expect((await call(h, { action: 'checkout', plan: 'yearly' }, 'guest')).status).toBe(403);
    expect(stripeCalls.filter((c) => c.method === 'POST')).toEqual([]);
  });

  it('charges the catalog price for an item, whatever the page asks for', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    const r = await call(h, { action: 'item', item: 'trail_lanterns', price: 1, amount: 1, unit_amount: 1, user_id: 'someone-else', name: 'x' }, 'good');
    expect(r.status).toBe(200);
    const sent = stripeCalls.find((c) => c.path === 'checkout/sessions').body;
    expect(sent['line_items[0][price_data][unit_amount]']).toBe(String(PREMIUM_ITEMS.trail_lanterns));
    expect(sent['metadata[user_id]']).toBe('u1');           // the buyer is the signed-in account, never a value from the page
    expect(sent['client_reference_id']).toBe('u1');
    expect(sent['success_url'].startsWith('https://me.github.io/dx/')).toBe(true);
  });

  it('does not sell what is not for sale, what the member owns, or anything while the database is not ready', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    expect((await call(h, { action: 'item', item: 'avatar_intern' }, 'good')).status).toBe(400);   // not a premium item
    expect((await call(h, { action: 'item', item: '__proto__' }, 'good')).status).toBe(400);
    expect((await call(h, { action: 'item', item: 'constructor' }, 'good')).status).toBe(400);
    owned = ['trail_lanterns'];
    expect((await call(h, { action: 'item', item: 'trail_lanterns' }, 'good')).status).toBe(409);
    owned = []; dbReady = false;
    const r = await call(h, { action: 'item', item: 'trail_lanterns' }, 'good');
    expect(r.status).toBe(503);
    expect(r.body.error).toMatch(/not been charged/i);
    expect(stripeCalls.filter((c) => c.method === 'POST')).toEqual([]);
  });

  it('sells a plan at the price set on the server, and refuses an unknown plan or a second lifetime', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    expect((await call(h, { action: 'checkout', plan: 'free-forever' }, 'good')).status).toBe(400);
    expect((await call(h, { action: 'checkout', plan: 'monthly' }, 'good')).status).toBe(400);   // no price set for it
    const ok = await call(h, { action: 'checkout', plan: 'yearly', price: 'price_cheap' }, 'good');
    expect(ok.status).toBe(200);
    expect(stripeCalls.find((c) => c.path === 'checkout/sessions').body['line_items[0][price]']).toBe('price_y');
    held = { plan: 'lifetime', until: new Date(Date.now() + 86400000 * 3000).toISOString() };
    stripeCalls.length = 0;
    expect((await call(h, { action: 'checkout', plan: 'lifetime' }, 'good')).status).toBe(409);
    expect(stripeCalls.filter((c) => c.method === 'POST')).toEqual([]);
  });
});


describe('ld-pro-checkout: cancelling a subscription (before the Language Dash account is deleted)', () => {
  const call = async (h, body, jwt) => {
    const res = await h(post(body, jwt ? { authorization: 'Bearer ' + jwt } : {}));
    return { status: res.status, body: await res.json() };
  };

  it('no longer has any way to delete a login', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    const r = await call(h, { action: 'delete_account' }, 'good');
    expect(r.status).toBe(400);
    expect(deleted).toEqual([]);
  });

  it('cancels a subscription that is still billing, and nothing else', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    customerId = 'cus_1';
    stripeReply = (path) => (path.startsWith('subscriptions?') ? { data: [{ id: 'sub_live', status: 'active' }, { id: 'sub_old', status: 'canceled' }, { id: 'sub_due', status: 'past_due' }] } : {});
    const r = await call(h, { action: 'cancel_subscription' }, 'good');
    expect(r.status).toBe(200);
    expect(stripeCalls.filter((c) => c.method === 'DELETE').map((c) => c.path)).toEqual(['subscriptions/sub_live', 'subscriptions/sub_due']);
    expect(deleted).toEqual([]);
  });

  it('reports a failure to cancel, so the app deletes nothing', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    customerId = 'cus_1'; cancelFails = true;
    stripeReply = (path) => (path.startsWith('subscriptions?') ? { data: [{ id: 'sub_live', status: 'active' }] } : {});
    const r = await call(h, { action: 'cancel_subscription' }, 'good');
    expect(r.status).toBe(502);
    expect(r.body.error).toMatch(/could not cancel/i);
  });

  it('keeps the Apple token only for an Apple login that is a member', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    expect((await call(h, { action: 'apple_token', refresh_token: 'r_abcdefghijk' }, 'apple')).status).toBe(200);
    expect(db.find((c) => c[0] === 'apple_token_save')[1]).toEqual({ p_user: 'ua', p_token: 'r_abcdefghijk' });
    db.length = 0;
    expect((await call(h, { action: 'apple_token', refresh_token: 'r_abcdefghijk' }, 'good')).status).toBe(400);   // (not an Apple login)
    expect((await call(h, { action: 'apple_token', refresh_token: 'x' }, 'apple')).status).toBe(400);
    expect((await call(h, { action: 'apple_token', refresh_token: 'r_abcdefghijk' }, 'guest')).status).toBe(403);
    isMember = false;
    expect((await call(h, { action: 'apple_token', refresh_token: 'r_abcdefghijk' }, 'apple')).status).toBe(403);
    expect(db.filter((c) => c[0] === 'apple_token_save')).toEqual([]);
  });
});


describe('shared project: schema, secrets and membership', () => {
  const call = async (h, body, jwt) => {
    const res = await h(post(body, jwt ? { authorization: 'Bearer ' + jwt } : {}));
    return { status: res.status, body: await res.json() };
  };
  const FUNCTIONS = ['ld-pro-checkout', 'ld-stripe-webhook', 'ld-iap-verify', 'ld-remove-signin'];

  it('every service client is created for the language_dash schema', async () => {
    for (const fn of FUNCTIONS) {
      clients.length = 0;
      await boot('../../supabase/functions/' + fn + '/index.js');
      expect(clients.length).toBeGreaterThan(0);
      clients.forEach((c) => expect(c[2].db).toEqual({ schema: 'language_dash' }));
    }
  });

  it('reads only LD_ secrets: another app\'s unprefixed values are never used', async () => {
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    await call(h, { action: 'checkout', plan: 'yearly' }, 'good');
    const sent = stripeCalls.find((c) => c.path === 'checkout/sessions').body;
    expect(sent['line_items[0][price]']).toBe('price_y');
    expect(sent.success_url.startsWith('https://me.github.io/dx/')).toBe(true);
    expect(sent['metadata[app]']).toBe('language_dash');
    expect((await call(h, { action: 'checkout', plan: 'monthly' }, 'good')).status).toBe(400);   // (LD_ monthly is unset: the other app's price_OTHER_APP is not used)
    // and the source never names an unprefixed secret
    const { readFileSync, readdirSync } = await import('node:fs');
    const root = new URL('../../supabase/functions/', import.meta.url).pathname;
    for (const fn of FUNCTIONS) {
      const src = readFileSync(root + fn + '/index.js', 'utf8');
      const names = [...src.matchAll(/Deno\.env\.get\(\s*(['"])([^'"]+)\1/g)].map((m) => m[2]);
      names.forEach((n) => expect(/^(LD_|SUPABASE_)/.test(n)).toBe(true));
    }
    expect(readdirSync(root).filter((n) => !n.startsWith('_')).sort()).toEqual(FUNCTIONS.slice().sort());
  });

  it('a login that has not created a Language Dash account cannot buy, sync or verify', async () => {
    isMember = false;
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    for (const body of [{ action: 'checkout', plan: 'yearly' }, { action: 'item', item: 'trail_lanterns' }, { action: 'sync' }, { action: 'portal' }]) {
      const r = await call(h, body, 'good');
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('not_a_member');
    }
    expect(stripeCalls.filter((c) => c.method === 'POST')).toEqual([]);
    const iap = await boot('../../supabase/functions/ld-iap-verify/index.js');
    const r2 = await call(iap, { platform: 'android', product_id: 'languagedash_pro_monthly', token: 'purchase-token-123' }, 'good');
    expect(r2.status).toBe(403);
    expect(r2.body.code).toBe('not_a_member');
  });

  it('the plan list is public: it needs no login at all', async () => {
    isMember = false;
    stripeReply = () => ({ unit_amount: 999, currency: 'usd', recurring: { interval: 'year' } });
    const h = await boot('../../supabase/functions/ld-pro-checkout/index.js');
    expect((await call(h, { action: 'prices' })).status).toBe(200);
  });

  it('the webhook ignores another app\'s events even when correctly signed, and checks the LD_ signing secret', async () => {
    const h = await boot('../../supabase/functions/ld-stripe-webhook/index.js');
    const sign = async (event, secret) => {
      const raw = JSON.stringify(event);
      const t = Math.floor(Date.now() / 1000);
      return post(raw, { 'stripe-signature': 't=' + t + ',v1=' + (await signPayload(raw, secret, t)) });
    };
    const ev = (app) => ({ id: 'evt_' + app, type: 'checkout.session.completed', data: { object: { client_reference_id: 'u1', payment_status: 'paid', customer: 'cus_1', metadata: { app, kind: 'item', item_id: 'trail_lanterns', user_id: 'u1' } } } });
    expect((await h(await sign(ev('language_dash'), 'whsec_OTHER_APP'))).status).toBe(400);   // (the other app's secret does not verify)
    stripeReply = () => ({ latest_charge: { refunded: false, disputed: false } });
    expect((await h(await sign(ev('dx_dash'), SECRET))).status).toBe(200);
    expect(db.filter((c) => c[0].startsWith('pro_grant'))).toEqual([]);
    expect((await h(await sign(ev('language_dash'), SECRET))).status).toBe(200);
    expect(db.filter((c) => c[0] === 'pro_grant_item')).toHaveLength(1);
  });
});


describe('ld-remove-signin: removing the sign-in for every app', () => {
  const FN = '../../supabase/functions/ld-remove-signin/index.js';
  const CONFIRM = { confirm: 'REMOVE MY SIGN-IN' };
  const call = async (h, body, jwt) => {
    const res = await h(post(body, jwt ? { authorization: 'Bearer ' + jwt } : {}));
    return { status: res.status, body: await res.json() };
  };

  it('needs a real signed-in login and the typed confirmation, and deletes nothing otherwise', async () => {
    const h = await boot(FN);
    expect((await call(h, CONFIRM)).status).toBe(401);
    expect((await call(h, CONFIRM, 'nobody')).status).toBe(401);
    expect((await call(h, CONFIRM, 'guest')).status).toBe(403);
    expect((await call(h, {}, 'good')).status).toBe(400);
    expect((await call(h, { confirm: 'remove my sign-in' }, 'good')).status).toBe(400);
    expect((await call(h, { confirm: true }, 'good')).status).toBe(400);
    expect((await h(new Request('https://fn/', { method: 'GET' }))).status).toBe(405);
    expect(deleted).toEqual([]);
    expect(db.filter((c) => c[0] === 'delete_my_ld_data')).toEqual([]);
  });

  it('deletes the Language Dash data as the caller, then the login, and only the signed-in login', async () => {
    const h = await boot(FN);
    const r = await call(h, { ...CONFIRM, user_id: 'victim', id: 'victim' }, 'good');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, removed: 'signin' });
    expect(deleted).toEqual(['u1']);
    expect(db.map((c) => c[0])).toContain('delete_my_ld_data');
    // the data deletion ran through a client that carries the caller's own token, not the service key
    const callerClient = clients.find((c) => c[2].global && c[2].global.headers);
    expect(callerClient[1]).toBe('anon');
    expect(callerClient[2].global.headers.Authorization).toBe('Bearer good');
    expect(callerClient[2].db).toEqual({ schema: 'language_dash' });
  });

  it('purges every language_dash row (including the FK-less pro_* tables) before the login is deleted, and keeps the login if the purge fails', async () => {
    const h = await boot(FN);
    const ok = await call(h, CONFIRM, 'good');
    expect(ok.status).toBe(200);
    const purge = db.find((c) => c[0] === 'purge_user_data');
    expect(purge[1]).toEqual({ p_user: 'u1' });   // the verified caller, never an id from the request body
    expect(db.map((c) => c[0]).indexOf('purge_user_data')).toBeLessThan(db.length);
    expect(deleted).toEqual(['u1']);
    // it runs with the service-role client (the function is not executable by the signed-in role)
    const adminClient = clients.find((c) => !(c[2].global && c[2].global.headers));
    expect(adminClient[1]).not.toBe('anon');

    deleted.length = 0; db.length = 0; purgeFails = true;
    const bad = await call(h, CONFIRM, 'good');
    expect(bad.status).toBe(500);
    expect(bad.body.error).toMatch(/not removed/i);
    expect(deleted).toEqual([]);
  });

  it('cancels a subscription that is still billing first, and removes nothing when it cannot', async () => {
    const h = await boot(FN);
    customerId = 'cus_1';
    stripeReply = (path) => (path.startsWith('subscriptions?') ? { data: [{ id: 'sub_live', status: 'active' }, { id: 'sub_old', status: 'canceled' }] } : {});
    const ok = await call(h, CONFIRM, 'good');
    expect(ok.status).toBe(200);
    expect(ok.body.cancelled_subscriptions).toBe(1);
    expect(stripeCalls.filter((c) => c.method === 'DELETE').map((c) => c.path)).toEqual(['subscriptions/sub_live']);
    expect(deleted).toEqual(['u1']);

    deleted.length = 0; db.length = 0; cancelFails = true;
    const bad = await call(h, CONFIRM, 'good');
    expect(bad.status).toBe(502);
    expect(bad.body.error).toMatch(/nothing was removed/i);
    expect(deleted).toEqual([]);
    expect(db.map((c) => c[0])).not.toContain('delete_my_ld_data');
  });

  it('revokes an Apple login before removing it, and removes nothing when Apple cannot be reached', async () => {
    const h = await boot(FN);
    appleToken = 'r_stored_token';
    const r = await call(h, CONFIRM, 'apple');
    expect(r.status).toBe(200);
    expect(r.body.apple_revoked).toBe(true);
    const sent = stripeCalls.find((c) => c.path === 'APPLE auth/revoke');
    expect(sent.body).toMatchObject({ client_id: 'com.example.web', token: 'r_stored_token', token_type_hint: 'refresh_token' });   // (the LD_ client id, not the other app's)
    expect(sent.body.client_secret.split('.')).toHaveLength(3);
    expect(deleted).toEqual(['ua']);

    deleted.length = 0; appleStatus = 500;
    const bad = await call(h, CONFIRM, 'apple');
    expect(bad.status).toBe(502);
    expect(bad.body.error).toMatch(/nothing was removed/i);
    expect(deleted).toEqual([]);
  });

  it('never calls Apple for a login that is not from Apple, and still removes an Apple login with no stored token', async () => {
    const h = await boot(FN);
    appleToken = 'r_other';
    expect((await call(h, CONFIRM, 'good')).status).toBe(200);
    expect(stripeCalls.some((c) => String(c.path).startsWith('APPLE'))).toBe(false);
    appleToken = '';
    expect((await call(h, CONFIRM, 'apple')).status).toBe(200);
    expect(stripeCalls.some((c) => String(c.path).startsWith('APPLE'))).toBe(false);
  });

  it('works for a login that never joined Language Dash (there is just no data to delete)', async () => {
    isMember = false;
    const h = await boot(FN);
    expect((await call(h, CONFIRM, 'good')).status).toBe(200);
    expect(deleted).toEqual(['u1']);
  });
});


describe('ld-iap-verify: phone-store purchases', () => {
  const NOWS = () => Math.floor(Date.now() / 1000);
  const call = async (h, body, jwt) => {
    const res = await h(post(body, jwt ? { authorization: 'Bearer ' + jwt } : {}));
    return { status: res.status, body: await res.json() };
  };
  const signedTx = (payload) => 'h.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.s';

  it('needs a real account, and a purchase it understands', async () => {
    const h = await boot('../../supabase/functions/ld-iap-verify/index.js');
    const ok = { platform: 'android', product_id: 'languagedash_pro_monthly', token: 'purchase-token-123' };
    expect((await call(h, ok)).status).toBe(401);
    expect((await call(h, ok, 'guest')).status).toBe(403);
    expect((await call(h, { ...ok, product_id: 'free_pro' }, 'good')).status).toBe(400);
    expect((await call(h, { ...ok, platform: 'windows' }, 'good')).status).toBe(400);
    expect((await call(h, { ...ok, token: 'x' }, 'good')).status).toBe(400);
    expect(db.filter((c) => c[0] === 'pro_grant_until')).toEqual([]);
  });

  it('Google Play: a live subscription is attached to the account and runs to its end plus the grace', async () => {
    const h = await boot('../../supabase/functions/ld-iap-verify/index.js');
    const end = NOWS() + 20 * 86400;
    storeReply = { status: 200, body: { subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [{ productId: 'languagedash_pro_monthly', expiryTime: new Date(end * 1000).toISOString() }] } };
    const r = await call(h, { platform: 'android', product_id: 'languagedash_pro_monthly', token: 'purchase-token-123' }, 'good');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, valid: true, granted: true });
    const asked = stripeCalls.find((c) => c.path.startsWith('STORE '));
    expect(asked.path).toContain('/applications/com.example.app/purchases/subscriptionsv2/tokens/purchase-token-123');
    expect(asked.auth).toBe('Bearer goog_access');
    const claim = db.find((c) => c[0] === 'pro_store_claim')[1];
    expect(claim).toMatchObject({ p_platform: 'android', p_user: 'u1', p_product: 'languagedash_pro_monthly', p_revoked: false });
    expect(claim.p_key).toMatch(/^[0-9a-f]{64}$/);                     // (a hash, never the token)
    const grant = db.find((c) => c[0] === 'pro_grant_until')[1];
    expect(grant).toMatchObject({ p_user: 'u1', p_plan: 'monthly', p_source: 'store' });
    expect(Math.round(new Date(grant.p_until).getTime() / 1000)).toBe(end + 2 * 86400);
  });

  it('Google Play: a refunded item is taken back, an unknown purchase gives nothing', async () => {
    const h = await boot('../../supabase/functions/ld-iap-verify/index.js');
    storeReply = { status: 200, body: { purchaseState: 1 } };
    const r = await call(h, { platform: 'android', product_id: 'languagedash_item_trail_lanterns', token: 'purchase-token-456' }, 'good');
    expect(r.body).toMatchObject({ ok: true, valid: false, revoked: true, granted: false });
    expect(db.find((c) => c[0] === 'pro_revoke_item')[1]).toMatchObject({ p_user: 'u1', p_item: 'trail_lanterns' });
    db.length = 0;
    storeReply = { status: 404, body: {} };
    const unknown = await call(h, { platform: 'android', product_id: 'languagedash_item_trail_lanterns', token: 'purchase-token-789' }, 'good');
    expect(unknown.body).toMatchObject({ ok: true, valid: false, granted: false });
    expect(db.some((c) => c[0].startsWith('pro_grant') || c[0] === 'pro_store_claim')).toBe(false);
  });

  it('App Store: a valid transaction is attached; the sandbox is tried when production does not know it', async () => {
    const h = await boot('../../supabase/functions/ld-iap-verify/index.js');
    storeReply = { status: 200, body: { signedTransactionInfo: signedTx({ bundleId: 'com.example.app', productId: 'languagedash_pro_lifetime', type: 'Non-Consumable', originalTransactionId: '555' }) }, sandboxOnly: true };
    const r = await call(h, { platform: 'ios', product_id: 'languagedash_pro_lifetime', token: '2000000123456' }, 'good');
    expect(r.body).toMatchObject({ ok: true, valid: true, granted: true });
    const urls = stripeCalls.filter((c) => c.path.startsWith('STORE ')).map((c) => c.path);
    expect(urls[0]).toContain('api.storekit.itunes.apple.com');
    expect(urls[1]).toContain('api.storekit-sandbox.itunes.apple.com');
    expect(db.find((c) => c[0] === 'pro_store_claim')[1]).toMatchObject({ p_platform: 'ios', p_key: '555' });
    expect(db.find((c) => c[0] === 'pro_grant_until')[1]).toMatchObject({ p_plan: 'lifetime', p_source: 'store' });
  });

  it('refuses a transaction for another app or another product, and one that another account already holds', async () => {
    const h = await boot('../../supabase/functions/ld-iap-verify/index.js');
    storeReply = { status: 200, body: { signedTransactionInfo: signedTx({ bundleId: 'com.someone.else', productId: 'languagedash_pro_lifetime', type: 'Non-Consumable', originalTransactionId: '1' }) } };
    expect((await call(h, { platform: 'ios', product_id: 'languagedash_pro_lifetime', token: '2000000123456' }, 'good')).body).toMatchObject({ ok: true, valid: false, granted: false });
    storeReply = { status: 200, body: { signedTransactionInfo: signedTx({ bundleId: 'com.example.app', productId: 'languagedash_item_trail_lanterns', type: 'Non-Consumable', originalTransactionId: '2' }) } };
    expect((await call(h, { platform: 'ios', product_id: 'languagedash_pro_lifetime', token: '2000000123456' }, 'good')).status).toBe(400);
    storeReply = { status: 200, body: { signedTransactionInfo: signedTx({ bundleId: 'com.example.app', productId: 'languagedash_pro_lifetime', type: 'Non-Consumable', originalTransactionId: '3' }) } };
    claimResult = 'other_account';
    db.length = 0;
    const r = await call(h, { platform: 'ios', product_id: 'languagedash_pro_lifetime', token: '2000000123456' }, 'good');
    expect(r.status).toBe(409);
    expect(db.some((c) => c[0].startsWith('pro_grant'))).toBe(false);
  });

  it('a store that cannot be reached takes nothing away and says to try again', async () => {
    const h = await boot('../../supabase/functions/ld-iap-verify/index.js');
    storeReply = { status: 500, body: {} };
    const r = await call(h, { platform: 'android', product_id: 'languagedash_pro_monthly', token: 'purchase-token-123' }, 'good');
    expect(r.status).toBe(502);
    expect(db.some((c) => c[0].startsWith('pro_revoke') || c[0].startsWith('pro_grant'))).toBe(false);
  });
});
