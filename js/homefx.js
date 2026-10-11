/**
 * homefx.js — a few postage stamps, airmail envelopes and boarding passes drifting slowly behind Home.
 *
 * Paper Passport (docs/DESIGN.md): no flying objects over the menus except these. Each one is a plain styled box (see
 * .flyer in css/base.css) that wanders a short way across the page, turns a little, fades in and out, and then comes back
 * as something else somewhere else. It is a cheap CSS animation (transform and opacity only), it sits behind everything,
 * it pauses when the page is hidden, and for anyone who asked for reduced motion the same few objects just sit still.
 */

/** The marks printed on the stamps: letters from the alphabets the game teaches, so nothing is an empty box on older phones. */
export var STAMP_GLYPHS = ['A', 'あ', 'Я', 'ع', '한', 'ñ', 'ß', '字', 'अ', 'é'];

/** What drifts by. Stamps are the most common. */
export var FLYER_KINDS = ['stamp', 'stamp', 'envelope', 'pass'];

var TONES = ['var(--red)', 'var(--teal)', 'var(--plum)', 'var(--sky)'];
var COUNT = 7;

function between(lo, hi, rand) { return lo + (hi - lo) * rand(); }
function pick(list, rand) { return list[Math.min(list.length - 1, Math.floor(rand() * list.length))]; }

/**
 * New random look and path for one flyer.
 * @param {function(): number} rand
 * @returns {{kind: string, glyph: string, tone: string, x: number, y: number, dx: number, dy: number, size: number, rot0: number, rot1: number, dur: number}}
 *   x/y: where it starts, in % of the screen; dx/dy: how far it drifts, in vw/vh; size in px; rot in degrees; dur in seconds
 */
export function randomFlight(rand) {
  rand = rand || Math.random;
  var kind = pick(FLYER_KINDS, rand);
  var rot0 = Math.round(between(-18, 18, rand));
  return {
    kind: kind,
    glyph: kind === 'envelope' ? '' : pick(STAMP_GLYPHS, rand),
    tone: pick(TONES, rand),
    x: Math.round(between(4, 86, rand)),
    y: Math.round(between(8, 82, rand)),
    dx: Math.round(between(-22, 22, rand)),
    dy: Math.round(between(-16, 16, rand)),
    size: Math.round(between(40, 66, rand)),
    rot0: rot0,
    rot1: rot0 + Math.round(between(-14, 14, rand)),
    dur: +between(36, 70, rand).toFixed(1)
  };
}

function apply(el, f) {
  el.className = 'flyer ' + f.kind;
  el.textContent = f.glyph;
  el.style.setProperty('--x', f.x + '%');
  el.style.setProperty('--y', f.y + '%');
  el.style.setProperty('--dx', f.dx + 'vw');
  el.style.setProperty('--dy', f.dy + 'vh');
  el.style.setProperty('--size', f.size + 'px');
  el.style.setProperty('--rot0', f.rot0 + 'deg');
  el.style.setProperty('--rot1', f.rot1 + 'deg');
  el.style.setProperty('--dur', f.dur + 's');
  el.style.setProperty('--tone', f.tone);
}

/**
 * Fill a layer with flyers.
 * @param {HTMLElement} layer
 * @param {{reducedMotion?: boolean, rand?: function(): number, count?: number}} [options]
 * @returns {{stop: function(): void}}
 */
export function mountFlyers(layer, options) {
  options = options || {};
  var rand = options.rand || Math.random;
  while (layer.firstChild) layer.removeChild(layer.firstChild);
  var still = !!options.reducedMotion;
  layer.classList.toggle('static', still);

  var n = options.count || (still ? 5 : COUNT);
  for (var i = 0; i < n; i++) {
    var el = document.createElement('span');
    el.setAttribute('aria-hidden', 'true');
    apply(el, randomFlight(rand));
    if (!still) {
      // spread the starting points over a whole cycle so the page is not empty at first
      el.style.animationDelay = '-' + (rand() * 40).toFixed(1) + 's';
      // every time it finishes a pass, it comes back as something else, somewhere else
      el.addEventListener('animationiteration', function (e) {
        var node = e.currentTarget;
        node.style.animationDelay = '0s';
        node.style.animation = 'none';
        void node.offsetWidth;
        node.style.animation = '';
        apply(node, randomFlight(rand));
      });
    }
    layer.appendChild(el);
  }
  if (still) return { stop: function () { while (layer.firstChild) layer.removeChild(layer.firstChild); } };

  function onVisibility() { layer.classList.toggle('paused', document.hidden); }
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();

  return {
    stop: function () {
      document.removeEventListener('visibilitychange', onVisibility);
      while (layer.firstChild) layer.removeChild(layer.firstChild);
    }
  };
}
