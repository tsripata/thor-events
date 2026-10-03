/* Shared by auction/index.html (live board) and auction/items.html (catalog).
   CONFIG lives here so both pages read the same sheet and form. See auction/README.md */
"use strict";

/* ==================================================================
   CONFIG — edit here only (both pages use it). See auction/README.md
   ================================================================== */
const CONFIG = {
  EVENT_NAME: "ตลาดน้ำจิตน้ำใจ #25",
  // Spreadsheet that receives the Google Form responses (must be shared: Anyone with the link → Viewer)
  SHEET_ID: "",
  // gid of the form-responses tab (the number after #gid= in the sheet URL)
  BIDS_GID: "0",
  // Name of the tab (same spreadsheet) that lists the items. Leave "" to derive items from bids only.
  ITEMS_SHEET: "Items",
  // Google Form link (…/viewform). Empty = hide the "bid" button.
  FORM_URL: "",
  // Pre-fill field id for the item question, e.g. "entry.123456789". Empty = no pre-fill.
  FORM_ITEM_ENTRY: "",
  // Auction closes at this time (ISO with timezone). Bids stamped after it are ignored. "" = no end.
  END_TIME: "",
  // Default rules when an item row leaves them blank
  DEFAULT_START_PRICE: 0,
  DEFAULT_MIN_INCREMENT: 10,
  // A new bid must beat the leader by at least the increment. false = any higher amount wins.
  ENFORCE_INCREMENT: true,
  REFRESH_SECONDS: 20,
  // Show only the first word of the parent's name publicly
  SHORT_PARENT_NAME: true,
  // Rows whose names match this are ignored (form test rows)
  TEST_NAME_PATTERN: /^(test|ทดสอบ|เทส)/i
};

const qs = new URLSearchParams(location.search);
if (qs.get("sheet")) CONFIG.SHEET_ID = qs.get("sheet");
if (qs.get("gid")) CONFIG.BIDS_GID = qs.get("gid");
if (qs.get("end")) CONFIG.END_TIME = qs.get("end");
const DEMO = qs.has("demo") || !CONFIG.SHEET_ID;
if (DEMO) CONFIG.REFRESH_SECONDS = 8;

