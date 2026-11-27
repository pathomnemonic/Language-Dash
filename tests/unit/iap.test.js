import { describe, it, expect, vi } from 'vitest';
import { createIap } from '../../js/iap.js';

// The store connection itself (js/iap.js): a pending purchase must not wedge the product forever, a failed
// store start must not disable purchases for the whole session, and the price shown must be the regular one.

function fakePlugin(o) {
  o = o || {};
  const handlers = {};
  const products = {};
  const plugin = {
    Platform: { GOOGLE_PLAY: 'android-playstore', APPLE_APPSTORE: 'ios-appstore' },
    ProductType: { CONSUMABLE: 'consumable', PAID_SUBSCRIPTION: 'paid subscription', NON_CONSUMABLE: 'non consumable' },
    ErrorCode: { PAYMENT_CANCELLED: 6777006 },
    registered: [],
    store: {
      register(list) { plugin.registered.push(...list); },
      when() { const w = { approved(cb) { handlers.approved = cb; return w; }, finished(cb) { handlers.finished = cb; return w; } }; return w; },
      initialize() {
        if (o.failInit) return Promise.resolve([{ code: 1, message: 'store unavailable' }]);
        plugin.registered.forEach((d) => { products[d.id] = o.productFor ? o.productFor(d.id) : simpleProduct(d.id); });
        return Promise.resolve([]);
      },
      get(id) { return products[id]; },
      owned() { return false; },
      restorePurchases() { return Promise.resolve(undefined); },
      manageSubscriptions() { return Promise.resolve(undefined); },
      order(offer) {
        if (o.neverFinishes) return Promise.resolve(undefined); // the sheet opens and nothing ever comes back
        const id = offer.id.replace(/^o/, '');
        const t = { products: [{ id }], finish() { setTimeout(() => handlers.finished(t), 0); } };
        setTimeout(() => handlers.approved(t), 0);
        return Promise.resolve(undefined);
      }
    }
  };
  return plugin;
}

function simpleProduct(id) {
  return { id, offers: [{ id: 'o' + id, pricingPhases: [{ price: '$4.99', priceMicros: 4990000, currency: 'USD', billingPeriod: 'P1M', paymentMode: 'PayAsYouGo' }] }], getOffer() { return this.offers[0]; } };
}

const iapFor = (plugin) => { const iap = createIap({ platform: 'android', loadPlugin: () => Promise.resolve(plugin) }); iap.add([{ id: 'p', kind: 'subscription' }]); return iap; };

describe('order', () => {
  it('a purchase that never finishes times out instead of hanging, and the product can be ordered again', async () => {
    vi.useFakeTimers();
    try {
      const opts = { neverFinishes: true };
      const iap = iapFor(fakePlugin(opts));
      const first = iap.order('p');
      await vi.advanceTimersByTimeAsync(0);
      await expect(iap.order('p')).resolves.toEqual({ ok: false, error: 'busy' });   // still open: busy is right
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      await expect(first).resolves.toEqual({ ok: false, error: 'pending' });          // but it cannot hang forever
      opts.neverFinishes = false;
      const second = iap.order('p');
      await vi.advanceTimersByTimeAsync(1);
      await expect(second).resolves.toEqual({ ok: true });                            // and the product is not stuck on busy
    } finally { vi.useRealTimers(); }
  });

  it('a finished purchase still resolves ok', async () => {
    const iap = iapFor(fakePlugin());
    await expect(iap.order('p')).resolves.toEqual({ ok: true });
  });
});

describe('start', () => {
  it('a failed start is forgotten, so the next start tries the store again', async () => {
    const bad = fakePlugin({ failInit: true });
    const good = fakePlugin();
    let calls = 0;
    const iap = createIap({ platform: 'android', loadPlugin: () => Promise.resolve(++calls === 1 ? bad : good) });
    iap.add([{ id: 'p', kind: 'subscription' }]);
    await expect(iap.start()).resolves.toBe(false);
    await expect(iap.start()).resolves.toBe(true);
    expect(calls).toBe(2);
    await expect(iap.start()).resolves.toBe(true);   // a good start is kept, not repeated
    expect(calls).toBe(2);
  });
});

describe('price', () => {
  it('reports the regular ongoing price, not the introductory phase', async () => {
    const plugin = fakePlugin({
      productFor: (id) => ({
        id,
        offers: [{
          id: 'o' + id,
          pricingPhases: [
            { price: '$0.00', priceMicros: 0, currency: 'USD', billingPeriod: 'P7D', paymentMode: 'FreeTrial' },
            { price: '$0.99', priceMicros: 990000, currency: 'USD', billingPeriod: 'P1M', paymentMode: 'PayAsYouGo' },
            { price: '$4.99', priceMicros: 4990000, currency: 'USD', billingPeriod: 'P1M', paymentMode: 'PayAsYouGo' }
          ]
        }],
        getOffer() { return this.offers[0]; }
      })
    });
    const iap = iapFor(plugin);
    await iap.start();
    expect(iap.price('p')).toEqual({ price: '$4.99', micros: 4990000, currency: 'USD', period: 'P1M', trialDays: 7 });
  });
});
