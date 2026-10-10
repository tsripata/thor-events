/* The little red-hood girl, from hand-painted illustrations (hood/*.webp): she stands beside the
   items and pulls her wagon across the loading screen. Shared by index.html and items.html.
   Load it right after <body> opens: it mounts the loading screen before the rest of the page paints.
   The page calls GirlLoader.done() after its first load. See auction/README.md §5c */
"use strict";

const GIRL = { red: "#e5574a", redDeep: "#b93a2c" };

// Hand-painted cut-outs of her (transparent WebP, in hood/). The five single poses stand beside the
// items; the wagon one walks across the loading screen.
const HOOD_V = "20261010c";
const HOODS = [
  { src: "hood/flower.webp",   alt: "หนูหมวกแดงถือดอกไม้" },
  { src: "hood/palette.webp",  alt: "หนูหมวกแดงถือจานสี" },
  { src: "hood/shopping.webp", alt: "หนูหมวกแดงหิ้วถุงช้อปปิ้ง" },
  { src: "hood/painting.webp", alt: "หนูหมวกแดงนั่งระบายสีแก้ว" },
  { src: "hood/dance.webp",    alt: "หนูหมวกแดงเต้นขาเตะ ขยิบตา" }
];
const HOOD_WAGON = "hood/wagon.webp";

// One of her poses as an <img>; pick cycles through the poses so neighbouring items differ
function hoodImg(pick = 0, cls = "hood"){
  const h = HOODS[((pick % HOODS.length) + HOODS.length) % HOODS.length];
  return `<img class="${cls}" src="${h.src}?v=${HOOD_V}" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">`;
}

// A hand-drawn red ribbon bow, like the one tied on the poster's balloon
function bowSvg(cls = ""){
  return `<svg class="${cls}" viewBox="0 0 60 50" aria-hidden="true" focusable="false">
  <g fill="#ee6a5c" stroke="${GIRL.redDeep}" stroke-width="2.2" stroke-linejoin="round">
    <path d="M30 18 C22 4 6 4 6 14 C6 24 20 24 30 18 Z"/>
    <path d="M30 18 C38 4 54 4 54 14 C54 24 40 24 30 18 Z"/>
    <path d="M28 20 L16 44 L22 41 L25 47 L31 22 Z"/>
    <path d="M32 20 L44 42 L38 40 L36 46 L29 22 Z"/>
  </g>
  <path d="M14 11 q6 2 10 6 M46 11 q-6 2 -10 6" stroke="#fff3e8" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <circle cx="30" cy="19" r="4.5" fill="${GIRL.redDeep}"/>
</svg>`;
}

/* ==================================================================
   LOADING SCREEN — portrait (9:16) scene: Jittamett Family logo on top, she pulls her wagon of goodies
   through the market.
   ================================================================== */
