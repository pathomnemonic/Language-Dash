/**
 * stripecancel.js — end every subscription of a Stripe customer that is still billing (used by "cancel my subscription"
 * and by removing the sign-in). No network of its own: the caller passes its Stripe helper, so this can be tested.
 *
 * The result always says how many subscriptions were actually cancelled, including on failure: a failure part way
 * through the list means the earlier ones ARE cancelled, and no message from here may claim nothing happened.
 */

var BILLING = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];

/**
 * @param {function(string, object=, string=): Promise<any>} stripe the caller's Stripe helper (path, form, method)
 * @param {string} customerId
 * @returns {Promise<{ok: true, cancelled: number} | {ok: false, cancelled: number, error: string}>}
 */
export async function cancelBillingSubscriptions(stripe, customerId) {
  if (!customerId) return { ok: true, cancelled: 0 };
  var mine;
  try { mine = await stripe('subscriptions?customer=' + encodeURIComponent(customerId) + '&status=all&limit=20'); } catch (e) {
    if (!/no such customer/i.test((e && e.message) || '')) return { ok: false, cancelled: 0, error: 'Could not check your subscription just now, so nothing was changed. Please try again.' };
    mine = { data: [] };
  }
  var billing = ((mine && mine.data) || []).filter(function (x) { return BILLING.indexOf(x.status) >= 0; });
  var done = 0;
  for (var i = 0; i < billing.length; i++) {
    try { await stripe('subscriptions/' + encodeURIComponent(billing[i].id), null, 'DELETE'); done++; } catch {
      return { ok: false, cancelled: done, error: done > 0
        ? 'Some of your subscriptions were cancelled, but one could not be. No data was deleted. Please try again, or cancel the rest under Manage subscription first.'
        : 'Could not cancel your subscription, so nothing was deleted. Please try again, or cancel it under Manage subscription first.' };
    }
  }
  return { ok: true, cancelled: done };
}
