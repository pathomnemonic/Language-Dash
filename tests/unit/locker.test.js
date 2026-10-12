import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

// The Locker separates characters that can be customized from those that cannot.

function loadPage() {
  const html = readFileSync('index.html', 'utf8');
  const body = html.slice(html.indexOf('<body'), html.indexOf('</body>'));
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
}

const headings = () => [...document.querySelectorAll('#shopItems h3')].map((h) => h.textContent);
const clickTab = (label) => [...document.querySelectorAll('#shopItems [role="tab"]')].find((b) => b.textContent.includes(label)).click();

describe('Locker tabs', () => {
  let ui;
  let storage;
  beforeEach(async () => {
    localStorage.clear();
    loadPage();
    ({ ui } = await import('../../js/ui.js'));
    ({ storage } = await import('../../js/storage.js'));
    ui._lockerTab = 'heroes';
  });

  it('lists the heroes, and keeps the archived classic ones out of sight', () => {
    ui.renderShop();
    expect(headings()).toEqual([expect.stringContaining('Heroes')]);
    const text = document.getElementById('shopItems').textContent;
    expect(text).not.toMatch(/classic|blocky|3D/i);
    expect(text).not.toMatch(/vehicle/i);
    const groups = [...document.querySelectorAll('#shopItems h3')].map((h) => h.parentElement.textContent);
    expect(groups[0]).toContain('Fika Fox');
    ['Nurse', 'Surgeon Sage', 'Skeleton', 'Zombie', 'Robot Medic', 'Ambulance', 'Race Car', 'Hearse', 'Tiago', 'Klara'].forEach((n) => expect(text).not.toContain(n));
  });

  it('the old monsters are archived too', () => {
    ui.renderShop();
    clickTab('Monsters');
    const text = document.getElementById('shopItems').textContent;
    ['Pager Wraith', 'Textbook Golem', 'Caffeine Kraken', 'The Mumble'].forEach((n) => expect(text).not.toContain(n));
    expect(text).not.toMatch(/Exam Monster(?!s)/);
    expect(text).toContain('The Blot');
  });

  it('a character gets color pickers for its own parts, but no headwear', () => {
    storage.data.progression.ownedItems.push('hero_llama');
    storage.data.progression.equipped.skin = 'hero_llama';
    ui._lockerTab = 'heroes';
    ui._heroColorsOpen = true;
    ui.renderShop();
    expect(document.getElementById('shopItems').textContent).toMatch(/Lola Llama colors/);
    const parts = [...document.querySelectorAll('#shopItems .color-part')].map((p) => p.getAttribute('data-part'));
    expect(parts).toEqual(['wool', 'face', 'hooves']);
    expect(document.querySelectorAll('#shopItems .scrub-swatch').length).toBeGreaterThan(8);
    expect(headings().join('|')).not.toContain('Headwear');
    expect(headings().join('|')).not.toContain('Clothing');
  });

  it('every part also has a rainbow swatch that opens a full color wheel and saves any color picked on it', () => {
    HTMLCanvasElement.prototype.getContext = () => null;
    storage.data.progression.ownedItems.push('hero_llama');
    storage.data.progression.equipped.skin = 'hero_llama';
    ui._lockerTab = 'heroes';
    ui._heroColorsOpen = true;
    ui.renderShop();
    const part = document.querySelector('#shopItems .color-part[data-part="wool"]');
    const rainbow = part.querySelector('.scrub-custom');
    expect(rainbow).not.toBeNull();
    expect(part.querySelector('.color-wheel')).toBeNull();
    rainbow.click();
    expect(part.querySelector('.color-wheel')).not.toBeNull();
    const field = part.querySelector('.cw-hex');
    field.value = '#12ab34';
    field.dispatchEvent(new Event('change'));
    expect(storage.get('modelColors').hero_llama.wool).toBe(0x12ab34);
    expect(rainbow.classList.contains('on')).toBe(true);
    // a palette swatch afterwards takes over again
    part.querySelector('.scrub-swatch[title="Chocolate"]').click();
    expect(storage.get('modelColors').hero_llama.wool).toBe(0x5a3a24);
    expect(rainbow.classList.contains('on')).toBe(false);
    // closing and reopening the wheel keeps one wheel
    rainbow.click();
    expect(part.querySelector('.cw-panel').hidden).toBe(true);
    rainbow.click();
    expect(part.querySelectorAll('.color-wheel').length).toBe(1);
  });

  it('a color that is not in the palette is shown as chosen when the Locker opens', () => {
    storage.data.progression.ownedItems.push('hero_llama');
    storage.data.progression.equipped.skin = 'hero_llama';
    storage.data.settings.modelColors = { hero_llama: { wool: 0x12ab34 } };
    ui._lockerTab = 'heroes';
    ui._heroColorsOpen = true;
    ui.renderShop();
    const part = document.querySelector('#shopItems .color-part[data-part="wool"]');
    expect(part.querySelector('.scrub-custom').classList.contains('on')).toBe(true);
    expect(part.querySelectorAll('.scrub-swatch.on').length).toBe(1);
  });

  it('a 🎨 beside the characters that can be recolored takes you to their colors (equipping them first)', () => {
    storage.data.progression.ownedItems.push('hero_zebra');
    storage.data.progression.equipped.skin = 'avatar_intern';
    ui._lockerTab = 'heroes';
    ui._heroColorsOpen = false;
    ui.renderShop();
    const paints = [...document.querySelectorAll('#shopItems [data-paint]')].map((b) => b.getAttribute('data-paint'));
    expect(paints).toContain('avatar_intern');
    expect(paints).toContain('hero_zebra');
    ['hero_llama', 'hero_pug', 'hero_cow', 'hero_sheep', 'hero_pig', 'hero_horse', 'hero_kimono'].forEach((id) => expect(paints).toContain(id));
    expect(document.getElementById('shopItems').textContent).toMatch(/🎨 beside a hero/);
    // one it does not own yet: dimmed, and tapping it only explains
    storage.data.progression.ownedItems = storage.data.progression.ownedItems.filter((i) => i !== 'hero_zebra');
    ui.renderShop();
    document.querySelector('[data-paint="hero_zebra"]').click();
    expect(storage.get('equipped').skin).toBe('avatar_intern');
    expect(ui._heroColorsOpen).toBeFalsy();
    // an owned one: equip it and open its colors, on the same tab
    storage.data.progression.ownedItems.push('hero_zebra');
    ui.renderShop();
    document.querySelector('[data-paint="hero_zebra"]').click();
    expect(storage.get('equipped').skin).toBe('hero_zebra');
    expect(ui._lockerTab).toBe('heroes');
    expect(ui._heroColorsOpen).toBe(true);
    expect(document.getElementById('shopItems').textContent).toMatch(/Zola Zebra-Crossing colors/);
  });

  it('a delisted hero is hidden unless you already own one (nothing is delisted at the moment)', async () => {
    const { DELISTED_HEROES } = await import('../../js/game/shopdata.js');
    expect(DELISTED_HEROES).toEqual([]);
    ui._lockerTab = 'heroes';
    ui._heroColorsOpen = false;
    ui.renderShop();
    expect(document.getElementById('shopItems').textContent).toMatch(/Clara Cowbell/);
  });

  it('a classic character gets colors, clothing, headwear and gear', () => {
    storage.data.progression.equipped.skin = 'avatar_classic';
    ui._lockerTab = 'heroes';
    ui._heroColorsOpen = true;
    ui.renderShop();
    const h = headings().join('|');
    ['Colors', 'Clothing', 'Headwear', 'Gear'].forEach((name) => expect(h).toContain(name));
  });

  it('vehicles cannot be customized', () => {
    storage.data.progression.equipped.skin = 'avatar_ambulance';
    ui._lockerTab = 'heroes';
    ui._heroColorsOpen = true;
    ui.renderShop();
    expect(headings().join('|')).not.toContain('Headwear');
    expect(document.getElementById('shopItems').textContent).toMatch(/Vehicles cannot wear anything/);
  });

  it('five even tabs on one line: Heroes, Wardrobe, Trails, Maps and Monsters (the shelved study buddies have no tab; the colors belong to the hero, not a tab of their own)', () => {
    storage.data.progression.equipped.skin = 'avatar_intern';
    ui._heroColorsOpen = false;
    ui.renderShop();
    const tabs = [...document.querySelectorAll('#shopItems [role="tab"]')].map((b) => b.textContent.trim());
    expect(tabs).toEqual(['🦸Heroes', '👒Wardrobe', '✨Trails', '🗺️Maps', '👾Monsters']);
    expect(document.querySelector('#shopItems .locker-tabs')).not.toBeNull();
    expect(tabs.join('|')).not.toMatch(/Customize/);
    // the hero card carries the colors toggle
    expect(document.getElementById('heroColorsToggle').textContent).toMatch(/Change colors/);
    expect(document.querySelector('#shopItems .color-part')).toBeNull(); // closed until asked
    document.getElementById('heroColorsToggle').click();
    expect(document.querySelectorAll('#shopItems .color-part').length).toBe(1);
    expect(document.getElementById('heroColorsToggle').textContent).toMatch(/Hide colors/);
  });

  it('trails and monsters each have their own tab', () => {
    ui.renderShop();
    clickTab('Trails');
    expect(headings().join('|')).toContain('Trails');
    expect(headings().join('|')).not.toContain('The Hush and Co.');
    clickTab('Monsters');
    expect(headings().join('|')).toContain('The Hush and Co.');
    expect(headings().join('|')).not.toContain('Trails');
  });

});

describe('the Locker shows every hero under its own name', () => {
  it('each row in the Heroes list carries the name from the hero catalog (including Fika Fox, the starter)', async () => {
    localStorage.clear();
    loadPage();
    const { ui } = await import('../../js/ui.js');
    const { CHARACTER_MODELS } = await import('../../js/game/modelcatalog.js');
    const { isDelisted } = await import('../../js/game/shopdata.js');
    ui._lockerTab = 'heroes';
    ui.renderShop();
    const text = document.getElementById('shopItems').textContent;
    CHARACTER_MODELS.filter((m) => !isDelisted(m.id)).forEach((m) => expect(text, m.name).toContain(m.name));
    expect(text).not.toMatch(/\bIntern\b/);
  });
});
