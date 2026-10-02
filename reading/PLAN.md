# Thor's Reading Dragon: Plan & Progress

A website / installable app (PWA) for logging the books Thor reads. Each day you log a book,
his dragon grows: it starts as an egg and evolves through 17 stages, ending as the
Omega Hydra-Archon after 100 reading days.

- **Design canvas (Claude Design):** https://claude.ai/artifact/F3GgHEV3fDibaw9o15EMwr
- **Setup steps:** [SETUP.md](SETUP.md)

## Stack

| Piece | Service | Notes |
|---|---|---|
| Website + PWA | Cloudflare Pages (`public/`) | Plain HTML/CSS/JS, no build step |
| API | Cloudflare Pages Functions (`functions/api/`) | Holds the Supabase secret key |
| Database | Supabase Postgres (`supabase/schema.sql`) | RLS on, no policies: only the API can read/write |
| Photos | Supabase Storage, private `book-photos` bucket | Shown via 1-hour signed links |
| Login | Supabase Auth with Google | Only emails in `ALLOWED_EMAILS` get in |

## Rules

- One log per day, per the family's timezone (`APP_TIMEZONE`, default `Asia/Bangkok`).
  Enforced by the API **and** a unique index in the database.
- Only today's log can be undone (to fix a typo). Past days are locked.
- Photos are resized in the browser to 1280px JPEG before upload (max 8 MB).

## Creatures

The first time Thor opens the app he picks a **boy or girl creature** and gets a random creature
of that kind. Every creature has its own 17-stage evolution path, from egg to legend at 100 reading days.
"Pick a new creature" in the account menu swaps it (reading days are kept).

| Creature | Kind | Art |
|---|---|---|
| Croc Dragon (Egg → Omega Hydra-Archon) | Boy | Hand-made, `public/sprites/croc-dragon/` |
| Dino (Speckled Egg → Titan Rex) | Boy | Drawn by `tools/draw-creatures.mjs` |
| Unicorn (Pearl Egg → Celestial Empress) | Girl | Drawn by `tools/draw-creatures.mjs` |
| Phoenix (Ember Egg → Eternal Phoenix) | Girl | Drawn by `tools/draw-creatures.mjs` |

All four share these thresholds (each creature can set its own):

| Stage | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Reading days | 0 | 1 | 2 | 3 | 5 | 7 | 9 | 12 | 15 | 19 | 24 | 30 | 37 | 45 | 55 | 70 | 100 |

**Adding a creature:** see the comment at the top of `public/creatures/index.js`. Either drop hand-made
sprites in `public/sprites/<id>/` and write a module like `croc-dragon.js`, or add a draw function to
`tools/draw-creatures.mjs` and run `node tools/draw-creatures.mjs`. Then list it in `CREATURES`.

---

## Phase 0: Plan & design ✅

- [x] Choose hosting: Cloudflare Pages + Supabase (free tiers)
- [x] Design the screens in Claude Design (home, log a book, already read today, evolution path, sign in)
- [x] Cut the 17 dragon sprites from the reference art (`public/sprites/`)
- [x] App icons (`public/icons/`)

## Phase 1: MVP code ✅

- [x] Database schema with RLS lock-down and private photo bucket
- [x] API: `GET /api/config`, `GET /api/state`, `POST /api/logs`, `DELETE /api/logs/:id`, `POST /api/creature`
- [x] Google sign-in + family allow-list
- [x] Home: dragon avatar, stage, streak, progress to next evolution, recent books
- [x] Log a book: title, note, take/choose photo, once per day
- [x] Evolution celebration when a new stage is reached
- [x] Evolution path screen (locked stages shown as silhouettes)
- [x] PWA: manifest, service worker, installable
- [x] Tested locally against a mock Supabase (API + browser flow)
- [x] `npm run demo`: try it locally with no accounts, with time-travel buttons

## Phase 2: Go live ⏳ (needs you, see [SETUP.md](SETUP.md))

- [ ] Create Supabase project and run `supabase/schema.sql`
- [ ] Create Google OAuth client and enable Google in Supabase
- [ ] Create Cloudflare Pages project from this repo and add the secrets
- [ ] First real sign-in and book log
- [ ] Install on phones (Android: Install app; iPhone: Safari → Share → Add to Home Screen)
- [ ] Merge to `main` so the live site deploys from it

## Phase 3: Polish (ideas)

- [ ] Full history page: all books, with a photo grid
- [ ] Log for yesterday (if we forgot to log), limited to 1 day back
- [ ] Name the dragon
- [ ] Bigger evolution animation (sparkles, sound)
- [ ] Streak badges / milestones (7, 30, 100 days)
- [x] Sharper sprites (AI-upscaled 4x with Real-ESRGAN anime model, backgrounds re-cut)
- [x] Idle animation: strolls a few steps and back; legs step; eggs wriggle; grubs squirm
- [x] Dragons (Drake onward) breathe fire from each mouth every few seconds
- [ ] Brand-new higher-detail sprite art and a real animated clip for the final stage (needs a paid Higgsfield plan; the free plan can't generate)

## Phase 4: Extras (ideas)

- [ ] More than one reader (siblings, each with their own dragon)
- [ ] Daily reminder notification (Web Push)
- [ ] Stats: books per month, favourite books
- [ ] Export data (CSV) / backups
- [ ] Custom domain
- [ ] Keep-alive ping so the free Supabase project never pauses during long breaks

## Change log

- 2026-10-02: Pick a boy or girl creature; 4 creatures (Croc Dragon, Dino, Unicorn, Phoenix), 17 stages each. Code is creature-generic.
- 2026-10-02: Phases 0 and 1 done.
- 2026-10-02: Much sharper sprites (Real-ESRGAN anime), stepping legs, egg wriggle, fire breath for dragons.
- 2026-10-02: Faster early evolutions (one every 1-2 reading days), sharper sprites, idle walking animation.
- 2026-10-02: Added demo mode; fixed the evolution celebration disappearing right after saving.
