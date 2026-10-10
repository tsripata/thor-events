# Charity Auction · ประมูลการกุศล

A live auction board for the ตลาดน้ำจิตต์น้ำใจ market. People bid by submitting a **Google Form**.
The page reads the form's **Google Sheet** and shows each item's **current highest bid and bidder**.
It refreshes itself every 2 minutes and makes a little "bump" + toast whenever a new high bid lands.

- Page: <https://tsripata.github.io/thor-events/auction/>
- Preview with fake data: <https://tsripata.github.io/thor-events/auction/?demo>
- Item list: <https://tsripata.github.io/thor-events/auction/items.html>
- One item (detail page with all its photos): <https://tsripata.github.io/thor-events/auction/item.html?no=3>
- Files (no build step, no server):
  - `auction/auction-core.js` holds **`CONFIG`**, sheet reading, the bidding rules, demo data and the form link. Both pages load it, so **you edit settings in one place**.
  - `auction/index.html` is the **live board**: big poster-style cards, toasts and an item dropdown.
  - `auction/girl.js` draws the poster's **little red-hood girl** (SVG) and the **loading screen**. Both pages load it right after `<body>`.
  - `auction/items.html` is the **item list**: every item with its current (or winning) price, made for browsing and nudging people to bid again.
  - `auction/item.html?no=N` is the **item detail page**: a photo gallery, the full description, the current price and the bid history.
