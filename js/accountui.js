/**
 * accountui.js — the Account tab (sign up, sign in, cloud save) and the
 * "which save do you want?" dialog. Safe DOM only.
 */

import { enabledProviders, providerLabel, onlyAvailable, applyIosAppleRule } from './authproviders.js';
import { track } from './analytics/index.js';
import { createElement } from './dom.js';
import { getNativePlatform } from './native.js';
import { askConfirm } from './confirmdialog.js';

var INPUT_STYLE = 'width:100%;padding:9px 11px;border-radius:10px;background:var(--field);color:var(--ink);border:2px solid var(--line);margin-bottom:8px;font-size:14px';

var _mode = 'signup'; // signup | signin | reset
var _recovery = false;
var _busyMessage = '';
var _external; // which providers Supabase has switched on (null: could not be read)
var _externalAsked = false;
var _externalDone = false;

/** A provider's logo, drawn as a small inline picture (no image file, no outside address). */
function providerMark(parts) {
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'vertical-align:-3px;margin-right:10px';
  parts.forEach(function (part) {
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', part.d);
    path.setAttribute('fill', part.fill);
    svg.appendChild(path);
  });
  return svg;
}

/** Called by main.js when a password-reset link brings the player back. */
export function beginPasswordRecovery() {
  _recovery = true;
}

function input(type, label, autocomplete, placeholder) {
  var el = createElement('input', {
    attributes: { type: type, 'aria-label': label, autocomplete: autocomplete, placeholder: placeholder || label }
  });
  el.style.cssText = INPUT_STYLE;
  return el;
}

function button(label, onClick, className) {
  var b = createElement('button', {
    className: 'btn btn-sm ' + (className || 'btn-outline'),
    text: label,
    attributes: { type: 'button' }
  });
  b.addEventListener('click', function () {
    b.disabled = true;
    Promise.resolve(onClick()).then(function () { b.disabled = false; }, function () { b.disabled = false; });
  });
  return b;
}

function note(text, color) {
  var el = createElement('div', { className: 'mp-status', text: text });
  el.style.margin = '6px 0';
  if (color) el.style.color = color;
  return el;
}

function timeAgo(ms) {
  if (!ms) return 'not yet';
  var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  return Math.round(s / 3600) + ' h ago';
}

/**
 * Render the Account tab.
 * @param {HTMLElement} body
 * @param {object} deps - { leaderboard, cloudSync, toast, rerender }
 */
export function renderAccountPanel(body, deps) {
  var lb = deps.leaderboard;
  var status = lb.getStatus();

  if (!status.configured) {
    body.appendChild(note('Accounts are not set up for this copy of the game. Your progress is saved on this device only.'));
    return;
  }

  if (_recovery && status.authenticated) {
    renderRecovery(body, deps);
    return;
  }

  if (status.email && !status.anonymous) {
    // A login is not a Language Dash account: other apps share it. The player creates the Language Dash account on purpose.
    if (status.membershipKnown && !status.member) renderJoinStep(body, deps, status);
    else if (!status.membershipKnown) renderCheckingMembership(body, deps, status);
    else renderSignedIn(body, deps, status);
  } else {
    renderGuest(body, deps, status);
  }
}

function renderRecovery(body, deps) {
  body.appendChild(note('Choose a new password for your account.'));
  var pw = input('password', 'New password', 'new-password', 'New password (8+ characters)');
  body.appendChild(pw);
  body.appendChild(button('Save new password', function () {
    return deps.leaderboard.updatePassword(pw.value).then(function (res) {
      if (res.success) {
        _recovery = false;
        deps.toast('Password updated.');
        deps.rerender();
      } else {
        deps.toast(res.error || 'Could not update your password.');
      }
    });
  }, 'btn-primary'));
}

