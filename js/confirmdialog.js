/**
 * confirmdialog.js — an in-page "Are you sure?" that works everywhere.
 *
 * The browser's own confirm() is blocked or silently answered "no" in some embedded browsers and automated test
 * browsers, which makes a button that depends on it look dead. This is a small labelled dialog drawn by the page:
 * focus goes to the safe button, Escape and a tap outside cancel, and focus returns to where it was.
 */

import { createElement } from './dom.js';

/**
 * @param {{title?: string, message: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean}} o
 * @returns {Promise<boolean>} true when the player confirms, false when they cancel or dismiss
 */
export function askConfirm(o) {
  return new Promise(function (resolve) {
    var opener = document.activeElement;
    var overlay = createElement('div', { className: 'confirm-overlay', attributes: { 'data-confirm-dialog': '1' } });
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.55)';
    var box = createElement('div', { className: 'confirm-box', attributes: { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'confirmTitle', 'aria-describedby': 'confirmMsg' } });
    box.style.cssText = 'max-width:360px;width:100%;background:var(--bg-card-solid,#fff);color:inherit;border:3px solid var(--ink,#1b1030);border-radius:14px;padding:16px;box-shadow:0 4px 0 var(--ink,#1b1030)';
    var title = createElement('div', { text: o.title || 'Are you sure?', attributes: { id: 'confirmTitle' } });
    title.style.cssText = 'font-weight:800;font-size:16px;margin-bottom:6px';
    var msg = createElement('div', { text: o.message, attributes: { id: 'confirmMsg' } });
    msg.style.cssText = 'font-size:14px;margin-bottom:14px;line-height:1.4';
    var row = createElement('div');
    row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap';
    var cancel = createElement('button', { className: 'btn btn-outline', text: o.cancelLabel || 'Cancel', attributes: { type: 'button', 'data-confirm-no': '1' } });
    var ok = createElement('button', { className: 'btn ' + (o.danger ? 'btn-red' : 'btn-primary'), text: o.confirmLabel || 'OK', attributes: { type: 'button', 'data-confirm-yes': '1' } });
    row.appendChild(cancel);
    row.appendChild(ok);
    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(row);
    overlay.appendChild(box);

    var done = false;
    function finish(v) {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      try { if (opener && opener.focus) opener.focus(); } catch (e) { /* the opener may be gone */ }
      resolve(v);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
      else if (e.key === 'Tab') {   // keep focus inside the dialog
        var items = [cancel, ok];
        var i = items.indexOf(document.activeElement);
        e.preventDefault();
        items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
      }
    }
    cancel.addEventListener('click', function () { finish(false); });
    ok.addEventListener('click', function () { finish(true); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) finish(false); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    cancel.focus();   // the safe choice has focus
  });
}
