# Social post factory

Turns a list of hook specs into finished posts: slide 1 (the hook), slide 2 (the payoff with the real words from the deck) as
1080x1350 PNGs in the game's look (dark navy, cream serif, gold), the real gates and capture parameters for slide 3, and a caption.
It refuses any post that breaks a standing rule, so Orion can run it without checking the rules by hand.

## Run it

```
npm ci                                              # once
PW_CHROMIUM=/path/to/chromium (optional, otherwise Playwright's own browser)
node tools/social/build-week.mjs tools/social/hooks/kal.json                 # draft: writes out/social/draft/<id>/
node tools/social/build-week.mjs tools/social/hooks/kal.json --final         # final: also refuses any warning, writes out/social/final/<id>/
node tools/social/build-week.mjs tools/social/hooks/kal.json --check         # rules only, no rendering
```

Slide 3 (the real game screen). Serve the build, then capture:

```
npm run build && npx vite preview --port 4173
node tools/social/capture-gates.mjs out/social/final/<id>/slide3.json
```

The capture puts the exact card on the track, reads the gate labels back from the screen, compares them with the deck's own
gates, and only then saves `slide3-<cardId>.png` (390x844 at 3x). A mismatch stops with an error and saves nothing. It needs WebGL.

## A hook spec

```json
{
  "id": "kal-hindi-yesterday-tomorrow",
  "pair": "en-hi",                       // known language - target language
  "concepts": [214, 215],                // deck ranks (the number in the card id, e.g. en-hi-214)
  "verified": "deck",                    // deck | knowledge | needs-check  (needs-check is refused)
  "expect": [{ "rank": 214, "hint": "tomorrow", "answer": "कल" }],   // checked against the deck so a typo cannot slip through
  "hook": "Hindi has ONE word for both yesterday and tomorrow.",     // slide 1: must make sense to someone who knows none of the language
  "kicker": "Same word. Two days.",      // optional small line on slide 2
  "payoff": ["It is कल (kal). ...", "..."],                          // slide 2 text; the words and romanisation come from the deck
  "caption": "optional; otherwise the hook and payoff are used",
  "lane": 1                              // optional: which gate (0 left, 1 centre, 2 right) holds the right answer on slide 3
}
```

`verified` means: **deck** = the claim is about words that are in the deck (checked through `expect`); **knowledge** = a well-known
language fact beyond the deck (a human or the panels have checked it); **needs-check** = not yet cleared, so the tool refuses it.
Change the tag only after the claim has been checked.

## Rules the code enforces (tools/social/lib.mjs, tests/unit/socialpost.test.js)

1. **Honest rank wording.** Copy may only mention a rank as `{{rank:N}}`, which becomes "word #N of the deck (English-frequency order)".
   "Top N", "most common words", "first N words", bare `#N` and the word "rank" are refused. The rank is information, never a gate.
2. **Gates are never hand-written.** Every gate and every word on slide 2 comes from `buildDeck`, the game's own code.
3. **No pronunciation-difficulty claims** ("hardest to pronounce", "tongue twister", ...).
4. **The hold list** (`data/content-hold.json`) is respected: a concept on hold for a language is refused for that language.
5. **Player-facing copy only.** Words like gate, lane, Hush, card, deck, algorithm, update, version are refused in slide copy.
6. **No multiple-choice-only hooks** ("which of these", "pick one", A/B/C lists).
7. **Slide 1 works for someone who knows none of the language:** no foreign script is allowed on slide 1 (warns on Latin-script target words).
8. **Footer band on every export:** "Play Language Dash free — link in bio".

## Notes

- Free or Pro does not matter for posts, and there is no rank limit.
- The hold list currently has the five B-04 entries named so far. Add the rest when the deck audit's §4 list arrives.
- Slide text for Devanagari, CJK and Arabic uses whatever fonts the machine has (the slide uses Fraunces for Latin). Check the preview once on the machine that renders final posts.
- `tools/social/demo/` holds the kal demo output.
