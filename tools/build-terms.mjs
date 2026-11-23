// Builds public/terms.html from store/terms-of-service.md (everything above the first "---" rule is a drafting note and the
// owner-decisions block after the second "---" is left out). Run it when the terms go live and give it that day's date:
//   node tools/build-terms.mjs --date "24 November 2026"
import { readFileSync, writeFileSync } from 'node:fs';

var args = process.argv.slice(2);
var di = args.indexOf('--date');
var date = di >= 0 ? args[di + 1] : '';
if (!date) { console.error('Give the go-live date: --date "24 November 2026"'); process.exit(1); }

var md = readFileSync(new URL('../store/terms-of-service.md', import.meta.url), 'utf8');
var parts = md.split(/\n---\n/);
var body = parts[1].replace('[DATE: stamped when the page goes live]', date);
if (/\[[A-Z][^\]]*\]/.test(body.replace(/\[([^\]]+)\]\(/g, ''))) { console.error('Unresolved [PLACEHOLDER] left in the terms: fix store/terms-of-service.md first.'); process.exit(1); }

var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
var inline = function (s) {
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s)<]+[^\s).,<])/g, '$1<a href="$2" rel="noopener">$2</a>');
  return s;
};
var out = [], list = false;
body.split('\n').forEach(function (line) {
  var m;
  if ((m = line.match(/^- (.*)$/))) { if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + inline(m[1]) + '</li>'); return; }
  if (list) { out.push('</ul>'); list = false; }
  if ((m = line.match(/^# (.*)$/))) out.push('<h1>' + inline(m[1]) + '</h1>');
  else if ((m = line.match(/^## (.*)$/))) out.push('<h2>' + inline(m[1]) + '</h2>');
  else if (/^\*\*Language Dash\*\* ·/.test(line)) out.push('<p class="meta">' + inline(line.replace(/\*\*/g, '')) + '</p>');
  else if (line.trim()) out.push('<p>' + inline(line) + '</p>');
});
if (list) out.push('</ul>');

var old = readFileSync(new URL('../public/terms.html', import.meta.url), 'utf8');
var head = old.slice(0, old.indexOf('<main>') + 6);
var tail = '\n<p class="meta"><a href="index.html">&larr; Back to the game</a> &middot; <a href="privacy.html">Privacy Policy (this app)</a></p>\n</main>\n</body>\n</html>\n';
writeFileSync(new URL('../public/terms.html', import.meta.url), head + '\n' + out.join('\n') + tail);
console.log('public/terms.html written, dated ' + date);
