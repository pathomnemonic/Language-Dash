# Word quality

Language Dash cards are built from data, not hand-written, so quality is checked as data: by `tools/validate-deck.mjs`,
by the card schema, and by unit tests.

## What a good card is

One hint word in the language the player knows, one answer word in the language they are learning, and two wrong gate
words in the target language. A hint is never "the answer written out" the way a long clue could be, so the old clue-leak
checks (`js/cardleaks.js`) are kept only as cheap no-ops: no one-word hint is ever dropped. What still matters:

| Risk | What stops it |
| --- | --- |
| Two cards with the same answer word in one run (the player could not tell which gate is right) | `answerKey` / `uniqueByAnswer` (case, accents and punctuation never make two answers different) in `js/cardleaks.js`, applied when a run is dealt (`js/game/gates.js`) |
| A wrong gate equal to the answer or to the hint | `buildDeck` drops the card; `validateCard` rejects it; `tools/validate-deck.mjs` asserts it for every pair |
| The same two wrong gates twice, or a missing gate | same three places |
| A word that is the same in both languages (a Spanish/Portuguese "hotel") | `buildDeck` drops the card and reports why; close pairs can fall a little short of 1,000 |
| Missing pronunciation for Japanese, Korean, Mandarin, Russian, Arabic or Hindi | `ansRoman` / `dRoman` are required for non-Latin targets and are asserted by `validate-deck` and `tests/unit/langdeck.test.js` |
| An unknown topic or word level | `js/cardschema.js` |

## Commands

```bash
npm run validate:deck                   # all 210 pairs: at least 950 cards each (close pairs may be lower only through identical words)
node tools/validate-deck.mjs --pair=en-es   # one pair
node tools/validate-deck.mjs --json         # machine-readable
npx vitest run tests/unit/langdeck.test.js tests/unit/cardquality.test.js tests/unit/cardcount.test.js
```

## Reports from players

Players can report a word from the Phrasebook and from the run report (`js/cardreport.js`), with reasons such as "wrong
translation" and "another word would fit better". Reports are saved on the device and sent to the server when signed in.
To fix a word, edit its language file in `js/lang/data/<code>.js` and run `npm run validate:deck`.

## Known limits

The checks are structural. They cannot know that a word has a better translation, that a word has several meanings
(the card shows one), or that a wrong gate happens to be a synonym of the answer. A native-speaker read-through of each
language file is the way to catch those, and player reports tell us where to look.