- **Changed a `.js` file? Bump its `?v=` tag** in every page that loads it, or phones keep the old cached script (see §6).
- Design reference: `auction/poster-template.jpg` (the event's item-poster template)

This README is the full spec. Use it to set the page up, change it, or regenerate it from scratch (see §7).

---

## 1. How it works

```
Parent ──(Google Form)──▶ Responses tab in Google Sheet ──(gviz, read-only)──▶ auction-core.js ──▶ index.html (board)
                                                                                            └──▶ items.html (list)
                                   ▲
           "Items" tab (you type the catalog) ─┘
```

- The page **never writes** anything. It only reads the sheet through Google's public `gviz/tq` endpoint, the same way `market/ordersummary.html` does.
- Every visit and every refresh re-reads the whole sheet. Nothing is cached in the page.
- With no `SHEET_ID` set, or with `?demo` in the URL, the page runs in **demo mode** with made-up items and bids, and adds a fake bid every few seconds. Use it to preview the design.

## 2. Set up the Google Form

Create a form with these questions. The page matches columns by **words in the question title**, not by position, so you can reorder questions or add extra ones.

| Question (suggested title) | Type | Matched by keyword | Notes |
|---|---|---|---|
| `ชื่อผู้ปกครอง` | Short answer | `ผู้ปกครอง`, `ชื่อ`, `name` | Shown publicly as `คุณ` + **first word only** (`SHORT_PARENT_NAME`) |
| `ชื่อเล่นเด็ก` | Short answer | `ชื่อเด็ก`, `ชื่อเล่น`, `ชื่อน้อง` | Shown as `น้อง…` under the parent's name |
| `รุ่น` | Short answer or dropdown | title starts with `รุ่น`, `class`, `grade`, `ห้อง` | Shown as `รุ่น X` |
| `เบอร์โทร` | Short answer | `เบอร์`, `phone`, `tel`, `line` | **Never shown.** Only used to count unique bidders, and for you to call the winner |
| `หมายเลขของที่ต้องการประมูล` | **Dropdown** | `หมายเลข`, `สินค้า`, `รายการ`, `item`, `ของ`, `ชิ้น` | Options like `01 · ตุ๊กตาหมีถักมือ`. The page reads the **first number** as the item number |
| `ราคาที่ให้ (บาท)` | Short answer + **Response validation → Number → Greater than 0** | `ราคา`, `bid`, `amount`, `บาท` | Must be numbers only (see the gotcha in §6) |
| *(optional)* `ชื่อที่จะแสดง` | Short answer | `ชื่อที่แสดง`, `display` | If filled, it's shown instead of the parent/child name |

Then go to **Responses → Link to Sheets** to create the spreadsheet.

### Pre-filled "ประมูลชิ้นนี้" button (optional but nice)

1. In the form, open **⋮ → Get pre-filled link**, pick any item in the dropdown, then **Get link**.
2. The link contains `entry.123456789=...`. Copy the `entry.123456789` part into `CONFIG.FORM_ITEM_ENTRY`.
3. Put the normal `…/viewform` link into `CONFIG.FORM_URL`.

The button pre-fills `NN · <item name from Items tab>`. To get an exact match, the dropdown options must be written in that same format, e.g. `01 · ตุ๊กตาหมีถักมือ`. If they differ, the form simply opens without a pre-selected item.

## 3. Set up the sheet

1. **Share** the spreadsheet: *Anyone with the link → Viewer*. Without this the page can't read it.
2. Add a tab named **`Items`** (the name is set in `CONFIG.ITEMS_SHEET`). The first row is the header:

| Item no. | ชื่อของ | รายละเอียด | ผู้บริจาค | รูป | รูป 2 | รูป 3 |
|---|---|---|---|---|---|---|
| 1 | ตุ๊กตาหมีถักมือ | ถักจากไหมพรม สูง 30 ซม. | ครอบครัวน้องข้าวปั้น | photo link | photo link | photo link |

   - Header keywords: `Item no`/`หมายเลข`/`ลำดับ`, `ชื่อ`/`name`, `รายละเอียด`/`desc`, `บริจาค`/`donor`, `เริ่ม`/`start`, `ขั้นต่ำ`/`increment`/`step`, `รูป`/`ภาพ`/`image`.
   - **รูป**: either a Google Drive link (the file must be shared *Anyone with the link*) or any direct image URL. Drive links are shown through `drive.google.com/thumbnail?id=…`. Also accepted: a path inside this site such as `img/01.jpg`. With no picture, the circle shows "ยังไม่มีรูป" (items have no emoji).
   - **More photos**: put several links in the รูป cell (separated by a space, comma or new line), and/or add more columns whose header contains `รูป`/`ภาพ`/`image` (e.g. `รูป 2`, `รูปเพิ่มเติม`). The first photo is the one on the board and list; the detail page shows all of them as a gallery.
   - **No starting price or minimum step** for this event: any first bid above 0 counts, and any higher amount beats the leader (`ENFORCE_INCREMENT: false`).
     Items with no bids show `–` instead of a price.
   - Optional: you can still add `ราคาเริ่มต้น` / `เพิ่มขั้นต่ำ` columns later. Blank cells fall back to `DEFAULT_START_PRICE` / `DEFAULT_MIN_INCREMENT`, and the step only applies with `ENFORCE_INCREMENT: true`.
3. If the `Items` tab is missing, the page still works. It builds items from whatever people bid on, using the dropdown text as the name.

## 4. CONFIG (in `auction/auction-core.js`)

```js
const CONFIG = {
  EVENT_NAME: "ตลาดน้ำจิตต์น้ำใจ #25",
  SHEET_ID: "",              // from the sheet URL: /spreadsheets/d/<SHEET_ID>/edit
  BIDS_GID: "0",             // the #gid= number of the "Form Responses 1" tab
  ITEMS_SHEET: "Items",      // tab name for the catalog ("" = derive from bids)
  FORM_URL: "",              // https://docs.google.com/forms/d/e/…/viewform
  FORM_ITEM_ENTRY: "",       // "entry.123456789" for pre-filling the item
  END_TIME: "",              // e.g. "2026-10-25T15:00:00+07:00"; "" = never closes
  DEFAULT_START_PRICE: 0,
  DEFAULT_MIN_INCREMENT: 10,
  ENFORCE_INCREMENT: false,  // false = any higher amount wins; true = must be ≥ leader + increment
  REFRESH_SECONDS: 120,      // 120 = every 2 minutes
  SHORT_PARENT_NAME: true,   // show only the parent's first name
  TEST_NAME_PATTERN: /^(test|ทดสอบ|เทส)/i  // rows with these names are ignored
};
```

You can override these from the URL without editing the file: `?sheet=<id>`, `?gid=<gid>`, `?end=<ISO time>`, `?demo`.

## 5. Bidding rules (what the page computes)

The page walks the responses **in sheet order**, which is submission order, and keeps one leader per item.

1. Rows whose name matches `TEST_NAME_PATTERN` are skipped entirely.
2. A bid **counts** only if all of these hold:
   - the amount is a readable number > 0
   - it was submitted before `END_TIME` (if set)
   - no leader yet: amount ≥ the item's **starting price**
   - leader exists: amount **> leader** (current setting, `ENFORCE_INCREMENT: false`). With `ENFORCE_INCREMENT: true` it must be ≥ **leader + minimum increment**.
3. **Ties go to whoever bid first**, because a later equal bid doesn't beat the leader.
4. Bids that don't count are kept in the item's **ประวัติ** (history) dialog, struck through, with the reason (`ต้องอย่างน้อย 140`, `ส่งหลังปิดประมูล`, …). This makes disputes easy to settle.
5. "ขั้นต่ำถัดไป" (next minimum) on each card = leader + 1 baht (or + increment when enforced). It's hidden while nobody has bid and there's no starting price.
6. After `END_TIME`, the countdown changes to "ปิดประมูลแล้ว", the bid button disappears, and leaders get a `ผู้ชนะ 🏆` badge.

Badges: `ยังว่าง` = no bids yet, `ฮอต 🔥` = 5+ counted bids, `ผู้ชนะ 🏆` = winner after close.
Sorting: item number, highest price, most bids, most recent, or unbid items first.

**Item dropdown (ดูของ).** Above the grid is a dropdown. It defaults to **ทั้งหมด (N ชิ้น)**, which shows every item.
Each option reads `#NN <name> — <top bid> บาท · <leader>`, or `ยังไม่มีคนประมูล` when nobody has bid (plus `(เริ่ม <start>)` if the item has a starting price).
Picking one shows only that card, plus a "← ดูของทั้งหมด" link back. The sort control is disabled while one item is picked.
The selection and the option labels survive the refresh.
The URL updates to `#item-<no>`, so you can share a link straight to one item, e.g. `…/auction/#item-3`, or print it as a QR code on that item's poster.

## 5b. Item list page (`items.html`)

Goal: get people to **browse everything and bid more**.

- **Top:** a big **📝 ไปที่ฟอร์มประมูล** button (the plain form link) and **📺 กระดานประมูลสด** (back to the board). The same two buttons stay in a **sticky bar at the bottom** while scrolling.
- **Summary line:** number of items · how many have bids · how many are still waiting for a first bid · running total.
- **Filters:** ทั้งหมด / ยังไม่มีคนประมูล / มีคนประมูลแล้ว, plus a search box (name, description, donor, number) and a sort (number, price low→high, high→low, most bids).
- **One row per item:** photo circle, `#NN` wood tag, name, description, donor, then the **current price + 👑 leader + next minimum**.
  - Each row has **ประมูลเลย →**, which opens the form pre-filled with that item, and **ดูรายละเอียด**, which opens `item.html?no=N`. The photo and name link there too.
  - Items with no bids get a green tint and the tag "ยังไม่มีใครประมูล เป็นคนแรกเลย!" to draw bids to them.
- **After `END_TIME`:** the labels change to **ราคาที่ชนะ 🏆** or "ไม่มีผู้ประมูล", all bid buttons disappear, and the page becomes the **winners list**. It prints cleanly (buttons and filters are hidden) if you want to post it at the event.
- It refreshes quietly every `REFRESH_SECONDS` (no toasts) and keeps your filter, search and sort.

The board's header no longer has the 📝 form / 📋 item-list buttons, the stat tiles or the latest-bid feed (removed to keep the board short). Each card links to the item's detail page instead.

In **demo mode** with no `FORM_URL`, bid buttons show a short "this would open the Google Form" notice instead of going nowhere.

## 5d. Item detail page (`item.html?no=N`)

- Opened from **รายละเอียด** on a board card, **ดูรายละเอียด** on the list, or by tapping a photo or name. `N` is the item number.
- **Gallery:** every photo of the item (see §3, "More photos"), swipe on phones or use the ‹ › arrows / ← → keys, thumbnails below, `2 / 4` counter, tap a photo to see it full size. Drive photos load at 1600 px here (600 px on the other pages). With no photo, it shows "ยังไม่มีรูป".
- **Details:** `Item no.` plank, name, donor, the full description (line breaks kept), then the yellow board with the current price, 👑 leader, bid count, next minimum, countdown and **📝 ประมูลชิ้นนี้** (pre-filled form).
- **ประวัติการประมูล:** the full history table (rejected bids struck through with the reason). This replaces the board's old history dialog.
- **← ชิ้นก่อนหน้า / ชิ้นถัดไป →** to walk through items in number order.
- Refreshes every `REFRESH_SECONDS` without resetting the gallery position. `?demo` is carried over on its links.

## 5c. The red-hood girl and the loading screen (`girl.js`, `hood/`)

- She comes from five hand-painted illustrations, cut out onto transparent WebP in `hood/`: `flower`, `palette`, `shopping`, `painting` (single poses) and `wagon` (pulling a wagon of goodies, with a kite). To replace one, keep the file name, and bump `HOOD_V` in `girl.js`.
- `hoodImg(n)` returns one of the four single poses as an `<img>`, cycling by `n`. Both pages pass the item number, so an item keeps the same pose whatever the sort order.
- **Live board** (`index.html`): every item card has her standing to the left of the photo circle, swaying very slightly. The photo stays centred and she shrinks to the space on its left, so she never spills out of the card.
- **Item list** (`items.html`): on screens 1120 px and wider she stands in the side margin next to each row, left and right in turn, swaying very slightly. The margin is too narrow on phones, so she is hidden there.
- **Loading screen** (both pages): a portrait (9:16) scene that fills the phone screen. Bunting sways at the top, the Jittamett Family logo sits above the event name, she pulls her wagon through the market (she bobs with each step while stalls and flowers scroll past) and item emojis hop out of the wagon. Text: "กำลังเดินเลือกของประมูล…". On wider screens the scene stays centred and the ground and stalls stretch to the edges.
- It shows for at least 3 s, then fades out after the first load finishes (success or error). Add `?noloader` to the URL to skip it. Motion stops for people with "reduce motion" turned on.

## 6. Gotchas

- **Bump the script version after every JS change.** The pages load `auction-core.js?v=…` and `girl.js?v=…` in `index.html`, `items.html` and `item.html`. Browsers cache by that exact address, so if you edit a `.js` file but leave the `?v=` tag alone, people keep running the old copy. For example, the event name was fixed in `auction-core.js` but phones still showed the old one. Use the date, plus a letter for more changes the same day (`20261011`, `20261011b`, …), and change it in all three pages. Images in `hood/` work the same way through `HOOD_V` in `girl.js`.
- **Keep the amount column numbers only.** Google's gviz endpoint guesses one type per column. If most answers are numbers and a few are text like `1,000 บาท`, the text ones come back **empty** and those bids are silently lost. Number validation on the form question prevents this.
- **Timezone.** Form timestamps carry no timezone. The browser reads them as its own local time, so `END_TIME` must include `+07:00`, and it works correctly for anyone browsing in Thailand.
- **The sheet is the source of truth.** To cancel a bid (a joke bid, a typo of 100000), delete or edit that row in the responses tab. The page picks up the change on its next refresh.
- **Privacy.** The page is public (GitHub Pages). It shows only the parent's first name, the child's nickname and รุ่น, and never the phone number. It has `noindex`, but anyone with the link can see it. The sheet itself is viewable by anyone with the sheet link, so share the **page** link, not the sheet link. Remove the footer "เปิดชีท" link if that matters (`#sheetLinkWrap`).
- **"Real-time"** means polling every `REFRESH_SECONDS`. Polling pauses while the tab is hidden and refreshes immediately when you come back.

## 7. Regenerating the page

To rebuild the auction pages from scratch (by hand or with an AI assistant), give it this README plus `poster-template.jpg` and this brief:

> Build static pages for a Thai school charity auction (no build step, GitHub Pages): `auction/auction-core.js` (CONFIG, gviz fetch, column mapping, bidding rules, demo data, `fetchModel()`, `formUrl(item|null)`), `auction/index.html` (live board) and `auction/items.html` (item list, as described in §5b). Both pages load the core script.
> Data: read a Google Sheet via `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:json&headers=1&gid=<gid>` (form responses) and `&sheet=Items` (catalog), parse the JSON out of the `setResponse(...)` wrapper, and map columns by header keywords exactly as in §2–3.
> Logic: follow §5 exactly (sheet order, start price, minimum increment, first bidder wins ties, end-time cutoff, test-row filter, rejected bids kept with reasons).
> UI (Thai): bunting header, event name in handwritten font (Mali), status pill with live dot + last-updated time + refresh button, optional countdown, then an item dropdown ("ทั้งหมด" by default; each option = item + current top bid + leader; picking one filters the grid to that card and sets `#item-<no>` for deep links) and a sort select, then a grid of item cards styled after the poster: circular photo with a blue-grey ring and a 🎀 bow, a tilted wooden "Item no. NN" plank, and a lemon-yellow board in a brown wood frame holding name, description, donor, current price, 👑 leader (`คุณ<first name>` + `น้อง<nick> · รุ่น X`), bid count, next minimum, a "ประมูลชิ้นนี้" button (pre-filled form link) and a "รายละเอียด" button linking to `item.html?no=N` (gallery of all photos, full description, price box, bid history, prev/next item; see §5c).
> Palette: paper `#f6f0dc`, red `#e2553f`, olive `#7f8f52`, lemon `#e9ea8c`, ring `#a3a9c6`, wood `#9a4423`. Fonts: Mali (headings), Sarabun (body).
> Behaviour: poll every 2 minutes (pause when the tab is hidden), animate cards and show a toast when an item's top bid rises, keep showing the last good data if a fetch fails, demo mode with fake data when no SHEET_ID or `?demo`. Escape all sheet text before inserting it into HTML. Never display phone numbers. Works at 390 px width with no horizontal scroll. Add `noindex` meta.
> Also add a card linking to `auction/` in the root `index.html`.

## 8. Publish

Commit and push to `main`. GitHub Pages serves it at `/thor-events/auction/` within a few minutes. See `market/README.md` §5 for the token-based push and the reminder never to commit the token.
