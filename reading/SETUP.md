# Setup: putting Thor's Reading Dragon online

> **Just want to try it first?** No accounts needed. With [Node.js](https://nodejs.org) installed:
> ```bash
> cd reading
> npm install
> npm run demo     # then open http://localhost:8788
> ```
> "Continue with Google" signs you straight in as a demo parent. The **Next day** and **+5 reading days**
> buttons move time forward so you can watch the creature evolve. Data is lost when you stop it (Ctrl+C).

About 30 minutes, all free. You need three accounts: **Supabase**, **Google Cloud** and **Cloudflare**.
Dashboard menu names change from time to time; if a step doesn't match exactly, look for the nearest equivalent.

Keep a note open: you'll copy a few values between steps.

---

## 1. Supabase (database, photos, login)

1. Sign up at https://supabase.com (sign in with GitHub is easiest).
2. **New project**. Name: `thor-reading`. Pick a strong database password (save it). Region: **Singapore** (closest to Thailand).
3. When it's ready, open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   It should say "Success". This creates the tables, locks them, creates the photo bucket and adds Thor.
4. Open **Project Settings → API Keys** (or **Settings → API**) and copy to your note:
   - **Project URL**, like `https://abcdefgh.supabase.co`
   - **Publishable key** (`sb_publishable_...`). If you only see legacy keys, use the `anon` key.
   - **Secret key** (`sb_secret_...`). If you only see legacy keys, use the `service_role` key.
     ⚠️ Never paste the secret key into code, GitHub or chat.

## 2. Google sign-in

1. Go to https://console.cloud.google.com and create a project, for example `thor-reading`.
2. **APIs & Services → OAuth consent screen** (may be called **Google Auth Platform**):
   - User type: **External**. App name: `Thor's Reading Dragon`. Add your email as support and developer contact.
   - Under **Audience / Test users**, add every Google account that should sign in.
     (Or click **Publish app** later so you don't need to list test users. The `ALLOWED_EMAILS` list still protects the app.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs**: `https://<your-project>.supabase.co/auth/v1/callback`
     (your Supabase Project URL + `/auth/v1/callback`)
   - Create, then copy the **Client ID** and **Client secret**.
4. Back in Supabase: **Authentication → Sign In / Providers → Google**. Turn it on, paste the Client ID and Client secret, and save.

## 3. Cloudflare Pages (website + API)

1. Sign up at https://dash.cloudflare.com.
2. **Workers & Pages → Create → Pages → Connect to Git**. Authorize GitHub and pick **tsripata/thor-events**.
3. Build settings:
   - **Production branch**: `main` (until this is merged, you can pick `claude/cool-brahmagupta-aeu5wv` to try it)
   - **Framework preset**: None
   - **Build command**: leave empty
   - **Build output directory**: `public`
   - **Root directory** (under Advanced): `reading`
4. **Save and Deploy**. The first deploy may show errors until step 5 is done, which is fine.
5. Open the project → **Settings → Variables and Secrets** and add these four, each as type **Secret**, for **Production** (and Preview if you use preview links):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | the publishable (or anon) key |
   | `SUPABASE_SECRET_KEY` | the secret (or service_role) key |
   | `ALLOWED_EMAILS` | comma-separated Google emails allowed in, e.g. `toon.sripata@gmail.com,partner@gmail.com` |

6. **Deployments → Retry deployment** (or push any commit) so the secrets take effect.
7. Copy your site's URL, like `https://thor-reading-dragon.pages.dev`.

## 4. Connect the site URL to Supabase login

In Supabase: **Authentication → URL Configuration**:
- **Site URL**: your Cloudflare URL, e.g. `https://thor-reading-dragon.pages.dev`
- **Redirect URLs**: add `https://thor-reading-dragon.pages.dev/**`
  (and `http://localhost:8788/**` if you'll run it on your computer)

## 5. Try it

1. Open the site and tap **Continue with Google**.
2. Tap **We read a book today**, take a photo, type the title, and save. The egg hatches!
3. Install it on phones:
   - **Android (Chrome)**: menu ⋮ → **Install app**
   - **iPhone (Safari)**: Share → **Add to Home Screen**

### If something goes wrong

| What you see | Fix |
|---|---|
| "Server not configured: missing …" | A Cloudflare secret is missing. Add it and redeploy (step 3.5–3.6). |
| Google says `redirect_uri_mismatch` | The redirect URI in Google must be exactly `https://<project>.supabase.co/auth/v1/callback`. |
| After Google you land on the wrong site or get an error | Check Supabase Site URL / Redirect URLs (step 4). |
| "Not on the family list" | Add that email to `ALLOWED_EMAILS` and redeploy. |
| Google says the app is in testing / access blocked | Add the account as a test user, or publish the consent screen (step 2.2). |
| "No reader found" | Run `supabase/schema.sql` again (step 1.3). |

## Running it on your computer (optional)

```bash
cd reading
npm install
cp .dev.vars.example .dev.vars   # then fill in the real values
npm run dev                      # http://localhost:8788
```

## About the keys (why this is safe)

- The **secret key** only lives in Cloudflare's encrypted secrets. The browser never sees it.
- The **publishable key** is sent to the browser, but it can only start Google sign-in.
  Every table has Row Level Security on with no rules, so it can't read or change any data.
- All data goes through the Cloudflare API, which checks the Google login **and** the `ALLOWED_EMAILS` list on every request.
- Photos are in a private bucket and only shown through links that expire after an hour.
