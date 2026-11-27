// ld-remove-signin — removes the player's SIGN-IN (the login in the shared project's auth pool), for every app that uses it.
//
// This is the second, separate deletion action. The first ("Delete my Language Dash account") is the database function
// language_dash.delete_my_ld_data(), which removes only this app's rows and keeps the login.
//
// The app sends { confirm: 'REMOVE MY SIGN-IN' } with the player's sign-in. In this order, stopping at the first failure:
//   1. verify the caller's JWT (a real login: not a guest);
//   2. cancel any subscription that is still billing (so nobody keeps paying for a login that is gone);
//   3. revoke the Sign in with Apple token if the login came from Apple (an App Store rule);
//   4. delete this app's data through the caller's own context (language_dash.delete_my_ld_data; best effort), clear the payment
//      records, then call language_dash.purge_user_data(uuid) as the service role (REQUIRED: the pro_* tables hold a bare uuid
//      with no foreign key, so the auth deletion would leave them orphaned; a failure here stops before the login is touched);
//   5. delete the auth user with the admin API.
// Steps 2 and 3 change things outside this app (a Stripe subscription, an Apple login) and cannot be rolled back, so
// stopping later cannot make them undone: every error message says what has actually happened so far (what was
// cancelled or revoked) as well as what was not removed, and a retry is always safe.
//
// Deploy:  supabase functions deploy ld-remove-signin
// Secrets (LD_ names only, no fallback to an unprefixed name): LD_STRIPE_SECRET_KEY (to cancel a subscription),
//   LD_APPLE_TEAM_ID, LD_APPLE_KEY_ID, LD_APPLE_PRIVATE_KEY, LD_APPLE_CLIENT_ID (to revoke an Apple login).
// Supabase sets SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY itself.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { appleConfigured, appleRevokeForm, revokeSucceeded, hasAppleLogin, revokeTarget } from '../_shared/applesignin.js';
import { cancelBillingSubscriptions } from '../_shared/stripecancel.js';

var CONFIRM = 'REMOVE MY SIGN-IN';
var STRIPE_KEY = Deno.env.get('LD_STRIPE_SECRET_KEY') || '';
var appleEnv = {};
['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY', 'APPLE_CLIENT_ID', 'APPLE_BUNDLE_ID'].forEach(function (k) { appleEnv[k] = Deno.env.get('LD_' + k) || ''; });
var SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
var admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { db: { schema: 'language_dash' }, auth: { persistSession: false } });

var CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
function json(body, status) { return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS) }); }

