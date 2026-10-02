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

## Evolution stages

| # | Stage | Reading days |
|---|---|---|
| 1 | Egg | 0 |
| 2 | Hatching Egg | 1 |
| 3 | Hatchling | 2 |
| 4 | Wiggler | 3 |
| 5 | Aqua-Liz | 5 |
| 6 | Scale-Mote | 7 |
| 7 | Little Croc | 9 |
| 8 | Canyon Croc | 12 |
| 9 | Armored Croc | 15 |
| 10 | Drake | 19 |
| 11 | Wyvern | 24 |
| 12 | Wyvern Lord | 30 |
| 13 | Twin-Head Drake | 37 |
| 14 | Twin-Head Elder | 45 |
| 15 | Tri-Head Warden | 55 |
| 16 | Five-Head Emperor | 70 |
| 17 | Omega Hydra-Archon | 100 |

Change the thresholds in `public/stages.js`.

---

## Phase 0: Plan & design ✅

- [x] Choose hosting: Cloudflare Pages + Supabase (free tiers)
- [x] Design the screens in Claude Design (home, log a book, already read today, evolution path, sign in)
- [x] Cut the 17 dragon sprites from the reference art (`public/sprites/`)
- [x] App icons (`public/icons/`)

## Phase 1: MVP code ✅

- [x] Database schema with RLS lock-down and private photo bucket
- [x] API: `GET /api/config`, `GET /api/state`, `POST /api/logs`, `DELETE /api/logs/:id`
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

- 2026-10-02: Phases 0 and 1 done.
- 2026-10-02: Much sharper sprites (Real-ESRGAN anime), stepping legs, egg wriggle, fire breath for dragons.
- 2026-10-02: Faster early evolutions (one every 1-2 reading days), sharper sprites, idle walking animation.
- 2026-10-02: Added demo mode; fixed the evolution celebration disappearing right after saving.
