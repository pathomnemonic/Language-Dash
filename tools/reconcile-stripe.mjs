#!/usr/bin/env node
/**
 * reconcile-stripe.mjs — "did everyone who paid get what they paid for, and did everyone who got a refund lose it?"
 * Read-only: it changes nothing. Run it now and then (daily is plenty once you have customers).
 *
 *   LD_STRIPE_SECRET_KEY=sk_live_... SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
 *     node tools/reconcile-stripe.mjs [--days 30]
 *
 * (A restricted Stripe key with read access to Checkout Sessions, Payment Intents, Charges and Subscriptions is enough.)
 * Prints one line per mismatch and exits with 1 if there are any. To fix a "paid, not delivered" line, ask that member to
 * open Settings → Language Dash Pro → Check again, or run the same check for them from the SQL editor (pro_grant_item /
 * pro_grant_until). To fix "given back, still held": SELECT pro_revoke_item('<user>', '<item>') or pro_revoke_plan(...).
 */
import { reconcile } from './reconcile-lib.mjs';

var STRIPE = process.env.LD_STRIPE_SECRET_KEY;
var DB = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
var KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
var days = Number((process.argv.indexOf('--days') > 0 && process.argv[process.argv.indexOf('--days') + 1]) || 30);

if (!STRIPE || !DB || !KEY) {
  console.error('Set LD_STRIPE_SECRET_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see the top of this file).');
  process.exit(2);
}

async function stripe(path) {
  var res = await fetch('https://api.stripe.com/v1/' + path, { headers: { Authorization: 'Bearer ' + STRIPE } });
  if (!res.ok) throw new Error('Stripe said ' + res.status + ' for ' + path.split('?')[0] + ': ' + (await res.text()).slice(0, 200));
  return res.json();
}

async function table(name, select) {
  var res = await fetch(DB + '/rest/v1/' + name + '?select=' + select + '&limit=100000', { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Accept-Profile': 'language_dash', Prefer: 'count=exact' } });
  if (!res.ok) throw new Error('Database said ' + res.status + ' for ' + name + ': ' + (await res.text()).slice(0, 200));
  var rows = await res.json();
  // a silent truncation would reconcile against half the database and call it a match: refuse instead
  var range = res.headers.get('content-range') || '';
  var total = Number(range.split('/')[1]);
  if (Number.isFinite(total) && total !== rows.length) throw new Error('Database table ' + name + ' has ' + total + ' rows but only ' + rows.length + ' came back: the report would be incomplete, so nothing was checked');
  return rows;
}

var since = Math.floor(Date.now() / 1000) - days * 86400;
var sessions = [];
var after = '';
var lastPage = null;
for (var page = 0; page < 200; page++) {
  var r = await stripe('checkout/sessions?limit=100&created[gte]=' + since + '&expand[]=data.payment_intent.latest_charge.dispute&expand[]=data.subscription' + (after ? '&starting_after=' + after : ''));
  sessions = sessions.concat(r.data || []);
  lastPage = r;
  if (!r.has_more || !r.data.length) break;
  after = r.data[r.data.length - 1].id;
}
if (lastPage && lastPage.has_more) throw new Error('More than 20,000 Checkout Sessions in the last ' + days + ' days: the report would be incomplete. Re-run with a smaller --days window.');

// A subscription opened before the session window is still an obligation today, so live subscriptions are fetched
// directly as well (their metadata names the member and the plan), however old they are. reconcile() checks each
// subscription only once, so one seen both ways is not reported twice.
var subs = [];
for (var status of ['active', 'trialing', 'past_due']) {
  var subAfter = '';
  var subLast = null;
  for (var spage = 0; spage < 200; spage++) {
    var sr = await stripe('subscriptions?limit=100&status=' + status + (subAfter ? '&starting_after=' + subAfter : ''));
    (sr.data || []).forEach(function (sub) {
      var sm = sub.metadata || {};
      subs.push({ id: 'subcheck_' + sub.id, status: 'complete', payment_status: 'paid', mode: 'subscription', client_reference_id: sm.user_id || '', metadata: sm, subscription: sub });
    });
    subLast = sr;
    if (!sr.has_more || !sr.data.length) break;
    subAfter = sr.data[sr.data.length - 1].id;
  }
  if (subLast && subLast.has_more) throw new Error('More than 20,000 ' + status + ' subscriptions: the report would be incomplete, so nothing was checked');
}

var db = { items: await table('pro_items', 'user_id,item_id'), entitlements: await table('pro_entitlements', 'user_id,plan,until') };
var problems = reconcile(sessions.concat(subs), db, Math.floor(Date.now() / 1000));

console.log('Checked ' + sessions.length + ' Checkout Sessions from the last ' + days + ' days and ' + subs.length + ' live subscriptions of any age.');
if (!problems.length) { console.log('Everything matches.'); process.exit(0); }
problems.forEach(function (p) { console.log(p.problem.padEnd(26) + ' ' + p.user + '  ' + p.what.padEnd(34) + ' ' + p.session); });
console.log('\n' + problems.length + ' mismatch(es). See the top of this file for how to fix each kind.');
process.exit(1);
