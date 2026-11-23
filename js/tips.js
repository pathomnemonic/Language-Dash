/**
 * tips.js — the optional, quiet "support the developer" link.
 *
 * The app is free. If a tip page is configured (TIP_URL in tipconfig.js, or VITE_TIP_URL at build time: a Stripe payment
 * link), one row appears in Settings. That is all: there is no pop-up, no note after a run and no reminder, nothing is ever
 * locked behind it, and it has nothing to do with Pro. With no URL configured, nothing is shown.
 */

import { openExternal } from './platform.js';
import { isNative } from './native.js';
import { TIP_URL } from './tipconfig.js';

/**
 * The Cathology Ko-fi page is reserved for that app (its tips are earmarked), so Language Dash must never send tips there.
 * @param {URL} u
 */
function isReservedTipPage(u) {
  var host = u.hostname.toLowerCase().replace(/^www\./, '');
  var first = u.pathname.split('/').filter(Boolean)[0] || '';
  return host === 'ko-fi.com' && first.toLowerCase() === 'pathomnemonic';
}

/** Only https links are accepted, and never another app's reserved page. @returns {boolean} */
export function isValidTipUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    var u = new URL(url);
    return u.protocol === 'https:' && u.hostname.indexOf('.') > 0 && !isReservedTipPage(u);
  } catch (e) {
    return false;
  }
}

/** @returns {string} the configured tip URL, or '' if none/invalid or inside the store apps */
export function getTipUrl() {
  // Apple and Google restrict external payment links inside apps: the apps use the in-app tip jar instead (tipjar.js)
  if (isNative()) return '';
  /** @type {Record<string, any>} */
  var env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  var url = String(env.VITE_TIP_URL || TIP_URL || '').trim();
  // a link pasted without its https:// still works
  if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
  return isValidTipUrl(url) ? url : '';
}

/** Open the tip page in a new tab without leaking the referrer. */
export function openTipPage() {
  var url = getTipUrl();
  if (!url) return false;
  openExternal(url);
  return true;
}
