# Language Dash: visual identity ("Paper Passport")

The first reskin only renamed things. This is the real one: Language Dash must look and feel like a different product
from Dx Dash (dark grape-purple, neon glow, translucent glass panels, pixel-arcade fonts, candy-pink/cyan accents).
Rule of thumb: put a screenshot of each next to the other; nobody should need the logo to tell them apart.

## Concept
A well-travelled paper passport and a stack of ticket stubs. Warm paper, navy ink, rubber-stamp colors, hard
offset shadows. Printed, tactile, analog, friendly. NOT neon, NOT glowing, NOT glassy, NOT dark by default.

## Tokens (use these exact values as the CSS variable defaults)
- Paper (page background): `#F6EEDC`, deeper paper `#EBDDBF`, card paper `#FFFBF2`
- Ink (text, borders, shadows): `#1B2A41`; soft ink `#4B5870`; faint ink `#8A93A3`
- Stamp red `#D9432C`, teal `#0E8C8A`, marigold `#F2B134`, sky `#5DA9D6`, leaf green `#2E9E5B` (correct), plum `#7B3F6E`
- Lane colors (the three gates): left = stamp red, center = marigold, right = teal (ink text on marigold, paper text on red/teal)
- Correct = leaf green, wrong = stamp red. Never neon.
- Dark mode ("Night Train"): ink-navy page `#101B2D`, card `#1B2A41`, paper-colored text `#F6EEDC`; same accents slightly lifted.
  Default is the light paper look; the dark look is a Settings choice and the automatic look at night.

## Shape language
- 2.5px solid ink outlines on every card, button, pill and input; radius 6-10px (NOT pill-round, NOT 20px bubbles).
- Hard offset shadows: `4px 4px 0 var(--ink)` (never blurred glow, never translucent glass, never gradients on panels).
- Ticket details: perforated edges (dashed borders, semicircle notches via radial-gradient), stamp-style rotated labels
  (-2deg), dotted route lines, postmarks, paper grain (a very subtle noise via CSS gradients/SVG data URI).
- Buttons look like stamped tickets; pressed state moves the element 3px down-right and drops the shadow.
- Motion: snappy, slightly overshooting, "stamp thunk" (scale 1.15 -> 1 with a 2px shake) for correct answers; no glow pulses.

## Typography (self-hosted woff2 in css/fonts, with license files; no remote fonts)
- Display: **Fraunces** (700/900, soft serif) for logo, titles, big numbers, the hint word.
- UI/body: **DM Sans** (500/700).
- Non-Latin fallbacks for gate/hint text: system stacks (Noto Sans JP/SC/KR/Devanagari/Arabic, Yu Gothic, PingFang, Malgun Gothic, Noto Naskh Arabic).
- Remove Press Start 2P and Jersey 10 from the UI entirely (delete their css rules, files and licenses if nothing else uses them).

## Layout language
- The Home screen is a **passport page / boarding pass**, not a game-arcade dashboard: wordmark on a stamp, a big rectangular
  ticket-style PLAY button (notched ends, ink outline, red fill, paper text), the language pair shown as a route
  "🇬🇧 → 🇯🇵" on a luggage-tag, secondary modes as stacked ticket stubs or a grid of stamped squares.
- Tab bar: a strip of paper tabs with ink icons (flat, outlined), the selected tab is a stamped red tab.
- In-run HUD: coins/score/streak/lives as small luggage tags with ink icons; the hint word sits on a large
  paper "flash card"/speech-bubble with Fraunces text; the three answer gates are ticket stubs in lane colors with a
  perforated edge and the pronunciation line beneath in DM Sans italics.
- Popups/sheets are paper cards with a torn or perforated top edge.
- Backgrounds: paper with faint world-map line art and dotted flight routes (CSS/SVG inline); no flying objects over the
  menus except a few slow-drifting postage stamps/airmail envelopes (reduced-motion: static).
- 3D world: gates are ticket-office gates / turnstile arches with the stamp colors (not glowing neon portals); lane
  markers like rail-station floor lines; coins are brass travel tokens with a compass star; power-up orbs are enamel pin badges.

## Logo
Wordmark "Language Dash" in Fraunces Black, two lines or one, inside a circular rubber stamp (double ring, dashes), red ink on paper,
with a small speech-bubble "A あ" mark. The app icon is that stamp on a teal square (SVG, then PNG exports).

## Voice
Same warm, travel-y, a little cheeky tone as docs/WORLD.md.
