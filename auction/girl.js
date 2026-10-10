/* The little red-hood girl from the event poster (poster-template.jpg), drawn as SVG so she can
   stand beside every item card and walk across the loading screen. Shared by index.html and items.html.
   Load it right after <body> opens: it mounts the loading screen before the rest of the page paints.
   The page calls GirlLoader.done() after its first load. See auction/README.md §5c */
"use strict";

const GIRL = {
  red: "#e5574a", redDeep: "#b93a2c", skin: "#f4a79c", cheek: "#e8645c",
  ink: "#2b221d", wood: "#9a4423", wood2: "#c8743f", lemon: "#e9ea8c"
};

// pose "stand": right hand raised holding a balloon string (item cards)
// pose "walk":  legs step, a basket swings (loading screen)
function girlSvg({ pose = "stand", cls = "" } = {}){
  const c = GIRL, walk = pose === "walk";
  const legs = `
    <g class="g-leg g-leg-l"><rect x="38" y="112" width="8" height="18" rx="3" fill="${c.skin}"/><ellipse cx="41" cy="131" rx="7" ry="4" fill="${c.wood}"/></g>
    <g class="g-leg g-leg-r"><rect x="54" y="112" width="8" height="18" rx="3" fill="${c.skin}"/><ellipse cx="59" cy="131" rx="7" ry="4" fill="${c.wood}"/></g>`;
  const basket = walk ? `
      <g class="g-basket">
        <path d="M10 100 Q12 84 22 86 Q30 88 30 100" fill="none" stroke="${c.wood}" stroke-width="2.4"/>
        <path d="M18 92 l-4 -16 l6 -1 z" fill="${c.wood2}"/>
        <circle cx="25" cy="90" r="5" fill="${c.red}"/><path d="M25 85 q2 -3 5 -3" stroke="#6f8a45" stroke-width="1.6" fill="none"/>
        <path d="M5 98 H35 L31 114 Q20 117 9 114 Z" fill="${c.wood2}" stroke="${c.wood}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M8 104 H32 M9 109 H31" stroke="${c.wood}" stroke-width="1.2" opacity=".7"/>
        <path d="M4 97 H36" stroke="${c.lemon}" stroke-width="3" stroke-linecap="round"/>
      </g>` : "";
  return `<svg class="girl ${cls}" viewBox="0 0 100 140" aria-hidden="true" focusable="false">
  ${legs}
  <g class="g-body">
    <g class="g-arm-l">
      ${basket}
      <path d="M33 84 Q24 92 22 101" stroke="${c.red}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="21" cy="102" r="5" fill="${c.skin}"/>
    </g>
    <path d="M32 78 Q50 72 68 78 L79 114 Q50 122 21 114 Z" fill="${c.red}" filter="url(#girlRough)"/>
    <path d="M32 112 Q50 117 68 112" stroke="${c.redDeep}" stroke-width="1.4" fill="none" opacity=".5"/>
    <g class="g-head">
      <path d="M50 18 C44 6 30 2 22 9 C12 17 12 34 14 48 C15 62 18 74 26 82 Q50 90 74 82 C82 74 85 62 86 48 C88 34 88 17 78 9 C70 2 56 6 50 18 Z"
            fill="${c.red}" filter="url(#girlRough)"/>
      <circle cx="50" cy="54" r="24" fill="${c.skin}"/>
      <path d="M27 47 Q50 25 73 47" stroke="${c.ink}" stroke-width="1.6" fill="none"/>
      <g stroke="${c.ink}" stroke-width="1.7" stroke-linecap="round" fill="none">
        <path d="M31 44 q1 -6 4 -9"/><path d="M36 40 q0 -6 3 -9"/><path d="M41 38 q0 -5 2 -8"/><path d="M46 37 q0 -5 1 -8"/>
        <path d="M51 37 q1 -5 0 -8"/><path d="M56 37 q1 -5 -1 -8"/><path d="M61 39 q1 -5 -2 -8"/><path d="M66 42 q1 -5 -3 -8"/><path d="M70 45 q0 -4 -3 -7"/>
      </g>
      <circle cx="33" cy="62" r="6.5" fill="${c.cheek}" opacity=".55" filter="url(#girlBlur)"/>
      <circle cx="67" cy="62" r="6.5" fill="${c.cheek}" opacity=".55" filter="url(#girlBlur)"/>
      <g class="g-eyes" fill="${c.ink}"><circle cx="40" cy="54" r="2.3"/><circle cx="60" cy="54" r="2.3"/></g>
      <circle cx="50" cy="61" r="2.8" fill="${c.red}"/>
      <path d="M44 66 Q50 72 56 66" stroke="${c.ink}" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    </g>
    <g fill="none" stroke="${c.redDeep}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 86 C44 80 37 82 39 88 C41 93 47 90 50 86 C53 90 59 93 61 88 C63 82 56 80 50 86 Z"/>
      <path d="M48 88 L43 99 M52 88 L57 99"/>
    </g>
    <g class="g-arm-r">
      <path d="M67 84 Q78 76 82 62" stroke="${c.red}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <circle cx="83" cy="58" r="5" fill="${c.skin}"/>
    </g>
  </g>
</svg>`;
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
   LOADING SCREEN — portrait (9:16) scene: Jittamett Family logo on top, she walks through the market
   holding a balloon while item emojis pop up inside it.
   ================================================================== */
const GirlLoader = (() => {
  const css = `
.girl{display:block;overflow:visible}
.girl .g-leg,.girl .g-arm-l,.girl .g-arm-r,.girl .g-head,.girl .g-basket{transform-box:fill-box}
.girl .g-leg{transform-origin:50% 0}
.girl .g-arm-l{transform-origin:85% 10%}
.girl .g-head{transform-origin:50% 90%}
.girl .g-eyes{transform-box:fill-box;transform-origin:50% 50%;animation:gBlink 4.6s infinite}
.girl.walk .g-leg-l{animation:gStep .64s ease-in-out infinite}
.girl.walk .g-leg-r{animation:gStep .64s ease-in-out infinite reverse}
.girl.walk .g-body{animation:gBob .32s ease-in-out infinite alternate}
.girl.walk .g-arm-l{animation:gSwing .64s ease-in-out infinite}
.girl.walk .g-head{animation:gTilt 1.28s ease-in-out infinite}
@keyframes gStep{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(16deg)}}
@keyframes gBob{from{transform:translateY(0)}to{transform:translateY(-3px)}}
@keyframes gSwing{0%,100%{transform:rotate(9deg)}50%{transform:rotate(-9deg)}}
@keyframes gTilt{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes gBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}

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
#girlLoader .gl-balloon{animation:glFloat 1.28s ease-in-out infinite;transform-origin:206px 400px}
@keyframes glFloat{0%,100%{transform:translate(0,0) rotate(-2deg)}50%{transform:translate(2px,-4px) rotate(2deg)}}
#girlLoader .gl-item{transform-box:fill-box;transform-origin:50% 50%;animation:glPop .5s cubic-bezier(.3,1.6,.5,1)}
@keyframes glPop{from{transform:scale(.2);opacity:0}to{transform:none;opacity:1}}
#girlLoader .gl-dots tspan{animation:glDot 1.2s infinite}
#girlLoader .gl-dots tspan:nth-child(2){animation-delay:.2s}
#girlLoader .gl-dots tspan:nth-child(3){animation-delay:.4s}
@keyframes glDot{0%,60%,100%{opacity:.15}30%{opacity:1}}
@media (prefers-reduced-motion:reduce){#girlLoader *,.girl *{animation:none!important}}
`;
  const ITEMS = ["🧸", "🎨", "🧁", "🪴", "📚", "🧺", "🎁", "👗", "🍯", "🪁"];
  let el = null, shownAt = 0, timer = null;

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
  <g class="gl-balloon">
    <path d="M232 286 Q236 350 207 412" stroke="#a3a9c6" stroke-width="2" fill="none"/>
    <circle cx="190" cy="210" r="72" fill="#fffdf6" stroke="#a3a9c6" stroke-width="9"/>
    <g class="gl-item-wrap"><text class="gl-item" x="190" y="232" text-anchor="middle" font-size="62">🧸</text></g>
    <g transform="translate(213 262) rotate(14)">${bowSvg().replace("<svg ", '<svg width="40" height="34" ')}</g>
  </g>
  <svg class="girl walk" x="98" y="338" width="130" height="182" viewBox="0 0 100 140" overflow="visible">${girlSvg({ pose: "walk", cls: "walk" }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>
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
    // Shared filters: a little brush roughness on the hood and coat, soft blush on the cheeks
    document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <filter id="girlRough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
      <filter id="girlBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8"/></filter>
    </defs></svg>`);
    if (new URLSearchParams(location.search).has("noloader")) return;
    el = document.createElement("div");
    el.id = "girlLoader";
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", "กำลังโหลด");
    el.innerHTML = flagsSvg() + sceneSvg();
    document.body.appendChild(el);
    el.querySelector(".gl-event").textContent = typeof CONFIG !== "undefined" ? CONFIG.EVENT_NAME : "ตลาดน้ำจิตต์น้ำใจ #25";
    shownAt = Date.now();
    let i = 0;
    const wrap = el.querySelector(".gl-item-wrap");
    timer = setInterval(() => {
      i = (i + 1) % ITEMS.length;
      wrap.innerHTML = `<text class="gl-item" x="190" y="232" text-anchor="middle" font-size="62">${ITEMS[i]}</text>`;
    }, 850);
  }

  // Keep her on screen long enough to take a few steps, then fade out
  function done(){
    if (!el) return;
    const node = el;
    el = null;
    setTimeout(() => {
      node.classList.add("out");
      setTimeout(() => { clearInterval(timer); node.remove(); }, 500);
    }, Math.max(0, 3000 - (Date.now() - shownAt)));
  }

  mount();
  return { done };
})();