function renderGuest(body, deps, status) {
  body.appendChild(note(
    'You are playing as a guest. Create a free account to keep your progress, name and friends safe in the cloud and pick up on any device.'
  ));
  if (status.pendingEmail) {
    body.appendChild(note('Waiting for you to confirm ' + status.pendingEmail + '. Open the link we emailed you, then come back.', 'var(--accent-gold)'));
  }

  var tabs = createElement('div');
  tabs.style.cssText = 'display:flex;gap:6px;margin:8px 0';
  [['signup', 'I am new'], ['signin', 'I have an account']].forEach(function (t) {
    var b = createElement('button', {
      className: 'btn btn-sm ' + (_mode === t[0] || (_mode === 'reset' && t[0] === 'signin') ? 'btn-primary' : 'btn-outline'),
      text: t[1],
      attributes: { type: 'button' }
    });
    b.addEventListener('click', function () { _mode = t[0]; _busyMessage = ''; deps.rerender(); });
    tabs.appendChild(b);
  });
  body.appendChild(tabs);

  // "Continue with Google / Apple": no password to make or remember. "I am new" upgrades this guest in place (so scores,
  // friends and groups stay); "I have an account" signs in to the one that exists.
  if (!_externalAsked && deps.leaderboard.getAuthSettings) {
    _externalAsked = true; // (asked once; the panel is drawn again with the answer)
    var settled = function (ext) { _external = ext; _externalDone = true; deps.rerender(); };
    deps.leaderboard.getAuthSettings().then(settled, function () { settled(null); });
  } else if (!deps.leaderboard.getAuthSettings) {
    _externalDone = true;
  }
  // (no buttons until it is known which work, so none appears and then vanishes)
  var providers = _mode === 'reset' || !_externalDone ? [] : applyIosAppleRule(onlyAvailable(enabledProviders(), _external), getNativePlatform());
  if (providers.length) {
    var row = createElement('div', { className: 'auth-providers' });
    row.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin:8px 0';
    providers.forEach(function (p) {
      var pb = createElement('button', {
        className: 'btn btn-outline btn-block auth-provider',
        text: (p.mark ? '' : (p.icon ? p.icon + '  ' : '')) + 'Continue with ' + p.label,
        attributes: { type: 'button', 'data-provider': p.id }
      });
      if (p.mark) pb.insertBefore(providerMark(p.mark), pb.firstChild);
      pb.addEventListener('click', function () {
        pb.disabled = true;
        track('account_event', { action: 'oauth_started', method: p.id });
        deps.leaderboard.signInWithProvider(p.id, { link: _mode === 'signup' }).then(function (res) {
          if (res.success) {
            _busyMessage = 'Opening ' + p.label + '…';
            deps.rerender();
            return;
          }
          pb.disabled = false;
          track('account_event', { action: 'oauth_failed', method: p.id });
          deps.toast(res.error || 'Could not sign in with ' + p.label + '.');
        });
      });
      row.appendChild(pb);
    });
    body.appendChild(row);
    var or = createElement('div', { text: 'or use your email' });
    or.style.cssText = 'text-align:center;font-size:12px;color:var(--text-muted);margin:6px 0';
    body.appendChild(or);
  }

  var form = createElement('form');
  form.setAttribute('novalidate', 'novalidate');
  var email = input('email', 'Email address', 'email', 'you@example.com');
  form.appendChild(email);

  var password = null;
  if (_mode !== 'reset') {
    password = input('password', 'Password', _mode === 'signup' ? 'new-password' : 'current-password',
      _mode === 'signup' ? 'Password (8+ characters)' : 'Password');
    form.appendChild(password);
  }

  var submitLabel = _mode === 'signup' ? 'Create account' : (_mode === 'signin' ? 'Sign in' : 'Email me a reset link');
  var submit = createElement('button', { className: 'btn btn-primary btn-block', text: submitLabel, attributes: { type: 'submit' } });
  form.appendChild(submit);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submit.disabled = true;
    var run;
    if (_mode === 'signup') {
      run = deps.leaderboard.signUp(email.value, password.value).then(function (res) {
        track('account_event', { action: res.success ? 'signup_ok' : 'signup_started', method: 'email', ok: !!res.success });
        if (!res.success) return deps.toast(res.error || 'Could not create the account.');
        if (res.needsConfirm) {
          _busyMessage = 'Almost there! We emailed ' + email.value.trim() + '. Open the link in that email to finish. Check spam if you do not see it.';
        } else {
          deps.toast('Account created. Your progress is now saved to it.');
        }
        deps.rerender();
      });
    } else if (_mode === 'signin') {
      run = deps.leaderboard.signIn(email.value, password.value).then(function (res) {
        track('account_event', { action: res.success ? 'signin_ok' : 'signin_failed', method: 'email', ok: !!res.success });
        if (!res.success) return deps.toast(res.error || 'Could not sign in.');
        deps.toast('Signed in.');
        _busyMessage = '';
        deps.rerender();
      });
    } else {
      run = deps.leaderboard.sendPasswordReset(email.value).then(function (res) {
        track('account_event', { action: 'password_reset', ok: !!res.success });
        if (!res.success) return deps.toast(res.error || 'Could not send the email.');
        _busyMessage = 'If an account exists for that email, a reset link is on its way.';
        deps.rerender();
      });
    }
    run.then(function () { submit.disabled = false; }, function () { submit.disabled = false; });
  });
  body.appendChild(form);

  // No password to remember: one tap on a link emailed to the address typed above
  if (_mode !== 'reset') {
    var linkBtn = createElement('button', { className: 'btn btn-outline btn-block', text: '✉ Email me a sign-in link instead', attributes: { type: 'button', 'data-magic': '1' } });
    linkBtn.style.marginTop = '8px';
    linkBtn.addEventListener('click', function () {
      linkBtn.disabled = true;
      deps.leaderboard.sendSignInLink(email.value, { link: _mode === 'signup' }).then(function (res) {
        track('account_event', { action: res.success ? 'signin_link_sent' : 'signin_link_failed', method: 'email', ok: !!res.success });
        linkBtn.disabled = false;
        if (!res.success) return deps.toast(res.error || 'Could not send the email.');
        _busyMessage = 'We emailed ' + email.value.trim() + '. Open the link in that email to finish. Check spam if you do not see it.';
        deps.rerender();
      });
    });
    body.appendChild(linkBtn);
  }

  if (_mode === 'signin') {
    var forgot = createElement('button', { className: 'btn btn-outline btn-sm', text: 'Forgot password?', attributes: { type: 'button' } });
    forgot.addEventListener('click', function () { _mode = 'reset'; _busyMessage = ''; deps.rerender(); });
    body.appendChild(forgot);
  }
  if (_mode === 'reset') {
    var back = createElement('button', { className: 'btn btn-outline btn-sm', text: 'Back to sign in', attributes: { type: 'button' } });
    back.addEventListener('click', function () { _mode = 'signin'; _busyMessage = ''; deps.rerender(); });
    body.appendChild(back);
  }
  if (_busyMessage) body.appendChild(note(_busyMessage, 'var(--accent-green)'));

  body.appendChild(note('Signing in on a new device loads your saved progress there. We only use your email for sign-in and password resets.'));
}