/* ==================================================================
   HELPERS
   ================================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const norm = s => String(s == null ? "" : s).replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
const baht = n => Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const endTime = CONFIG.END_TIME ? new Date(CONFIG.END_TIME) : null;

function parseAmount(s){
  const m = String(s).replace(/[,\s]/g, "").match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
// "03 · ตุ๊กตาหมี" → "3" ; no number → lower-cased text
function itemKey(s){
  const t = norm(s);
  const m = t.match(/\d+/);
  return m ? String(parseInt(m[0], 10)) : t.toLowerCase();
}
function itemLabelText(s){
  return norm(s).replace(/^\s*(item\s*no\.?|no\.?|#|หมายเลข)?\s*\d+\s*[·.:\-–)]*\s*/i, "");
}
function parseGvizDate(v){
  if (v instanceof Date) return v;
  const m = /Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/.exec(String(v));
  if (!m) { const d = new Date(v); return isNaN(d) ? null : d; }
  return new Date(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}
function driveId(url){
  const m = /(?:id=|\/d\/)([\w-]{20,})/.exec(url || "");
  return m ? m[1] : null;
}
function imageUrl(raw){
  const s = norm(raw);
  if (!s) return "";
  const id = driveId(s);
  if (id && /google\.com/.test(s)) return `https://drive.google.com/thumbnail?id=${id}&sz=w600`;
  return /^https?:\/\//.test(s) ? s : "";
}
function timeAgo(d){
  if (!d) return "";
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "เมื่อกี้";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.ที่แล้ว`;
  return d.toLocaleDateString("th-TH", { day:"numeric", month:"short" });
}
const clock = d => d ? d.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit", second:"2-digit" }) : "";

/* ==================================================================
   FETCH (Google gviz endpoint — read-only, works on a link-shared sheet)
   ================================================================== */
async function fetchGrid({ gid, sheet }){
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&headers=1&`
            + (sheet ? `sheet=${encodeURIComponent(sheet)}` : `gid=${encodeURIComponent(gid)}`)
            + `&_=${Date.now()}`;
  const res = await fetch(url, { cache:"no-store" });
  if (!res.ok) throw new Error(`Google ตอบกลับ HTTP ${res.status}`);
  const txt = await res.text();
  const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("อ่านคำตอบจาก Google ไม่ออก");
  const json = JSON.parse(txt.slice(a, b + 1));
  if (json.status === "error" || !json.table) {
    const msg = (json.errors && json.errors[0] && (json.errors[0].detailed_message || json.errors[0].message)) || "";
    throw new Error("ชีทไม่เปิดให้ดูแบบสาธารณะ หรือไม่พบแท็บ " + msg);
  }
  const headers = json.table.cols.map(c => norm(c.label));
  const rows = json.table.rows.map(r => headers.map((_, i) => {
    const c = (r.c || [])[i];
    if (c == null) return { v:null, f:"" };
    return { v:c.v, f:norm(c.f != null ? c.f : (c.v != null ? c.v : "")) };
  }));
  return { headers, rows };
}

// Match columns by header text, not by position, so editing the form doesn't break the page.
// Order matters: the first role that matches a header claims it.
function mapColumns(headers, defs){
  const map = {};
  headers.forEach((h, i) => {
    for (const [role, test] of defs) {
      if (map[role] == null && test(h)) { map[role] = i; break; }
    }
  });
  return map;
}
const BID_COLS = [
  ["time",    h => /timestamp|ประทับเวลา/i.test(h)],
  ["phone",   h => /เบอร์|phone|tel|line/i.test(h)],
  ["amount",  h => /ราคา|bid|amount|จำนวนเงิน|ยอดเงิน|บาท/i.test(h)],
  ["display", h => /ชื่อที่(จะ)?(แสดง|โชว์)|display/i.test(h)],
  ["child",   h => /ชื่อเด็ก|ชื่อเล่น|ชื่อน้อง|child|kid|student/i.test(h)],
  ["parent",  h => /ผู้ปกครอง|parent|ชื่อ|name/i.test(h)],
  ["batch",   h => /^รุ่น|class|grade|ห้อง/i.test(h)],
  ["item",    h => /item|รายการ|สินค้า|หมายเลข|ของ|ชิ้น|lot/i.test(h)]
];
const ITEM_COLS = [
  ["no",    h => /^(item\s*no|no\.?$|หมายเลข|ลำดับ|#)/i.test(h)],
  ["start", h => /เริ่ม|start|opening/i.test(h)],
  ["step",  h => /เพิ่มขั้นต่ำ|ขั้นต่ำ|increment|step/i.test(h)],
  ["image", h => /รูป|ภาพ|image|photo|picture/i.test(h)],
  ["donor", h => /บริจาค|donor|donated|ผู้ให้/i.test(h)],
  ["desc",  h => /รายละเอียด|desc|detail/i.test(h)],
  ["name",  h => /ชื่อ|name|item|สินค้า/i.test(h)],
  ["emoji", h => /emoji|อีโมจิ/i.test(h)]
];

/* ==================================================================
   BUILD MODEL
   ================================================================== */
function buildItems(grid){
  if (!grid) return [];
  const c = mapColumns(grid.headers, ITEM_COLS);
  const get = (r, k) => c[k] == null ? "" : r[c[k]].f;
  return grid.rows.map(r => {
    const rawNo = get(r, "no") || get(r, "name");
    if (!norm(rawNo)) return null;
    const start = parseAmount(get(r, "start"));
    const step = parseAmount(get(r, "step"));
    return {
      key: itemKey(rawNo),
      no: (rawNo.match(/\d+/) || [""])[0],
      name: get(r, "name") || itemLabelText(rawNo) || `ชิ้นที่ ${rawNo}`,
      desc: get(r, "desc"),
      donor: get(r, "donor"),
      image: imageUrl(get(r, "image")),
      emoji: get(r, "emoji") || "🎁",
      start: isNaN(start) ? CONFIG.DEFAULT_START_PRICE : start,
      step: isNaN(step) || step <= 0 ? CONFIG.DEFAULT_MIN_INCREMENT : step
    };
  }).filter(Boolean);
}

function displayName(p){
  if (p.display) return { main:p.display, sub:p.batch ? `รุ่น ${p.batch}` : "" };
  let parent = p.parent || "";
  if (CONFIG.SHORT_PARENT_NAME) parent = parent.split(" ")[0];
  const kid = p.child ? `น้อง${p.child.replace(/^น้อง\s*/, "")}` : "";
  const main = parent ? `คุณ${parent.replace(/^คุณ\s*/, "")}` : (kid || "ไม่ระบุชื่อ");
  const sub = [parent ? kid : "", p.batch ? `รุ่น ${p.batch}` : ""].filter(Boolean).join(" · ");
  return { main, sub };
}

function buildModel(itemsGrid, bidsGrid){
  const items = buildItems(itemsGrid);
  const byKey = new Map(items.map(it => [it.key, it]));
  const notes = [];
  const c = mapColumns(bidsGrid.headers, BID_COLS);
  if (c.item == null) notes.push("ไม่พบคอลัมน์ของที่ประมูล (หัวคอลัมน์ควรมีคำว่า “หมายเลข” หรือ “สินค้า”)");
  if (c.amount == null) notes.push("ไม่พบคอลัมน์ราคา (หัวคอลัมน์ควรมีคำว่า “ราคา”)");
  const get = (r, k) => c[k] == null ? "" : r[c[k]].f;

  const bids = [];
  bidsGrid.rows.forEach((r, i) => {
    const rawItem = get(r, "item");
    if (!rawItem) return;
    const person = { display:get(r, "display"), parent:get(r, "parent"), child:get(r, "child"), batch:get(r, "batch") };
    if ([person.display, person.parent, person.child].some(n => n && CONFIG.TEST_NAME_PATTERN.test(n))) return;
    const key = itemKey(rawItem);
    if (!byKey.has(key)) {
      const it = {
        key, no:(rawItem.match(/\d+/) || [""])[0], name:itemLabelText(rawItem) || rawItem,
        desc:"", donor:"", image:"", emoji:"🎁",
        start:CONFIG.DEFAULT_START_PRICE, step:CONFIG.DEFAULT_MIN_INCREMENT, fromBidsOnly:true
      };
      byKey.set(key, it); items.push(it);
    }
    const phone = get(r, "phone").replace(/\D/g, "");
    bids.push({
      row:i + 2, key, amount:parseAmount(get(r, "amount")),
      time:c.time == null ? null : parseGvizDate(r[c.time].v),
      who:displayName(person),
      bidderId:phone || norm(person.parent + "|" + person.child + "|" + person.display).toLowerCase()
    });
  });

  // Sheet order = submission order. Walk it and keep the leader per item.
  const state = new Map(items.map(it => [it.key, { item:it, leader:null, history:[], valid:0, lastAt:null }]));
  for (const b of bids) {
    const s = state.get(b.key);
    const it = s.item;
    const min = s.leader ? s.leader.amount + (CONFIG.ENFORCE_INCREMENT ? it.step : 0.01) : it.start;
    if (isNaN(b.amount) || b.amount <= 0) b.reject = "อ่านราคาไม่ได้";
    else if (endTime && b.time && b.time > endTime) b.reject = "ส่งหลังปิดประมูล";
    else if (b.amount < min) b.reject = s.leader ? `ต้องอย่างน้อย ${baht(min)}` : `ต่ำกว่าราคาเริ่มต้น ${baht(it.start)}`;
    if (!b.reject) { s.leader = b; s.valid++; s.lastAt = b.time; }
    s.history.push(b);
  }
  for (const s of state.values()) {
    s.next = s.leader ? s.leader.amount + it_step(s) : s.item.start;
  }
  const lots = [...state.values()];
  const extra = items.filter(it => it.fromBidsOnly).map(it => it.no || it.name);
  if (itemsGrid && extra.length) notes.push(`มีคนประมูลของที่ไม่อยู่ในแท็บ ${CONFIG.ITEMS_SHEET}: ${extra.join(", ")}`);
  return { lots, bids, notes };
}
function it_step(s){ return CONFIG.ENFORCE_INCREMENT ? s.item.step : 1; }

/* ==================================================================
   DEMO DATA (used when SHEET_ID is empty or ?demo is in the URL)
   ================================================================== */
const DEMO_ITEMS = [
  ["1","ตุ๊กตาหมีถักมือ","ถักจากไหมพรมคอตตอน สูง 30 ซม. ทำโดยคุณยายของน้องข้าวปั้น","ครอบครัวน้องข้าวปั้น",100,20,"🧸"],
  ["2","ภาพวาดสีน้ำ “ตลาดนัด”","ผลงานเด็ก ๆ รุ่น 5 ใส่กรอบไม้พร้อมแขวน","เด็ก ๆ รุ่น 5",200,50,"🖼️"],
  ["3","เซตขนมไทยโบราณ","ขนมชั้น ทองหยิบ ฝอยทอง 1 กล่องใหญ่ รับวันงาน","บ้านขนมแม่น้อย",150,10,"🍮"],
  ["4","กระถางต้นไม้เพนต์มือ","ต้นกุหลาบหินในกระถางดินเผาลายดอกไม้","คุณครูฝ้าย",80,10,"🪴"],
  ["5","บัตรทำขนมปังกับเชฟ","Workshop 2 ชม. สำหรับเด็ก 1 คน + ผู้ปกครอง 1 คน","Little Bakery",500,100,"🥐"],
  ["6","ผ้าพันคอมัดย้อม","ผ้าฝ้ายมัดย้อมครามธรรมชาติ ขนาด 50×180 ซม.","ครอบครัวน้องภูผา",120,20,"🧣"]
];
const DEMO_PEOPLE = [
  ["สมใจ","มะลิ","3"],["วรรณา","ภูผา","1"],["ปกรณ์","ข้าวปั้น","2"],["นิดา","ต้นกล้า","5"],
  ["อรุณี","ใบเตย","4"],["ธนพล","ไทเกอร์","2"],["กมล","น้ำฝน","1"]
];
let demoBids = null;
function demoGrids(){
  const items = { headers:["Item no.","ชื่อของ","รายละเอียด","ผู้บริจาค","ราคาเริ่มต้น","เพิ่มขั้นต่ำ","Emoji"],
    rows: DEMO_ITEMS.map(r => r.map(v => ({ v, f:String(v) }))) };
  const cur = new Map();
  const add = (minsAgo) => {
    const it = DEMO_ITEMS[Math.floor(Math.random() * DEMO_ITEMS.length)];
    const p = DEMO_PEOPLE[Math.floor(Math.random() * DEMO_PEOPLE.length)];
    const base = cur.get(it[0]) || it[4] - it[5];
    const amt = base + it[5] * (1 + Math.floor(Math.random() * 3));
    cur.set(it[0], amt);
    const d = new Date(Date.now() - minsAgo * 60000);
    demoBids.push([d, `${it[0].padStart(2, "0")} · ${it[1]}`, amt, p[0] + " ใจดี", p[1], p[2], "080000000" + DEMO_PEOPLE.indexOf(p)]);
  };
  if (!demoBids) { demoBids = []; for (let i = 24; i > 0; i--) add(i * 4); }
  else if (Math.random() < 0.7) add(0);
  const bids = { headers:["ประทับเวลา","หมายเลขของที่ต้องการประมูล","ราคาที่ให้ (บาท)","ชื่อผู้ปกครอง","ชื่อเล่นเด็ก","รุ่น","เบอร์โทร"],
    rows: demoBids.map(r => r.map(v => ({ v, f:v instanceof Date ? v.toISOString() : String(v) }))) };
  return { items, bids };
}

/* ==================================================================
   LOAD + FORM LINK
   ================================================================== */
async function fetchModel(){
  let itemsGrid = null, bidsGrid;
  if (DEMO) ({ items:itemsGrid, bids:bidsGrid } = demoGrids());
  else {
    const [ig, bg] = await Promise.allSettled([
      CONFIG.ITEMS_SHEET ? fetchGrid({ sheet:CONFIG.ITEMS_SHEET }) : Promise.resolve(null),
      fetchGrid({ gid:CONFIG.BIDS_GID })
    ]);
    if (bg.status === "rejected") throw bg.reason;
    bidsGrid = bg.value;
    itemsGrid = ig.status === "fulfilled" ? ig.value : null;
  }
  const m = buildModel(itemsGrid, bidsGrid);
  if (!DEMO && CONFIG.ITEMS_SHEET && !itemsGrid) m.notes.push(`อ่านแท็บ “${CONFIG.ITEMS_SHEET}” ไม่ได้ แสดงเฉพาะของที่มีคนประมูลแล้ว`);
  return m;
}

// Google Form link, pre-filled with this item when FORM_ITEM_ENTRY is set. No item = the plain form.
function formUrl(it){
  if (!CONFIG.FORM_URL) return DEMO ? "#demo-form" : "";
  if (!it || !CONFIG.FORM_ITEM_ENTRY) return CONFIG.FORM_URL;
  const u = new URL(CONFIG.FORM_URL);
  u.searchParams.set("usp", "pp_url");
  u.searchParams.set(CONFIG.FORM_ITEM_ENTRY, `${(it.no || "").padStart(2, "0")} · ${it.name}`);
  return u.toString();
}

// Demo mode has no real form: explain instead of navigating.
document.addEventListener("click", e => {
  const a = e.target.closest('a[href="#demo-form"]');
  if (!a) return;
  e.preventDefault();
  alert("โหมดตัวอย่าง: ปุ่มนี้จะเปิด Google Form สำหรับประมูล (ใส่ FORM_URL ใน auction-core.js)");
});
