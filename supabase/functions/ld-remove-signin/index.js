// ld-remove-signin — removes the player's SIGN-IN (the login in the shared project's auth pool), for every app that uses it.
//
// This is the second, separate deletion action. The first ("Delete my Language Dash account") is the database function
// language_dash.delete_my_ld_data(), which removes only this app's rows and keeps the login.
//
// The app sends { confirm: 'REMOVE MY SIGN-IN' } with the player's sign-in. In this order, stopping at the first failure so
// that nothing is half-done:
//   1. verify the caller's JWT (a real login: not a guest);
//   2. cancel any subscription that is still billing (so nobody keeps paying for a login that is gone);
//   3. revoke the Sign in with Apple token if the login came from Apple (an App Store rule);
//   4. delete this app's data through the caller's own context (language_dash.delete_my_ld_data; best effort: a login that
//      never joined has nothing, and the auth deletion below would cascade it anyway) and the payment records;
//   5. delete the auth user with the admin API.
//
// Deploy:  supabase functions deploy ld-remove-signin
// Secrets (LD_ names only, no fallback to an unprefixed name): LD_STRIPE_SECRET_KEY (to cancel a subscription),
//   LD_APPLE_TEAM_ID, LD_APPLE_KEY_ID, LD_APPLE_PRIVATE_KEY, LD_APPLE_CLIENT_ID (to revoke an Apple login).
// Supabase sets SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY itself.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import { appleConfigured, appleRevokeForm, revokeSucceeded, hasAppleLogin } from '../_shared/applesignin.js';
import { cancelBillingSubscriptions } from '../_shared/stripecancel.js';

var CONFIRM = 'REMOVE MY SIGN-IN';
var STRIPE_KEY = Deno.env.get('LD_STRIPE_SECRET_KEY') || '';
var appleEnv = {};
['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY', 'APPLE_CLIENT_ID'].forEach(function (k) { appleEnv[k] = Deno.env.get('LD_' + k) || ''; });
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
      if (!cancelled.ok) { console.error('ld-remove-signin: could not cancel the subscription'); return json({ error: cancelled.error.replace('nothing was deleted', 'nothing was removed') }, 502); }
    }

    // 3. Apple requires that deleting an account also revokes its Sign in with Apple login. If Apple cannot be reached, nothing is removed.
    var revoked = false;
    if (hasAppleLogin(user)) {
      var appleTok = await admin.rpc('apple_token_get', { p_user: user.id });
      if (appleTok && appleTok.data && appleConfigured(appleEnv)) {
        try {
          var ares = await fetch('https://appleid.apple.com/auth/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(await appleRevokeForm(appleEnv, appleTok.data, Math.floor(Date.now() / 1000))).toString()
          });
          if (!revokeSucceeded({ status: ares.status, body: await ares.text().catch(function () { return ''; }) })) throw new Error('Apple said ' + ares.status);
          revoked = true;
        } catch (e) {
          console.error('ld-remove-signin: could not revoke Apple login', e && e.message);
          return json({ error: 'Could not sign you out of Apple just now, so nothing was removed. Please try again.' }, 502);
        }
      } else {
        console.warn('ld-remove-signin: Apple login has no stored token or the LD_APPLE_* secrets are not set; removing without revoking');
      }
    }

    // 4. this app's data, as the caller (best effort), then the payment records
    var dataDeleted = false;
    var callerDb = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', { db: { schema: 'language_dash' }, global: { headers: { Authorization: 'Bearer ' + jwt } }, auth: { persistSession: false } });
    try {
      var mine = await callerDb.rpc('delete_my_ld_data');
      if (mine && mine.error) console.warn('ld-remove-signin: delete_my_ld_data said', mine.error.message); else dataDeleted = true;
    } catch (e) { console.warn('ld-remove-signin: delete_my_ld_data failed', e && e.message); }
    var forgot = await admin.rpc('pro_forget_user', { p_user: user.id });
    if (forgot && forgot.error) console.warn('ld-remove-signin: could not clear payment records', forgot.error.message);

    // 5. the login itself
    var gone = await admin.auth.admin.deleteUser(user.id);
    if (gone && gone.error) { console.error('ld-remove-signin: could not delete user', gone.error.message); return json({ error: 'Could not remove the sign-in. Please try again.' }, 500); }
    return json({ ok: true, removed: 'signin', cancelled_subscriptions: cancelled.cancelled || 0, apple_revoked: revoked, language_dash_data_deleted: dataDeleted });
  } catch (e) {
    console.error('ld-remove-signin failed', e && e.message);
    return json({ error: 'Something went wrong. Nothing was removed.' }, 500);
  }
});