var JOIN_EXPLAIN = 'You are signed in with a login that other apps may also use. Your Language Dash data, progress and subscription are separate.';
var REMOVE_PHRASE = 'REMOVE MY SIGN-IN';
var _declinedFor = ''; // the user id that chose "Not now" this session
var _askedFor = '';    // the user id whose membership is being checked from this screen

/** The membership answer is still on its way (or failed): say so, and ask once. */
function renderCheckingMembership(body, deps, status) {
  body.appendChild(note('Signed in as ' + status.email + (providerLabel(status.provider) ? ' with ' + providerLabel(status.provider) : ''), 'var(--accent-green)'));
  if (status.membershipError) {
    body.appendChild(note('Could not check your Language Dash account just now: ' + status.membershipError, 'var(--accent-red)'));
    body.appendChild(button('Try again', function () { return deps.leaderboard.refreshMembership(true).then(function () { deps.rerender(); }); }));
  } else {
    body.appendChild(note('Checking your Language Dash account…'));
    var uid = deps.leaderboard.getUserId();
    if (_askedFor !== uid) {
      _askedFor = uid;
      deps.leaderboard.refreshMembership().then(function () { deps.rerender(); });
    }
  }
  appendSignOutAndRemove(body, deps, false);
}

/** Signed in with a login that is not a Language Dash account yet: a deliberate step, nothing is created silently. */
function renderJoinStep(body, deps, status) {
  var uid = deps.leaderboard.getUserId();
  var box = createElement('div', { attributes: { 'data-join-step': '1' } });
  box.style.cssText = 'border:2px solid var(--line);border-radius:10px;padding:12px;margin:8px 0';
  var title = createElement('div', { text: 'Create your Language Dash account with ' + status.email });
  title.style.cssText = 'font-weight:700;font-size:14px;margin-bottom:6px';
  box.appendChild(title);
  box.appendChild(note(JOIN_EXPLAIN));
  if (_declinedFor === uid) {
    box.appendChild(note('You are playing as a guest for now: friends, leaderboards, cloud save and Pro sync are off.', 'var(--accent-gold)'));
  }
  var join = button('Create my Language Dash account', function () {
    return deps.leaderboard.joinLanguageDash().then(function (res) {
      track('account_event', { action: 'join_ld', ok: !!res.success });
      if (res.success) { _declinedFor = ''; deps.toast('Your Language Dash account is ready.'); } else deps.toast(res.error || 'Could not create your Language Dash account.');
      deps.rerender();
    });
  }, 'btn-primary');
  join.setAttribute('data-join', '1');
  box.appendChild(join);
  var agree = createElement('div', { attributes: { 'data-join-agree': '1' } });
  agree.style.cssText = 'font-size:12px;opacity:.8;margin:6px 0';
  agree.appendChild(document.createTextNode('By creating an account you agree to the '));
  agree.appendChild(createElement('a', { text: 'Terms', attributes: { href: 'terms.html', target: '_blank', rel: 'noopener' } }));
  agree.appendChild(document.createTextNode(' and the '));
  agree.appendChild(createElement('a', { text: 'Privacy Policy', attributes: { href: 'privacy.html', target: '_blank', rel: 'noopener' } }));
  agree.appendChild(document.createTextNode('.'));
  box.appendChild(agree);
  if (_declinedFor !== uid) {
    var later = button('Not now, keep playing as a guest', function () { _declinedFor = uid; deps.rerender(); return Promise.resolve(); });
    later.setAttribute('data-join-later', '1');
    box.appendChild(later);
  }
  body.appendChild(box);
  body.appendChild(note('Signed in as ' + status.email + (providerLabel(status.provider) ? ' with ' + providerLabel(status.provider) : '')));
  appendSignOutAndRemove(body, deps, false);
}

