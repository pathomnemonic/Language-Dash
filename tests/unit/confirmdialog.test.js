// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { askConfirm } from '../../js/confirmdialog.js';

describe('the in-page confirm dialog', () => {
  beforeEach(() => { document.body.innerHTML = '<button id="opener">open</button>'; });
  const q = (s) => document.querySelector(s);

  it('is a labelled dialog with the safe button focused, and resolves true only on the confirm button', async () => {
    document.getElementById('opener').focus();
    const p = askConfirm({ title: 'T', message: 'Really?', confirmLabel: 'Yes do it', danger: true });
    expect(q('[role="alertdialog"]').getAttribute('aria-modal')).toBe('true');
    expect(q('#confirmMsg').textContent).toBe('Really?');
    expect(document.activeElement).toBe(q('[data-confirm-no]'));
    q('[data-confirm-yes]').click();
    expect(await p).toBe(true);
    expect(q('[data-confirm-dialog]')).toBeNull();
    expect(document.activeElement).toBe(document.getElementById('opener'));
  });

  it('resolves false on Cancel, on Escape and on a tap outside, and never leaves a dialog behind', async () => {
    let p = askConfirm({ message: 'a' });
    q('[data-confirm-no]').click();
    expect(await p).toBe(false);
    p = askConfirm({ message: 'b' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await p).toBe(false);
    p = askConfirm({ message: 'c' });
    q('[data-confirm-dialog]').click();
    expect(await p).toBe(false);
    expect(document.querySelectorAll('[data-confirm-dialog]').length).toBe(0);
  });
});
