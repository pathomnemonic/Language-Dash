# Language Dash: world bible

Language Dash is the language-learning sibling of Dx Dash (the medical board-prep runner it was forked from). Same
3-lane 3D endless runner engine, new theme. This file is the shared creative contract: every theme, copy and
content change must fit it. Do not invent a different setting.

## The game in one line
A word in the language you know flashes at the top of the screen. Three gates rush toward you, each showing a word
in the language you are learning. Run through the gate that means the same thing. One word in, one word out.

## Setting: the Babel Run
Long ago the Great Library of Babel stood at the middle of the world, holding every word of every language. It
cracked, and its words scattered across the globe. The **Lexicon Guild** trains **Wordrunners**: couriers who race
through streets, markets, stations and ruins to catch scattered words and carry them home, one gate at a time.

- The thing that chases you is **the Hush**: a creeping silence that eats words. A wrong answer or a lost life lets it
  gain on you; it never "kills" anyone, it makes you forget, and the run ends when it catches you.
  (In code this is still the "exam monster": keep the identifiers, change the player-facing names/copy.)
- **Coins** are still coins in code. Player-facing they may be called coins.
- The profile is your **Passport**; the Cards tab is your **Phrasebook**; the Locker is still the Locker (the
  Wardrobe/trunk in the Guild lodge). Daily streak = the **hearth** of the Lexicon Guild. Keep wording light, warm, funny.
- Tone: friendly, travel-y, a little cheeky. Never medical. Never mention exams, boards, diagnoses, patients, doctors.

## Languages (15)
en English, es Spanish, fr French, de German, it Italian, pt Portuguese, nl Dutch, sv Swedish, pl Polish,
ru Russian, ja Japanese, ko Korean, zh Mandarin Chinese, ar Arabic (Modern Standard), hi Hindi.
The player picks the language they speak (the **hint** language) and the one they are learning (the **gate**
language) on first launch; both can be changed any time in Settings.

## Topics (replace the 15 medical "subjects"; same count so per-subject mastery achievements map 1:1)
Internal SUBJECTS strings, in this order:
1. `Basics` 2. `People & Family` 3. `Body & Health` 4. `Food & Drink` 5. `Home & Things` 6. `Nature & Animals`
7. `Travel & Places` 8. `Time & Numbers` 9. `Colors & Describing` 10. `Actions` 11. `Feelings & Thinking`
12. `Talking` 13. `Work & School` 14. `Shopping & Money` 15. `Small Words`

## Difficulty levels (replace USMLE/COMLEX "exam" filters)
Word frequency bands (by rank in the 1,000-word core list): `top100` (ranks 1-100), `top300` (1-300), `top600` (1-600),
`all` (1-1000). Card `baseDifficulty` is 1 for ranks 1-300, 2 for 301-700, 3 for 701-1000.

## Cast (new characters, new backstories; see shop data). Principles
- Every hero is a Wordrunner from a different corner of the world, each with a tiny, funny, specific backstory and
  a signature language or two they are famous for. Mention real places and foods, not stereotypes.
- Names are playful (alliterative / punny where it works), never medical.
- Monsters are different flavours of the Hush and its relatives (the Mumble, the Babble, the Static...).