/** Two different things, kept apart: delete this app's account, or remove the login every app uses. */
function deleteLdAccountButton(deps) {
  var b = button('Delete my Language Dash account', function () {
    return askConfirm({ title: 'Delete your Language Dash account?', message: 'Delete your Language Dash account and its online data (profile, scores, friends, groups, cloud save, Pro and items you bought)? A subscription that is still billing is cancelled first. This cannot be undone. Your sign-in is kept (other apps may use it) and progress saved on this device stays.', confirmLabel: 'Delete my account', cancelLabel: 'Cancel', danger: true }).then(function (ok) {
      if (!ok) return;
      return deps.leaderboard.deleteLanguageDashAccount().then(function (res) {
        track('account_event', { action: 'delete_ld_requested', ok: !!res.success });
        deps.toast(res.success ? 'Your Language Dash account and its online data were deleted. You are still signed in; the login was kept.' : (res.error || 'Could not delete your Language Dash account.'));
        deps.rerender();
      });
    });
  }, 'btn-outline');
  b.setAttribute('data-delete-ld', '1');
  b.style.cssText = 'color:var(--accent-red);border-color:var(--accent-red);margin-left:8px';
  return b;
}

/** A dialog that only enables its button once the exact phrase is typed. Resolves true or false. */
function askTypedConfirmation(title, warning, phrase, confirmLabel) {
  return new Promise(function (resolve) {
    var overlay = createElement('div', { attributes: { role: 'dialog', 'aria-modal': 'true', 'aria-label': title, 'data-remove-signin-dialog': '1' } });
    overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:var(--scrim);display:flex;align-items:center;justify-content:center;padding:16px';
    var card = createElement('div');
    card.style.cssText = 'max-width:380px;width:100%;background:var(--card);color:var(--ink);border:2.5px solid var(--line);border-radius:10px;box-shadow:6px 6px 0 var(--line);padding:18px';
    card.appendChild(createElement('h3', { text: title }));
    var warn = createElement('p', { text: warning });
    warn.style.cssText = 'font-size:12px;color:var(--text-secondary);margin:6px 0 10px';
    card.appendChild(warn);
    var typed = input('text', 'Type ' + phrase + ' to confirm', 'off', phrase);
    typed.setAttribute('data-confirm-input', '1');
    card.appendChild(typed);
    var go = createElement('button', { className: 'btn btn-sm btn-outline', text: confirmLabel, attributes: { type: 'button', disabled: 'disabled', 'data-confirm-go': '1' } });
    go.style.cssText = 'color:var(--accent-red);border-color:var(--accent-red)';
    typed.addEventListener('input', function () { go.disabled = typed.value.trim() !== phrase; });
    var cancel = createElement('button', { className: 'btn btn-sm btn-outline', text: 'Cancel', attributes: { type: 'button', 'data-confirm-cancel': '1' } });
    cancel.style.marginLeft = '8px';
    go.addEventListener('click', function () { if (typed.value.trim() !== phrase) return; overlay.remove(); resolve(true); });
    cancel.addEventListener('click', function () { overlay.remove(); resolve(false); });
    card.appendChild(go);
    card.appendChild(cancel);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}

function removeSignInButton(deps) {
  var b = button('Remove my sign-in (all apps)', function () {
    return askTypedConfirmation(
      'Remove my sign-in (all apps)',
      'This removes the login you use to sign in, and that login is used by every app that shares it, not only Language Dash. Each app\u2019s data for this login may be deleted as a result. Your Language Dash account, its online data and any subscription are removed too. This cannot be undone. Progress saved on this device stays.',
      REMOVE_PHRASE,
      'Remove my sign-in'
    ).then(function (ok) {
      if (!ok) return null;
      return deps.leaderboard.removeSignIn(REMOVE_PHRASE).then(function (res) {
        track('account_event', { action: 'remove_signin_requested', ok: !!res.success });
        deps.toast(res.success ? 'Your sign-in was removed. You are now playing as a guest.' : (res.error || 'Could not remove your sign-in.'));
        deps.rerender();
      });
    });
  }, 'btn-outline');
  b.setAttribute('data-remove-signin', '1');
  b.style.cssText = 'color:var(--accent-red);border-color:var(--accent-red);margin-left:8px';
  return b;
}

/** Sign out, and the two separate, explicit removal actions (Apple guideline 5.1.1(v): reachable in the app). */
function appendSignOutAndRemove(body, deps, isMember) {
  var out = createElement('div');
  out.style.marginTop = '16px';
  if (isMember) out.appendChild(deleteLdAccountButton(deps));
  out.appendChild(removeSignInButton(deps));
  out.appendChild(button('Sign out', function () {
    var flush = deps.cloudSync && isMember ? deps.cloudSync.sync() : Promise.resolve();
    return flush.then(function () { return deps.leaderboard.signOut(); }).then(function (res) {
      track('account_event', { action: 'signout', ok: !!res.success });
      deps.toast(res.success ? 'Signed out. Your progress stays on this device.' : (res.error || 'Could not sign out.'));
      deps.rerender();
    });
  }));
  body.appendChild(out);
  var help = note(isMember
    ? 'Delete my Language Dash account removes only this app\u2019s data and keeps your login. Remove my sign-in removes the login itself, for every app that uses it.'
    : 'Remove my sign-in removes the login itself, for every app that uses it.');
  help.style.fontSize = '11px';
  body.appendChild(help);
}

function renderSignedIn(body, deps, status) {
  body.appendChild(note('Signed in as ' + status.email + (providerLabel(status.provider) ? ' with ' + providerLabel(status.provider) : ''), 'var(--accent-green)'));
  if (status.pendingEmail) {
    body.appendChild(note('Confirm ' + status.pendingEmail + ' from the email we sent to finish changing your address.', 'var(--accent-gold)'));
  }

  var sync = deps.cloudSync ? deps.cloudSync.getStatus() : null;
  if (sync) {
    var line;
    if (sync.state === 'syncing') line = '☁ Saving…';
    else if (sync.state === 'error') line = '⚠ Could not sync: ' + (sync.error || 'unknown error') + '. Your progress is safe on this device.';
    else line = '☁ Progress is saved to your account · last synced ' + timeAgo(sync.lastSyncedAt) + (sync.dirty ? ' · changes waiting' : '');
    body.appendChild(note(line, sync.state === 'error' ? 'var(--accent-red)' : null));
    body.appendChild(button('Sync now', function () {
      return deps.cloudSync.sync().then(function () { deps.rerender(); });
    }));
    body.appendChild(button('Restore my biggest earlier save', function () {
      return deps.cloudSync.restoreEarlierCloudSave().then(function (r) {
        deps.toast(r === 'none' ? 'No earlier save is kept for this account yet.' : 'Restored your biggest earlier save.');
        deps.rerender();
      }).catch(function (e) { deps.toast((e && e.message) || 'Could not restore.'); });
    }));
  }

  var heading = createElement('div', { text: 'Change password' });
  heading.style.cssText = 'margin:14px 0 6px;font-weight:700;font-size:13px';
  body.appendChild(heading);
  var pw = input('password', 'New password', 'new-password', 'New password (8+ characters)');
  body.appendChild(pw);
  body.appendChild(button('Update password', function () {
    return deps.leaderboard.updatePassword(pw.value).then(function (res) {
      deps.toast(res.success ? 'Password updated.' : (res.error || 'Could not update your password.'));
      if (res.success) pw.value = '';
    });
  }));

  appendSignOutAndRemove(body, deps, true);
}

/**
 * Ask which save to keep when this device and the account both have progress.
 * @returns {Promise<'cloud'|'local'|null>} null if dismissed
 */
export function askWhichSave(localSummary, cloudSummary) {
  return new Promise(function (resolve) {
    var overlay = createElement('div', { attributes: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Choose which progress to keep' } });
    overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:var(--scrim);display:flex;align-items:center;justify-content:center;padding:16px';
    var card = createElement('div');
    card.style.cssText = 'max-width:380px;width:100%;background:var(--card);color:var(--ink);border:2.5px solid var(--line);border-radius:10px;box-shadow:6px 6px 0 var(--line);padding:18px';
    card.appendChild(createElement('h3', { text: 'Which progress do you want?' }));
    var intro = createElement('p', { text: 'This device and your account both have progress. Pick one to keep. The other will be replaced.' });
    intro.style.cssText = 'font-size:12px;color:var(--text-secondary);margin:6px 0 12px';
    card.appendChild(intro);

    function option(title, summary, choice, cls) {
      var b = createElement('button', { className: 'btn btn-block ' + cls, attributes: { type: 'button' } });
      b.style.cssText = 'margin-bottom:8px;text-align:left';
      b.appendChild(createElement('div', { text: title }));
      var sub = createElement('div', {
        text: summary.answered.toLocaleString() + ' questions answered · ' + summary.coins.toLocaleString() + ' coins earned · best score ' + summary.best.toLocaleString()
      });
      sub.style.cssText = 'font-size:11px;font-weight:400;opacity:.85';
      b.appendChild(sub);
      b.addEventListener('click', function () { overlay.remove(); resolve(choice); });
      card.appendChild(b);
    }
    option('☁ Use my account progress', cloudSummary, 'cloud', 'btn-primary');
    option('📱 Keep this device’s progress', localSummary, 'local', 'btn-outline');

    var later = createElement('button', { className: 'btn btn-outline btn-sm', text: 'Decide later', attributes: { type: 'button' } });
    later.addEventListener('click', function () { overlay.remove(); resolve(null); });
    card.appendChild(later);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}
