/**
 * sharecard.js — a shareable image of a run result.
 *
 * Draws a 1080x1350 card on a canvas (no server, no external assets), then
 * shares it with the native share sheet when files are supported, or
 * downloads it.
 */

import { getSubjectStyle } from './game/subjectstyle.js';
import { saveFile } from './platform.js';

var W = 1080;
var H = 1350;

/**
 * Rank subjects by how many encounters they had (top three).
 * @param {{card?: {subj?: string}, ok?: boolean}[]} runCards
 * @returns {{subject: string, n: number, ok: number}[]}
 */
export function topSubjects(runCards) {
  var by = {};
  (runCards || []).forEach(function (r) {
    var subj = r && r.card && r.card.subj;
    if (!subj) return;
    by[subj] = by[subj] || { subject: subj, n: 0, ok: 0 };
    by[subj].n++;
    if (r.ok) by[subj].ok++;
  });
  return Object.keys(by).map(function (k) { return by[k]; })
    .sort(function (a, b) { return b.n - a.n; }).slice(0, 3);
}

/** "🔥 12-day streak · 340 words met": the long-term side of the story, only when there is something to say. */
export function shareFooterLine(data) {
  var bits = [];
  if ((data.streakDays || 0) >= 2) bits.push('🔥 ' + data.streakDays + '-day streak');
  if ((data.cardsMet || 0) >= 25) bits.push(Number(data.cardsMet).toLocaleString() + ' words met');
  return bits.join('  ·  ');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * @param {object} data
 * @param {string} data.name
 * @param {number} data.score
 * @param {number} data.correct
 * @param {number} data.wrong
 * @param {number} data.bestStreak
 * @param {string} data.modeLabel
 * @param {string} [data.trackName]
 * @param {{subject: string, n: number, ok: number}[]} [data.subjects]
 * @returns {Promise<Blob>}
 */
export function renderShareCard(data) {
  var canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  var ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas unavailable'));

  // Paper Passport: warm paper, navy ink, stamp red and teal, hard offset shadows (docs/DESIGN.md)
  var PAPER = '#F6EEDC', CARD = '#FFFBF2', INK = '#1B2A41', SOFT = '#4B5870', RED = '#C73B25', REDDEEP = '#B5341F', TEAL = '#0A7A78', GOLD = '#F2B134';
  var SERIF = '"Fraunces", "Iowan Old Style", "Palatino Linotype", Georgia, serif';
  var SANS = '"DM Sans", "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // faint dotted route across the paper
  ctx.strokeStyle = 'rgba(27,42,65,0.22)';
  ctx.lineWidth = 6;
  ctx.setLineDash([2, 18]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(60, 1200);
  ctx.quadraticCurveTo(300, 760, 560, 940);
  ctx.quadraticCurveTo(820, 1120, 1020, 700);
  ctx.stroke();
  ctx.setLineDash([]);

  // a card with a hard shadow and an ink outline
  function ticket(x, y, w, h, fill, r) {
    ctx.fillStyle = INK;
    roundRect(ctx, x + 10, y + 10, w, h, r);
    ctx.fill();
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  // header band
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 34, W, 6);

  ctx.textAlign = 'center';
  ctx.fillStyle = REDDEEP;
  ctx.font = '900 92px ' + SERIF;
  ctx.fillText('Language Dash', W / 2, 160);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(W / 2 - 200, 192); ctx.lineTo(W / 2 + 200, 192); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2 - 200, 204); ctx.lineTo(W / 2 + 200, 204); ctx.stroke();
  ctx.font = 'italic 500 34px ' + SANS;
  ctx.fillStyle = SOFT;
  ctx.fillText('Run the lexicon.', W / 2, 258);

  // Player + mode
  ctx.fillStyle = INK;
  ctx.font = '900 54px ' + SERIF;
  ctx.fillText((data.name || 'A new Wordrunner').slice(0, 24), W / 2, 350);
  ctx.fillStyle = TEAL;
  ctx.font = '700 32px ' + SANS;
  ctx.fillText((data.modeLabel + (data.trackName ? '  ·  ' + data.trackName : '')).toUpperCase(), W / 2, 402);

  // Big score: a stamp
  ctx.save();
  ctx.translate(W / 2, 560);
  ctx.rotate(-0.045);
  var scoreText = Number(data.score || 0).toLocaleString();
  ctx.font = '900 190px ' + SERIF;
  var sw = Math.min(ctx.measureText(scoreText).width + 110, W - 160);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 9;
  roundRect(ctx, -sw / 2, -140, sw, 230, 18);
  ctx.stroke();
  ctx.lineWidth = 3;
  roundRect(ctx, -sw / 2 + 18, -122, sw - 36, 194, 12);
  ctx.stroke();
  ctx.fillStyle = REDDEEP;
  ctx.fillText(scoreText, 0, 42, sw - 60);
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.font = '700 36px ' + SANS;
  ctx.fillText('POINTS', W / 2, 715);

  // Stat stubs
  var total = (data.correct || 0) + (data.wrong || 0);
  var accuracy = total > 0 ? Math.round((data.correct || 0) / total * 100) : 0;
  var stats = [
    [accuracy + '%', 'Accuracy', GOLD],
    [String(data.bestStreak || 0), 'Best streak', '#5DA9D6'],
    [String(data.correct || 0), 'Correct', CARD]
  ];
  stats.forEach(function (s, i) {
    var x = 70 + i * 316;
    ticket(x, 770, 270, 200, CARD, 16);
    ctx.fillStyle = s[2];
    roundRect(ctx, x + 3, 773, 264, 14, 6);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = '900 84px ' + SERIF;
    ctx.fillText(s[0], x + 135, 884);
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(x + 18, 910); ctx.lineTo(x + 252, 910); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = SOFT;
    ctx.font = '700 28px ' + SANS;
    ctx.fillText(s[1].toUpperCase(), x + 135, 950);
  });

  // Top topics
  var subjects = data.subjects || [];
  if (subjects.length) {
    ctx.fillStyle = SOFT;
    ctx.font = '700 28px ' + SANS;
    ctx.fillText('MOST PLAYED', W / 2, 1042);
    var slot = W / subjects.length;
    subjects.forEach(function (s, i) {
      var cx = slot * i + slot / 2;
      ctx.font = '76px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
      ctx.fillStyle = INK;
      ctx.fillText(getSubjectStyle(s.subject).icon, cx, 1130);
      ctx.font = '700 28px ' + SANS;
      ctx.fillStyle = INK;
      ctx.fillText(s.subject.length > 18 ? s.subject.slice(0, 17) + '…' : s.subject, cx, 1182);
    });
  }

  var line = shareFooterLine(data);
  if (line) {
    ctx.fillStyle = REDDEEP;
    ctx.font = '700 34px ' + SANS;
    ctx.fillText(line, W / 2, 1245);
  }
  ctx.fillStyle = INK;
  ctx.font = '900 40px ' + SERIF;
  ctx.fillText('Can you beat it?', W / 2, 1302);

  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (blob) resolve(blob); else reject(new Error('Could not encode image'));
    }, 'image/png');
  });
}

/**
 * Share the image if the device supports sharing files, else download it.
 * @param {Blob} blob
 * @returns {Promise<'shared'|'downloaded'>}
 */
export function shareOrDownload(blob) {
  var file = null;
  try { file = new File([blob], 'dx-dash-result.png', { type: 'image/png' }); } catch (e) { file = null; }
  // Browsers that can share a file get the share sheet; everywhere else (including the phone app) saveFile
  // writes it out and opens the system share sheet or downloads it.
  if (file && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    return navigator.share({ files: [file], title: 'Language Dash result' }).then(function () { return 'shared'; }, function (e) {
      if (e && e.name === 'AbortError') return 'shared';
      throw e;
    });
  }
  return saveFile(blob, 'dx-dash-result.png').then(function (how) {
    if (how === 'failed') throw new Error('Could not save the image');
    return how;
  });
}
