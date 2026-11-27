/**
 * reconcile-lib.mjs — compares what Stripe says people paid for with what the database gave them. Pure (no network), so it
 * can be tested; tools/reconcile-stripe.mjs does the fetching.
 */

/** Has a charge been given back? (a refund, or a chargeback that is open or lost; a won one does not count) */
export function returned(charge) {
  if (!charge || typeof charge !== 'object') return false;
  if (charge.refunded) return true;
  if (!charge.disputed) return false;
  var d = charge.dispute;
  return !(d && typeof d === 'object' && (d.status === 'won' || d.status === 'warning_closed'));
}

/**
 * @param {object[]} sessions Stripe Checkout Sessions (complete), each with payment_intent.latest_charge expanded.
 *   Live subscriptions fetched directly (not via a session) may be included as sessions whose subscription is the
 *   subscription itself; duplicates of the same subscription are only checked once.
 * @param {{items: {user_id: string, item_id: string}[], entitlements: {user_id: string, plan: string, until: string}[]}} db
 * @param {number} nowSec
 * @returns {{problem: string, user: string, what: string, session: string}[]}
 */
export function reconcile(sessions, db, nowSec) {
  var out = [];
  var hasItem = function (u, i) { return db.items.some(function (x) { return x.user_id === u && x.item_id === i; }); };
  var ent = function (u) { return db.entitlements.filter(function (x) { return x.user_id === u; })[0] || null; };
  // Purchases are judged per member and thing bought, never per session: a member who bought the same item twice and
  // had one purchase refunded still legitimately holds it through the other one, so a single returned session must not
  // condemn a held item on its own. Only when NO valid purchase remains does a held item count as "given back".
  var purchases = {};
  var subs = [];
  (sessions || []).forEach(function (s) {
    if (!s || s.status !== 'complete' || (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required')) return;
    var m = s.metadata || {};
    // the Stripe account is shared with other apps: a session only says something about this database when its
    // metadata names Language Dash (every checkout this app creates sets metadata.app; see billing.js)
    if (m.app !== 'language_dash') return;
    var user = s.client_reference_id || m.user_id;
    if (!user) return;
    if (s.mode === 'subscription' && s.subscription && typeof s.subscription === 'object') { subs.push({ s: s, user: user, m: m }); return; }
    var charge = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent.latest_charge : null;
    var gone = s.mode === 'payment' && returned(charge);
    var key = null;
    if (m.kind === 'item' && m.item_id) key = user + '|item|' + m.item_id;
    else if (m.plan === 'lifetime') key = user + '|lifetime';
    if (!key) return;
    var g = purchases[key] || (purchases[key] = { user: user, kind: m.kind === 'item' ? 'item' : 'lifetime', item_id: m.item_id || null, valid: null, returned: null });
    if (gone) { if (!g.returned) g.returned = s; } else if (!g.valid) g.valid = s;
  });
  Object.keys(purchases).forEach(function (key) {
    var g = purchases[key];
    var held;
    var what;
    if (g.kind === 'item') { held = hasItem(g.user, g.item_id); what = 'item ' + g.item_id; }
    else {
      var e = ent(g.user);
      held = !!(e && e.plan === 'lifetime' && Date.parse(e.until) / 1000 > nowSec);
      what = 'lifetime';
    }
    if (g.valid && !held) out.push({ problem: 'paid, not delivered', user: g.user, what: what, session: g.valid.id });
    if (!g.valid && g.returned && held) out.push({ problem: 'given back, still held', user: g.user, what: what, session: g.returned.id });
  });
  var seenSubs = {};
  subs.forEach(function (entry) {
    var s = entry.s;
    var sub = s.subscription;
    var subKey = sub.id || s.id;
    if (seenSubs[subKey]) return;
    seenSubs[subKey] = true;
    var live = ['active', 'trialing', 'past_due'].indexOf(sub.status) >= 0;
    var e2 = ent(entry.user);
    var covered = !!(e2 && Date.parse(e2.until) / 1000 > nowSec);
    if (live && !covered) out.push({ problem: 'subscription live, no Pro', user: entry.user, what: 'plan ' + (entry.m.plan || '?'), session: s.id });
  });
  return out;
}
