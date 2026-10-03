# Charity Auction · ประมูลการกุศล

A live auction board for the ตลาดน้ำจิตน้ำใจ market. People bid by submitting a **Google Form**.
The page reads the form's **Google Sheet** and shows each item's **current highest bid and bidder**.
It refreshes itself every 20 seconds and makes a little "bump" + toast whenever a new high bid lands.

- Page: <https://tsripata.github.io/thor-events/auction/>
- Preview with fake data: <https://tsripata.github.io/thor-events/auction/?demo>
- File: `auction/index.html`. It is one file with no build step and no server. All config is in `CONFIG` at the top of the `<script>`.
- Design reference: `auction/poster-template.jpg` (the event's item-poster template)

This README is the full spec. Use it to set the page up, change it, or regenerate it from scratch (see §7).

---

## 1. How it works

```
Parent ──(Google Form)──▶ Responses tab in Google Sheet ──(gviz, read-only)──▶ auction/index.html
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

| Item no. | ชื่อของ | รายละเอียด | ผู้บริจาค | ราคาเริ่มต้น | เพิ่มขั้นต่ำ | รูป | Emoji |
|---|---|---|---|---|---|---|---|
| 1 | ตุ๊กตาหมีถักมือ | ถักจากไหมพรม สูง 30 ซม. | ครอบครัวน้องข้าวปั้น | 100 | 20 | Drive or image link | 🧸 |

   - Header keywords: `Item no`/`หมายเลข`/`ลำดับ`, `ชื่อ`/`name`, `รายละเอียด`/`desc`, `บริจาค`/`donor`, `เริ่ม`/`start`, `ขั้นต่ำ`/`increment`/`step`, `รูป`/`ภาพ`/`image`, `emoji`.
   - **รูป**: either a Google Drive link (the file must be shared *Anyone with the link*) or any direct image URL. Drive links are shown through `drive.google.com/thumbnail?id=…`. With no picture, the Emoji (default 🎁) is shown in the circle.
   - Blank `ราคาเริ่มต้น` / `เพิ่มขั้นต่ำ` fall back to `DEFAULT_START_PRICE` / `DEFAULT_MIN_INCREMENT`.
3. If the `Items` tab is missing, the page still works. It builds items from whatever people bid on, using the dropdown text as the name.

## 4. CONFIG

```js
const CONFIG = {
  EVENT_NAME: "ตลาดน้ำจิตน้ำใจ #25",
  SHEET_ID: "",              // from the sheet URL: /spreadsheets/d/<SHEET_ID>/edit
  BIDS_GID: "0",             // the #gid= number of the "Form Responses 1" tab
  ITEMS_SHEET: "Items",      // tab name for the catalog ("" = derive from bids)
  FORM_URL: "",              // https://docs.google.com/forms/d/e/…/viewform
  FORM_ITEM_ENTRY: "",       // "entry.123456789" for pre-filling the item
  END_TIME: "",              // e.g. "2026-10-25T15:00:00+07:00"; "" = never closes
  DEFAULT_START_PRICE: 0,
  DEFAULT_MIN_INCREMENT: 10,
  ENFORCE_INCREMENT: true,   // new bid must be ≥ leader + increment
  REFRESH_SECONDS: 20,
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
   - leader exists: amount ≥ **leader + minimum increment**. With `ENFORCE_INCREMENT: false`, any amount above the leader counts.
3. **Ties go to whoever bid first**, because a later equal bid doesn't beat the leader.
4. Bids that don't count are kept in the item's **ประวัติ** (history) dialog, struck through, with the reason (`ต้องอย่างน้อย 140`, `ส่งหลังปิดประมูล`, …). This makes disputes easy to settle.
5. "ขั้นต่ำถัดไป" (next minimum) on each card = leader + increment, or the starting price if nobody has bid yet.
6. Stats: number of items · number of counted bids · unique bidders (by phone, or by name if no phone) · **sum of all current top bids** (money raised if everyone pays).
7. After `END_TIME`, the countdown changes to "ปิดประมูลแล้ว", the bid button disappears, and leaders get a `ผู้ชนะ 🏆` badge.

Badges: `ยังว่าง` = no bids yet, `ฮอต 🔥` = 5+ counted bids, `ผู้ชนะ 🏆` = winner after close.
Sorting: item number, highest price, most bids, most recent, or unbid items first.

## 6. Gotchas

- **Keep the amount column numbers only.** Google's gviz endpoint guesses one type per column. If most answers are numbers and a few are text like `1,000 บาท`, the text ones come back **empty** and those bids are silently lost. Number validation on the form question prevents this.
- **Timezone.** Form timestamps carry no timezone. The browser reads them as its own local time, so `END_TIME` must include `+07:00`, and it works correctly for anyone browsing in Thailand.
- **The sheet is the source of truth.** To cancel a bid (a joke bid, a typo of 100000), delete or edit that row in the responses tab. The page picks up the change on its next refresh.
- **Privacy.** The page is public (GitHub Pages). It shows only the parent's first name, the child's nickname and รุ่น, and never the phone number. It has `noindex`, but anyone with the link can see it. The sheet itself is viewable by anyone with the sheet link, so share the **page** link, not the sheet link. Remove the footer "เปิดชีท" link if that matters (`#sheetLinkWrap`).
- **"Real-time"** means polling every `REFRESH_SECONDS`. Polling pauses while the tab is hidden and refreshes immediately when you come back.

## 7. Regenerating the page

To rebuild `auction/index.html` from scratch (by hand or with an AI assistant), give it this README plus `poster-template.jpg` and this brief:

> Build `auction/index.html` as a single self-contained static page (no build step, GitHub Pages) for a Thai school charity auction.
> Data: read a Google Sheet via `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:json&headers=1&gid=<gid>` (form responses) and `&sheet=Items` (catalog), parse the JSON out of the `setResponse(...)` wrapper, and map columns by header keywords exactly as in §2–3.
> Logic: follow §5 exactly (sheet order, start price, minimum increment, first bidder wins ties, end-time cutoff, test-row filter, rejected bids kept with reasons).
> UI (Thai): bunting header, event name in handwritten font (Mali), status pill with live dot + last-updated time + refresh button, optional countdown, 4 stat tiles, a horizontally scrolling "ประมูลล่าสุด" feed of the last 10 counted bids, then a grid of item cards styled after the poster: circular photo with a blue-grey ring and a 🎀 bow, a tilted wooden "Item no. NN" plank, and a lemon-yellow board in a brown wood frame holding name, description, donor, current price, 👑 leader (`คุณ<first name>` + `น้อง<nick> · รุ่น X`), bid count, next minimum, a "ประมูลชิ้นนี้" button (pre-filled form link) and a "ประวัติ" button that opens a history dialog.
> Palette: paper `#f6f0dc`, red `#e2553f`, olive `#7f8f52`, lemon `#e9ea8c`, ring `#a3a9c6`, wood `#9a4423`. Fonts: Mali (headings), Sarabun (body).
> Behaviour: poll every 20 s (pause when the tab is hidden), animate cards and show a toast when an item's top bid rises, keep showing the last good data if a fetch fails, demo mode with fake data when no SHEET_ID or `?demo`. Escape all sheet text before inserting it into HTML. Never display phone numbers. Works at 390 px width with no horizontal scroll. Add `noindex` meta.
> Also add a card linking to `auction/` in the root `index.html`.

## 8. Publish

Commit and push to `main`. GitHub Pages serves it at `/thor-events/auction/` within a few minutes. See `market/README.md` §5 for the token-based push and the reminder never to commit the token.