const GirlLoader = (() => {
  const css = `
/* the walk: she bobs on every step and the whole picture rocks a little, like the wagon is rolling */
#girlLoader .gl-walker{transform-box:fill-box;transform-origin:50% 100%;animation:glWalk .64s ease-in-out infinite}
#girlLoader .gl-shadow{transform-box:fill-box;transform-origin:50% 50%;animation:glShadow .32s ease-in-out infinite alternate}
@keyframes glWalk{0%,100%{transform:translateY(0) rotate(-1.2deg)}25%{transform:translateY(-6px) rotate(0)}50%{transform:translateY(0) rotate(1.2deg)}75%{transform:translateY(-6px) rotate(0)}}
@keyframes glShadow{from{transform:scaleX(1);opacity:.22}to{transform:scaleX(.92);opacity:.14}}

#girlLoader{
  position:fixed;inset:0;z-index:100;background:#f6f0dc;overflow:hidden;
  transition:opacity .45s ease,visibility .45s;font-family:"Mali","Sarabun",cursive
}
#girlLoader.out{opacity:0;visibility:hidden}
#girlLoader .gl-flags{position:absolute;top:0;left:0;width:100%;height:9vh;min-height:48px;display:block}
@media (min-aspect-ratio:3/4){#girlLoader .gl-flags{height:42px;min-height:0}}
#girlLoader .gl-flags g{transform-box:fill-box;transform-origin:50% 0;animation:glFlag 2.4s ease-in-out infinite alternate}
#girlLoader .gl-flags g:nth-child(2n){animation-delay:-1.2s}
@keyframes glFlag{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
#girlLoader .gl-scene{position:absolute;inset:0;width:100%;height:100%;display:block}
#girlLoader .gl-far{animation:glScroll 9s linear infinite}
#girlLoader .gl-near{animation:glScroll 3.2s linear infinite}
@keyframes glScroll{from{transform:translateX(0)}to{transform:translateX(-180px)}}
#girlLoader .gl-dots tspan{animation:glDot 1.2s infinite}
#girlLoader .gl-dots tspan:nth-child(2){animation-delay:.2s}
#girlLoader .gl-dots tspan:nth-child(3){animation-delay:.4s}
@keyframes glDot{0%,60%,100%{opacity:.15}30%{opacity:1}}
@media (prefers-reduced-motion:reduce){#girlLoader *{animation:none!important}}
`;
  let el = null, shownAt = 0;

  // Grass tufts and flowers for the ground strip; drawn over 2 tiles so the strip loops seamlessly
  function groundTile(off){
    const f = (x, col) => `<g transform="translate(${x + off} 512)">
      <path d="M0 0 q-2 -18 2 -30" stroke="#6f8a45" stroke-width="2.4" fill="none"/>
      <g fill="${col}"><circle cx="2" cy="-36" r="6"/><circle cx="9" cy="-30" r="6"/><circle cx="-5" cy="-30" r="6"/><circle cx="6" cy="-23" r="6"/><circle cx="-2" cy="-23" r="6"/></g>
      <circle cx="2" cy="-29" r="3.5" fill="#a3a9c6"/></g>`;
    const tuft = x => `<path d="M${x + off} 514 q2 -12 6 -16 M${x + off + 5} 514 q1 -9 -2 -14 M${x + off + 9} 514 q3 -8 9 -10" stroke="#7f8f52" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    return f(20, "#f3a7a3") + tuft(70) + f(118, GIRL.red) + tuft(150);
  }
  function stallTile(off){
    const stall = (x, a, b) => `<g transform="translate(${x + off} 0)" opacity=".55">
      <rect x="0" y="420" width="70" height="80" fill="#efe4c4"/>
      <path d="M-6 420 h82 l-6 -26 h-70 z" fill="${a}"/>
      ${[0, 1, 2, 3, 4].map(i => `<path d="M${-6 + i * 16.4} 420 h8.2 l-1 -26 h-8.2 z" fill="${b}"/>`).join("")}
      <path d="M-6 420 ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `q4.1 8 8.2 0`).join(" ")}" fill="${a}"/>
      <rect x="8" y="440" width="54" height="8" rx="2" fill="#c8743f"/>
    </g>`;
    return stall(10, "#e2553f", "#fff6ea") + stall(100, "#7f8f52", "#e9ea8c");
  }

  function sceneSvg(){
    const tiles = (fn, n) => Array.from({ length: n }, (_, i) => fn(-720 + i * 180)).join("");
    return `<svg class="gl-scene" viewBox="0 -100 360 740" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <image href="jittamett-logo.png?v=20261010" x="140" y="-42" width="80" height="92"/>
  <text x="180" y="78" text-anchor="middle" font-size="21" font-weight="600" fill="#7f8f52" class="gl-event"></text>
  <text x="180" y="114" text-anchor="middle" font-size="34" font-weight="700" fill="#e2553f">ประมูลการกุศล</text>
  <g class="gl-far">${tiles(stallTile, 12)}</g>
  <rect x="-2000" y="512" width="4360" height="2000" fill="#ecebc0"/>
  <path d="M-2000 512 H2360" stroke="#d6d39a" stroke-width="3"/>
  <g class="gl-near">${tiles(groundTile, 12)}</g>
  <ellipse class="gl-shadow" cx="180" cy="514" rx="150" ry="9" fill="#3b2f27"/>
  <image class="gl-walker" href="${HOOD_WAGON}?v=${HOOD_V}" x="22" y="236" width="316" height="280"/>
  <text x="180" y="572" text-anchor="middle" font-size="19" font-weight="600" fill="#3b2f27">กำลังเดินเลือกของประมูล<tspan class="gl-dots"><tspan>.</tspan><tspan>.</tspan><tspan>.</tspan></tspan></text>
  <text x="180" y="600" text-anchor="middle" font-size="14" fill="#857766" font-family="Sarabun,sans-serif">รอแป๊บนึงนะ กำลังดึงราคาล่าสุด</text>
</svg>`;
  }

  function flagsSvg(){
    const colors = ["#e2553f", "#e9ea8c", "#7f8f52", "#e8774d", "#f3a7a3"];
    let g = "";
    for (let i = 0; i < 12; i++) {
      const x = i * 100 + 12, t = (x + 38) / 1200, y = 4 + 70 * t * (1 - t);
      g += `<g><path d="M${x} ${y.toFixed(1)} L${x + 76} ${y.toFixed(1)} L${x + 38} ${(y + 80).toFixed(1)} Z" fill="${colors[i % colors.length]}" opacity=".92"/></g>`;
    }
    return `<svg class="gl-flags" viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 4 Q600 39 1200 4" fill="none" stroke="#e2553f" stroke-width="3"/>${g}</svg>`;
  }

  function mount(){
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    if (new URLSearchParams(location.search).has("noloader")) return;
    el = document.createElement("div");
    el.id = "girlLoader";
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", "กำลังโหลด");
    el.innerHTML = flagsSvg() + sceneSvg();
    document.body.appendChild(el);
    el.querySelector(".gl-event").textContent = typeof CONFIG !== "undefined" ? CONFIG.EVENT_NAME : "ตลาดน้ำจิตต์น้ำใจ #25";
    shownAt = Date.now();
  }

  // Keep her on screen long enough to take a few steps, then fade out
  function done(){
    if (!el) return;
    const node = el;
    el = null;
    setTimeout(() => {
      node.classList.add("out");
      setTimeout(() => node.remove(), 500);
    }, Math.max(0, 3000 - (Date.now() - shownAt)));
  }

  mount();
  return { done };
})();
