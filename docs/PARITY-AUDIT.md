# Parity audit: Language Dash vs Duolingo and Wordle-style daily games

Written 23 November 2026 from a read of the code on branch `ccr-bd150d31-nr1rph`. Status is "present", "partial" or "missing". **Confidence** says how much I checked: "read" means I opened the code; "grep" means only that a file with a matching name or word exists, which proves a feature was started, not that it is complete. Nothing here has been tried on a phone. Sizes: S under a day, M a few days, L a week or more.

| # | Parity area | Status | Evidence | Gap and size | Confidence |
|---|---|---|---|---|---|
| 1 | XP progression + weekly league seasons | **Partial** | `js/leagues.js` is a trophy ladder for ranked multiplayer (7 leagues, 3 divisions). Progress has an `xp` field (`storage.js`). Weekly tournaments and a weekly goal exist (`uipostrun`, `challenge`, `cohortsui`). | There is no Duolingo-style weekly *XP* league (a small group of players, a weekly reset, promotion and relegation). Needs a weekly XP total per player, a league-group table and a weekly settle job, plus the Supabase side. **L**, and it needs the shared project. | grep + read of `leagues.js` header |
| 2 | Daily reminders, with a streak-at-risk variant | **Present (phone app); web has the daily reminder only** | `js/reminders.js`: user-chosen hour, native scheduled notifications on the phone apps, the browser Notification API on the web. It skips today if the goal is already met. | Done on 23 Nov: a second notification (id 4102) at 21:00 "Your N-day streak ends tonight", only for a player with a streak, moved on or cancelled as soon as the app sees they practised (`js/reminders.js`, tested). It only exists in the phone apps; a browser cannot schedule one while closed. Not yet tried on a real phone. | read |
| 3 | Streak freezes/repair and a streak calendar | **Present** | `streakcalendar.js` and `studystreak.js` exist; shields show on Home (`🛡` count in `uihome.js`) and in the streak status. | Repair after a break (buying a missed day back) is not confirmed; check whether it exists before building. **S** to verify. | read (shields, calendar file) / grep (repair) |
| 4 | Shareable, spoiler-free result cards | **Partial** | `js/sharecard.js` draws a 1080x1350 run-result card and uses the native share sheet or a download. | It is a run card. No daily-word or daily-challenge card in the emoji-grid, no-spoiler style, and no check that the existing card hides the answers. **S** to **M**. | read header |
| 5 | First run playable in 30 seconds, tutorial woven in, no sign-in wall | **Partial / likely present** | Guests are local-only and sign-in is never forced (the join step is deliberate, "Not now" exists). A first-run tutorial exists and e2e tests cover it (`smoke.spec.js`, `tutorial.spec.js`). The welcome screen asks for a language pair first. | The time to first answer is unmeasured. The welcome step and tutorial may exceed 30 seconds. Needs a timed run on a phone and a cut of any step that is not essential. **M**. | read tests / not measured |
| 6 | Achievements and badges tied to milestones | **Present** | Badges live in the profile, new ones show a red dot (`smoke.spec.js`), and `uipostrun`/`rankedui` award them. | Check that milestone coverage (first 100 words, 7-day streak, and so on) matches the list people expect. **S**. | grep + test names |
| 7 | Sound and haptics toggles, dark mode, reduced motion | **Present (mostly)** | `audio.js` has `hapticsEnabled` and sound settings; `storage.js` has `reducedMotion`; the theme picker defaults to "Surprise me". | Confirm that `prefers-reduced-motion` is honoured as a default and not only through the setting, and that dark mode follows the system on first launch. **S**. | grep |
| 8 | Restore purchases and manage subscription in Settings | **Present** | `proui.js` has "Restore purchases" and two "Manage subscription" buttons; `pro.js` has the restore logic. | None known. On a real phone, test against the store sandboxes. **S** to test. | read |
| 9 | In-app support/FAQ and a report-a-word path | **Partial** | Report-a-word exists (`cardreport.js`, `card_reports` in the schema, report button on a missed word). Feedback goes through Settings, About and help, Send feedback. | No in-app FAQ or help centre page was found. **S** to **M** (static content in the app). | grep |
| 10 | Ratings prompt only after a positive moment | **Present** | `review.js` asks "do you enjoy the game"; "Not really" goes to feedback. Privacy text says it asks after a good run. | Check the frequency cap and that it never fires during a run. **S**. | read headline |
| 11 | Offline tolerance for solo play, sync when back | **Present / partial** | `offline.js`, `offlinepack.js` and `swregister.js` (service worker). Progress lives on the device first, which is the model. | Whether cloud save retries after a failed upload and merges safely on reconnect is not confirmed. **M** to verify with a test. | grep |
| 12 | Accessibility: dynamic type, contrast, screen-reader labels | **Partial** | `axe.spec.js` runs axe against Home, Stats and two sheets and now passes. The first CI run found real label problems (fixed). | Axe covers 4 screens. Dynamic type (text scaling to 200 percent) and a screen-reader pass of the runner and quiz are untested. Contrast rules are excluded outside Home. **M**. | read tests |

## What I would do first (cheapest, highest return)

1. **#2** streak-at-risk reminder: done (phone app).
2. **#4** a spoiler-free daily card (S to M): reuses `sharecard.js`.
3. **#9** a short in-app FAQ (S to M): static content.
4. **#12** extend the axe suite to every screen and add a 200 percent text-size test (M).
5. **#5** measure the first 30 seconds on a phone and cut steps (M).
6. **#1** weekly XP leagues is the one big item (L). It needs a design pass with the shared Supabase project, because it is a new schema object and a weekly job, so I would not start it before the owner agrees.

## What I could not check from here

Everything marked "grep", plus any claim about how it feels on a phone. A quick real-device pass would convert most "partial / likely present" rows to a firm yes or no.
