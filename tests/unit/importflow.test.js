import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { ankiImport } from '../../js/ankiimport.js';
import { buildAiPrompt, parseAiReply, FORMAT_EXAMPLE } from '../../js/importguide.js';
import { SUBJECTS, validateCard } from '../../js/cardschema.js';

const sample = readFileSync('tests/fixtures/anki-export-sample.txt', 'utf8');
const aiReply = readFileSync('tests/fixtures/ai-reply-sample.txt', 'utf8');

describe('Anki "Notes in Plain Text" export', () => {
  it('drops the metadata columns and HTML, keeps front and back, splits clozes', () => {
    const r = ankiImport.parseDelimitedText(sample);
    const fronts = r.cards.map((c) => c.front);
    expect(fronts[0]).toBe('dog / (an animal)');
    expect(r.cards[0].back).toBe('perro / el perro corre');
    expect(r.cards[1].back).toBe('comer (verb)');
    // the cloze note became two cards
    expect(r.cards.filter((c) => /dog|bread/.test(c.front) && /\[/.test(c.front)).length).toBe(2);
    // nothing carries the GUID, note type, deck or tags
    r.cards.forEach((c) => expect(c.front + c.back).not.toMatch(/gT3k|Basic|Cloze|Spanish::|food verbs/));
    // the quoted field with a comma
    expect(r.cards.find((c) => /hello, hi/.test(c.front)).back).toMatch(/^hola/);
    // the picture-only note is skipped, with a reason, rather than imported as "[image]"
    expect(r.cards.some((c) => /Image occlusion/.test(c.front))).toBe(false);
    expect(r.warnings.join(' ')).toMatch(/picture/);
  });
  it('skips a Front,Back header row and says when a row is half empty', () => {
    const r = ankiImport.parseDelimitedText('Front,Back\ndog,perro\ncat,\n');
    expect(r.cards).toEqual([{ front: 'dog', back: 'perro' }]);
    expect(r.warnings.join(' ')).toMatch(/one side is empty|only a picture/);
  });
  it('reads the example shown in the app', () => {
    expect(ankiImport.parseDelimitedText(FORMAT_EXAMPLE).cards.length).toBe(3);
  });
  it('reads semicolon exports', () => {
    const r = ankiImport.parseDelimitedText('#separator:semicolon\ndog;perro\ncat;gato\n');
    expect(r.cards.length).toBe(2);
  });
});

describe('the AI prompt', () => {
  it('names the language pair, and asks for word pairs, not clinical cards', () => {
    const p = buildAiPrompt({ known: 'en', target: 'ja' });
    expect(p).toMatch(/I speak English and I am learning Japanese/);
    expect(p).toMatch(/word pairs/);
    expect(p).not.toMatch(/medical|USMLE|diagnos/i);
  });
  it('names every real subject and the exact field names the importer reads', () => {
    const p = buildAiPrompt();
    SUBJECTS.forEach((s) => expect(p).toContain('"' + s + '"'));
    ['"subj"', '"bw"', '"ans"', '"d"', '"tp"', '"ww"'].forEach((f) => expect(p).toContain(f));
    expect(p).toMatch(/exactly 2 wrong gate words/);
    expect(p.endsWith('My word pairs:')).toBe(true);
  });
  it('its own example card passes the real validator', () => {
    const p = buildAiPrompt();
    const m = /Example of one object:\n(.*)\n/.exec(p);
    const card = JSON.parse(m[1]);
    card.id = 'x1';
    expect(validateCard(card).success).toBe(true);
  });
});

describe('what an AI chat actually sends back', () => {
  beforeEach(() => localStorage.clear());
  it('handles a chatty reply with a code fence, long field names, and bad cards', () => {
    const r = parseAiReply(aiReply);
    expect(r.error).toBeNull();
    expect(r.cards.length).toBe(5);          // the N/A + duplicate-answer card is dropped
    expect(r.skipped).toBe(1);
    expect(r.cards[4].subj).toBe('Basics'); // "Greetings" is not one of the 15 topics
    expect(r.cards[4].bw).toEqual(['hello']);
    expect(r.cards[4].ans).toBe('hola');
  });
  it('imports into My words as playable (not flashcard-only) cards', async () => {
    const { customCards } = await import('../../js/customcards.js');
    const { storage } = await import('../../js/storage.js');
    storage.load();
    const before = customCards.getAll().length;
    const r = parseAiReply(aiReply);
    const res = customCards.importJSON(JSON.stringify(r.cards));
    expect(res.importedCount).toBe(5);
    expect(res.rejectedCount).toBe(0);
    const added = customCards.getAll().slice(before);
    added.forEach((c) => {
      expect(c.d.length).toBe(2);
      expect(c.enabledModes || null).toBeNull();
      expect(validateCard(c).success).toBe(true);
    });
  });
  it('explains an unusable reply instead of failing silently', () => {
    expect(parseAiReply('').error).toMatch(/Paste/);
    expect(parseAiReply('I am sorry, I cannot help').error).toMatch(/JSON/);
    expect(parseAiReply('[{"bw":["x"],"ans":"y","d":["z"]}]').error).toMatch(/No usable words/);
  });
  it('accepts {"cards": [...]} and a bare array', () => {
    const one = { subj: 'Basics', bw: ['a'], ans: 'b', d: ['c', 'd'], tp: 't' };
    expect(parseAiReply(JSON.stringify({ cards: [one] })).cards.length).toBe(1);
    expect(parseAiReply(JSON.stringify([one])).cards.length).toBe(1);
  });
});

describe('the importer screen', () => {
  it('shows the instructions, the prompt button and no server-URL box', () => {
    const box = document.createElement('div');
    ankiImport.mount(box, { customCards: { add() {}, importJSON: () => ({ importedCount: 0, rejectedCount: 0, rejected: [] }) }, toast() {}, reportError() {} });
    const text = box.textContent;
    expect(text).toMatch(/Notes in Plain Text/);
    expect(text).toMatch(/Copy AI prompt/);
    expect(text).toMatch(/Import as runner words/);
    expect(text).not.toMatch(/Backend URL/i);
    expect(box.querySelectorAll('details').length).toBe(2);
    ankiImport.unmount();
  });
});

describe('using the importer screen like a person', () => {
  it('paste word pairs -> preview -> import as flashcards; paste AI reply -> import runner words', async () => {
    localStorage.clear();
    const { customCards } = await import('../../js/customcards.js');
    const { storage } = await import('../../js/storage.js');
    storage.load();
    const box = document.createElement('div');
    document.body.appendChild(box);
    const toasts = [];
    ankiImport.mount(box, { customCards, storage, toast: (m) => toasts.push(m), reportError() {} });
    const [paste, ai] = box.querySelectorAll('textarea');
    const buttons = Array.from(box.querySelectorAll('button'));
    const byText = (t) => buttons.find((b) => b.textContent.includes(t));
    const status = box.querySelector('.anki-import-status');

    byText('Fill in an example').click();
    await new Promise((r) => setTimeout(r, 400));
    expect(box.querySelector('.anki-import-preview').textContent).toMatch(/Found 3 cards/);

    const before = customCards.getAll().length;
    byText('Import as flashcards').click();
    await new Promise((r) => setTimeout(r, 50));
    expect(customCards.getAll().length).toBe(before + 3);
    expect(status.textContent).toMatch(/Imported 3 flashcards/);

    byText('Import as runner words').click();
    expect(status.textContent).toMatch(/Paste the AI/);   // empty box explains itself
    ai.value = aiReply;
    byText('Import as runner words').click();
    expect(status.textContent).toMatch(/Imported 5 runner words/);
    expect(customCards.getAll().length).toBe(before + 8);
    expect(paste).toBeTruthy();
    ankiImport.unmount();
  });
});

describe('big decks', () => {
  it('imports thousands of cards quickly, each with its own id, and says when the limit is hit', async () => {
    localStorage.clear();
    const { customCards } = await import('../../js/customcards.js');
    const { storage } = await import('../../js/storage.js');
    storage.load();
    ankiImport.mount(document.createElement('div'), { customCards, storage, toast() {}, reportError() {} });
    const deck = Array.from({ length: 4000 }, (_, i) => ({ front: 'Question ' + i + '?', back: 'Answer ' + i }));
    const t0 = performance.now();
    const r = ankiImport.importRaw(deck);
    expect(performance.now() - t0).toBeLessThan(3000);
    expect(r.imported).toBe(4000);
    const all = customCards.getAll();
    expect(all.length).toBe(4000);
    expect(new Set(all.map((c) => c.id)).size).toBe(4000);
    // a second deck pushes past the 5000 limit: the part that fits is kept, the rest is reported
    const r2 = ankiImport.importRaw(Array.from({ length: 2000 }, (_, i) => ({ front: 'More ' + i, back: 'Ans ' + i })));
    expect(r2.imported).toBe(1000);
    expect(r2.rejected).toBe(1000);
    expect(r2.warnings.join(' ')).toMatch(/5000 words/);
    ankiImport.unmount();
  });
});
