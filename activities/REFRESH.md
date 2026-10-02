# Weekly refresh: Thor's Bangkok Adventures

Instructions for the scheduled routine that refreshes
<https://tsripata.github.io/thor-events/activities/>. Edit this file to change
what the routine does. It reads the latest version from `main` every time it runs.

## Goal

Search the internet for interesting activities, events and things to do in
Bangkok (and nearby areas) for a dad and his 5-year-old son, Thor, covering
**the next 3–4 weeks** (this week plus the following 2–3 weeks). Weeks run
Monday–Sunday, Bangkok time (UTC+7).

## Step 0: read his current interests

Read the `interests` array in `activities/data/index.json` and use it to steer
every search. As of the last update these were Iron Man, ice skating,
rollerblading, building & making, and drums, but always trust the file.

## What to look for

**Priority: hands-on workshops.** Chocolate making, pottery/clay, cooking, art,
science, building. He loved the chocolate-making and pottery classes. Search
BKK Kids, ClassBento Thailand, theCOMMONS events, TimeOut Bangkok, Facebook
events, Klook, KKday and the general web for bookable kids' workshops in the
coming weeks. Klook and KKday are booking platforms: check them for tickets,
tours, classes and attraction passes, and include the direct booking link.

Also search for:

1. Special events in each upcoming week: festivals, markets, pop-ups, exhibitions.
2. Ice skating and rollerblading: sessions, beginner lessons, special rink events.
3. Superhero / Iron Man / Marvel-themed events or pop-ups.
4. Outdoor activities and family-friendly cultural events.
5. Science museums, planetariums and hands-on discovery centers, both standing
   venues and special exhibitions or shows. Cover the NSM Science Museum &
   Bangkok Planetarium (Ekkamai), the National Science Museum (Rangsit / Khlong
   Luang), the Children's Discovery Museum (Chatuchak) and Museum Siam, plus
   any current science-themed pop-ups.

## Digest format

A friendly, easy-to-scan digest organized week by week. Each week has
**This Weekend (Sat & Sun)**, **Weekday Gems** and **Anytime Favorites**. For
each activity give the name, date/time, location, price, why it's great for
Thor, and a link. Concise and actionable: the reader is a busy dad.

## Publish to the website (required)

The site is served by GitHub Pages from the `main` branch of
`tsripata/thor-events`. Use the session's GitHub integration for all access.
**Never put a token or password in a URL, command, file or commit.**

1. Work in the checkout of `tsripata/thor-events`. If the session doesn't have
   one, attach the repo with the `add_repo` tool and clone it as that tool
   instructs. Then `git checkout main && git pull origin main`.
2. Weeks are keyed by their **Monday** date. For every week you found
   activities for, write `activities/data/weeks/<monday YYYY-MM-DD>.json`. Each
   activity goes in the file for the week containing its date. Overwrite
   existing files for those weeks with your fresh, fuller data. Put
   evergreen/anytime activities **only** in the current week's file. Exact
   schema:

   ```json
   {
     "week_of": "YYYY-MM-DD (Monday)",
     "start": "YYYY-MM-DD (same as week_of)",
     "end": "YYYY-MM-DD (start + 6 days, Sunday)",
     "label": "Month D–D, YYYY",
     "intro": "one-sentence hype summary of the week",
     "weekday_note": "string or null — shown when the weekday section has no activities",
     "activities": [
       {
         "title": "string",
         "section": "weekend | weekday | evergreen",
         "category": "workshop | skating | superhero | music | art | outdoor | market | museum | play | sport | science",
         "date": "human-readable, e.g. 'Saturday July 18'",
         "time": "human-readable or null",
         "location": "string or null",
         "price": "string or null",
         "why": "why Thor will love it, tied to his current interests",
         "tip": "practical dad tip or null",
         "link": "event URL or null",
         "image": "official event image URL (og:image or organizer photo only) or null",
         "video": "official YouTube URL or null",
         "pick": true
       }
     ]
   }
   ```

   Mark 1–2 top recommendations per week with `"pick": true` and the rest
   `false`.
3. Add each new Monday date to the `weeks` array in
   `activities/data/index.json`, kept sorted with no duplicates. **Never remove
   or modify the `interests` array.** Only Toon edits that.
4. Check that every JSON file you touched parses, for example
   `python3 -m json.tool <file> > /dev/null`. Fix any that don't before
   committing.
5. Commit on `main` as `tsripata <toon.sripata@gmail.com>` with the message
   `Weekly update: <date range covered>`, then `git push origin main`. Pushing
   straight to `main` is intended for this routine: no pull request, no other
   branch. Touch only files under `activities/data/`.
6. End the run with the digest, including the site link
   <https://tsripata.github.io/thor-events/activities/>. If the push failed,
   still give the digest and say clearly that publishing failed and why.
