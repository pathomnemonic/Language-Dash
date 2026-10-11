// tools/make-app-assets.mjs
// Draws the app icon, splash and store images from the Language Dash rubber-stamp mark (tools/brand.mjs, "Paper Passport").
//
//   node tools/make-app-assets.mjs && npx capacitor-assets generate --android
//
// Writes: assets/*.png (icon + splash sources), public/icon.svg, public/og.png,
// and assets/store/* (Google Play feature graphic). Screenshots: node tools/make-screenshots.mjs

import sharp from 'sharp';
import fs from 'node:fs';
import { PAPER, INK, RED, RED_DEEP, TEAL, TEAL_DEEP, GOLD, NIGHT, mark, text, route } from './brand.mjs';

fs.mkdirSync('assets/store', { recursive: true });
const svg = (w, h, inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);
const png = async (path, buf, w, h = w) => { await sharp(buf).resize(w, h).png().toFile(path); console.log('wrote ' + path); };

// Full icon (iOS and legacy Android): the stamp on a teal square, a dotted route behind it
await png('assets/icon-only.png', svg(1024, 1024, `<rect width="1024" height="1024" fill="${TEAL}"/>${route(1024, 1024, PAPER, 0.4)}${mark(1024, 0.8)}`), 1024);
// Adaptive icon layers (Android): the teal background plus the stamp inside the safe zone
await png('assets/icon-background.png', svg(1024, 1024, `<rect width="1024" height="1024" fill="${TEAL}"/>${route(1024, 1024, PAPER, 0.4)}`), 1024);
await png('assets/icon-foreground.png', svg(1024, 1024, mark(1024, 0.58)), 1024);
// The website icon
fs.writeFileSync('public/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="${TEAL}"/>${mark(512, 0.82)}</svg>\n`);
console.log('wrote public/icon.svg');

// Splash: paper (and Night Train for dark), the stamp, the name, a dotted route
const splash = (dark) => {
  const bg = dark ? NIGHT : PAPER;
  const ink = dark ? '#F6EEDC' : INK;
  const soft = dark ? '#B7C0D1' : '#4B5870';
  const stampInk = dark ? '#F0654D' : RED;
  const stampText = dark ? '#FF8F7B' : RED_DEEP;
  return svg(2732, 2732, `<rect width="2732" height="2732" fill="${bg}"/>${route(2732, 2732, ink, dark ? 0.22 : 0.18)}` +
    mark(2732, 0.34, 1366, 1180, { shadow: dark ? '#04080F' : INK, ink: stampInk, text: stampText, paper: dark ? '#1B2A41' : PAPER, ringInk: ink }) +
    text('Tagline', 96, 1366, 1900, soft) +
    `<path d="M${1366 - 160} 1990h320" stroke="${stampInk}" stroke-width="10" stroke-linecap="round"/><path d="M${1366 - 160} 2012h320" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`);
};
await png('assets/splash.png', splash(false), 2732);
await png('assets/splash-dark.png', splash(true), 2732);

// Wide banner: Google Play feature graphic (1024x500) and the link-preview card (1200x630): paper, a teal band, the stamp and the name
const banner = (w, h) => {
  const nameSize = Math.min(w * 0.095, 118);
  const left = w * 0.43;
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${PAPER}"/>${route(w, h, INK, 0.2)}` +
    `<rect width="${w}" height="${h * 0.06}" fill="${TEAL_DEEP}"/><rect y="${h * 0.06}" width="${w}" height="${Math.max(3, h * 0.008)}" fill="${INK}"/>` +
    mark(h, 0.7, w * 0.215, h * 0.53) +
    text('Language', nameSize, left, h * 0.42, RED_DEEP, { anchor: 'start' }) +
    text('Dash', nameSize, left, h * 0.42 + nameSize * 1.05, RED_DEEP, { anchor: 'start' }) +
    text('Tagline', h * 0.075, left, h * 0.42 + nameSize * 1.05 + h * 0.14, INK, { anchor: 'start' }) +
    `<rect x="${left}" y="${h * 0.8}" width="${Math.min(w * 0.5, 560)}" height="${h * 0.095}" rx="8" fill="${GOLD}" stroke="${INK}" stroke-width="${Math.max(3, h * 0.008)}"/>` +
    text('ADMIT', h * 0.045, left + Math.min(w * 0.5, 560) / 2, h * 0.8 + h * 0.062, INK) +
    '');
};
await png('assets/store/feature-graphic.png', banner(1024, 500), 1024, 500);
await png('public/og.png', banner(1200, 630), 1200, 630);