async function stripe(path, form, method) {
  var res = await fetch('https://api.stripe.com/v1/' + path, {
    method: method || (form ? 'POST' : 'GET'),
    headers: Object.assign({ Authorization: 'Bearer ' + STRIPE_KEY }, form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    body: form ? new URLSearchParams(form).toString() : undefined
  });
  var data = await res.json();
  if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Stripe said ' + res.status);
  return data;
}

Deno.serve(async function (req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  var body = {};
  try { body = await req.json(); } catch { body = {}; }
  try {
    var jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    var who = jwt ? await admin.auth.getUser(jwt) : null;
    var user = who && who.data && who.data.user;
    if (!user) return json({ error: 'Sign in first.' }, 401);
    if (user.is_anonymous || !user.email) return json({ error: 'Only a signed-in login can be removed.' }, 403);
    if (!body || body.confirm !== CONFIRM) return json({ error: 'Type ' + CONFIRM + ' to confirm. Nothing was removed.', code: 'confirmation_required' }, 400);

    // 2. a subscription that is still billing (the customer link lives in the language_dash schema)
    var customer = await admin.rpc('pro_user_customer', { p_user: user.id });
    var customerId = customer && customer.data ? customer.data : '';
    var cancelled = { ok: true, cancelled: 0 };
    if (customerId) {
      if (!STRIPE_KEY) { console.error('ld-remove-signin: a Stripe customer exists but LD_STRIPE_SECRET_KEY is not set'); return json({ error: 'Could not check your subscription just now, so nothing was removed. Please try again.' }, 502); }
      cancelled = await cancelBillingSubscriptions(stripe, customerId);
      if (!cancelled.ok) { console.error('ld-remove-signin: could not cancel the subscription'); return json({ error: cancelled.error.replace('No data was deleted.', 'Your data and sign-in were not removed.').replace('nothing was deleted', 'nothing was removed') }, 502); }
    }
    // (what steps 2 and 3 have already changed outside this app, for honest error messages further down)
    var doneSoFar = function () {
      var bits = [];
      if (cancelled.cancelled > 0) bits.push('your subscription was cancelled');
      if (revoked) bits.push('your Apple login was revoked');
      return bits;
    };

    // 3. Apple requires that deleting an account also revokes its Sign in with Apple login. If Apple cannot be reached, nothing is removed.
    var revoked = false;
    if (hasAppleLogin(user)) {
      var appleTok = await admin.rpc('apple_token_get', { p_user: user.id });
      var appleTarget = revokeTarget(appleEnv, appleTok && appleTok.data);
      if (appleTok && appleTok.data && appleConfigured(appleTarget.env)) {
        try {
          var ares = await fetch('https://appleid.apple.com/auth/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(await appleRevokeForm(appleTarget.env, appleTarget.token, Math.floor(Date.now() / 1000))).toString()
          });
          if (!revokeSucceeded({ status: ares.status, body: await ares.text().catch(function () { return ''; }) })) throw new Error('Apple said ' + ares.status);
          revoked = true;
        } catch (e) {
          console.error('ld-remove-signin: could not revoke Apple login', e && e.message);
          var soFar = doneSoFar();
          return json({ error: soFar.length
            ? 'Could not sign you out of Apple just now. ' + soFar.join(' and ') + ', but your sign-in and data were not removed. Please try again.'
            : 'Could not sign you out of Apple just now, so nothing was removed. Please try again.' }, 502);
        }
      } else {
        console.warn('ld-remove-signin: Apple login has no stored token or the LD_APPLE_* secrets are not set; removing without revoking');
      }
    }

    // 4. this app's data, as the caller (best effort), then the payment records
    var callerDb = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', { db: { schema: 'language_dash' }, global: { headers: { Authorization: 'Bearer ' + jwt } }, auth: { persistSession: false } });
    try {
      var mine = await callerDb.rpc('delete_my_ld_data');
      if (mine && mine.error) console.warn('ld-remove-signin: delete_my_ld_data said', mine.error.message);
    } catch (e) { console.warn('ld-remove-signin: delete_my_ld_data failed', e && e.message); }
    // pro_forget_user removes the payment records purge_user_data deliberately keeps (the Apple token, the trial
    // marker). Required, not best effort: if it fails, the auth deletion below would leave those rows orphaned, so
    // stop here — saying honestly what steps 2 and 3 already changed.
    var forgot = await admin.rpc('pro_forget_user', { p_user: user.id });
    if (!forgot || forgot.error) {
      console.error('ld-remove-signin: could not clear payment records', forgot && forgot.error && forgot.error.message);
      var bits4 = doneSoFar();
      return json({ error: (bits4.length ? 'So far ' + bits4.join(' and ') + ', but your payment records' : 'Your payment records') + ' could not be cleared, so your sign-in was not removed. Please try again.' }, 500);
    }
    // purge_user_data removes every language_dash row for this user, including the pro_* tables, which hold a bare uuid with
    // no foreign key and so would NOT be cleaned up by the auth deletion. Required: if it fails, the login is kept so the
    // player can simply try again (nothing orphaned).
    var purged = await admin.rpc('purge_user_data', { p_user: user.id });
    if (!purged || purged.error) {
      console.error('ld-remove-signin: purge_user_data failed', purged && purged.error && purged.error.message);
      return json({ error: 'Could not clear your Language Dash data, so your sign-in was not removed. Please try again.' }, 500);
    }

    // 5. the login itself
    var gone = await admin.auth.admin.deleteUser(user.id);
    if (gone && gone.error) { console.error('ld-remove-signin: could not delete user', gone.error.message); return json({ error: 'Your Language Dash data and payment records were deleted, but the sign-in itself could not be removed. Please try again.' }, 500); }
    return json({ ok: true, removed: 'signin', cancelled_subscriptions: cancelled.cancelled || 0, apple_revoked: revoked, language_dash_data_deleted: true });
  } catch (e) {
    console.error('ld-remove-signin failed', e && e.message);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
