// tools/make-app-assets.mjs
// Draws the splash and store images from the Language Dash rubber-stamp mark (tools/brand.mjs, "Paper Passport"),
// and derives the app icon rasters from the settled icon master, public/icon.svg (the neon slot machine).
//
//   node tools/make-app-assets.mjs && npx capacitor-assets generate --android
//
// Writes: assets/*.png (icon + splash sources), public/og.png,
// and assets/store/* (Google Play feature graphic). Screenshots: node tools/make-screenshots.mjs

import sharp from 'sharp';
import fs from 'node:fs';
import { PAPER, INK, RED, RED_DEEP, TEAL_DEEP, GOLD, NIGHT, mark, text, route } from './brand.mjs';

fs.mkdirSync('assets/store', { recursive: true });
const svg = (w, h, inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);
const png = async (path, buf, w, h = w) => { await sharp(buf).resize(w, h).png().toFile(path); console.log('wrote ' + path); };

// App icon: the settled neon slot machine (three gates, É Ω Ñ). public/icon.svg is the master;
// the rasters below are derived from it. Ground colour #170430.
// Full icon (iOS and legacy Android): the master flattened on its ground colour
const ICON_GROUND = { r: 0x17, g: 0x04, b: 0x30, alpha: 1 };
const iconSvg = fs.readFileSync('public/icon.svg');
await sharp(iconSvg).resize(1024, 1024).flatten({ background: ICON_GROUND }).ensureAlpha().png().toFile('assets/icon-only.png');
console.log('wrote assets/icon-only.png');
// Adaptive icon layers (Android): the ground colour, plus the machine inside the safe zone.
// The foreground drops the master's ground rect so the machine sits on the background layer.
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: ICON_GROUND } }).png().toFile('assets/icon-background.png');
console.log('wrote assets/icon-background.png');
const iconArt = Buffer.from(iconSvg.toString('utf8').replace(/<rect[^>]*fill="#170430"\/>/, ''));
const iconFg = await sharp(iconArt).resize(676, 676).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: iconFg, left: 174, top: 174 }]).png().toFile('assets/icon-foreground.png');
console.log('wrote assets/icon-foreground.png');

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
