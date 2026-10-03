// Draws the vector-art creatures (17 stages each) and writes, for each one:
//   public/sprites/<id>/NN-<stage>.svg  the sprites
//   public/creatures/<id>.js            its stage list (names, days, motion, legs, mouths)
// Run: node tools/draw-creatures.mjs   (then bump SPRITE_VERSION in public/creatures/index.js)
//
// To add another drawn creature: write a draw function like dino() below and add it to CREATURES.
// Creatures with hand-made art (like the croc dragon) skip this script: see public/creatures/croc-dragon.js.
import { mkdirSync, writeFileSync } from 'node:fs';

const PUBLIC = new URL('../public/', import.meta.url);
const DAYS = [0, 1, 2, 3, 5, 7, 9, 12, 15, 19, 24, 30, 37, 45, 55, 70, 100];

// ---------- Drawing helpers ----------

const OL = '#25303b'; // outline
const S = (w = 5) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const r1 = (n) => Math.round(n * 10) / 10;

const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => `#${rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
const dark = (c, t = 0.22) => mix(c, '#000000', t);
const light = (c, t = 0.4) => mix(c, '#ffffff', t);

const doc = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>\n`;
const shade = (id, c) =>
  `<radialGradient id="${id}" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="${light(c, 0.45)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${dark(c, 0.2)}"/></radialGradient>`;
const glow = (id, c) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".75"/><stop offset=".6" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const at = (x, y, k, inner, rot = 0) => `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${rot}) scale(${k})">${inner}</g>`;

function eye(x, y, r = 12, o = {}) {
  if (o.closed) return `<path d="M${x - r} ${y} Q${x} ${y + r * 0.9} ${x + r} ${y}" fill="none" ${S(4)}/>`;
  let s = `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="#fff" ${S(3.5)}/>`
    + `<circle cx="${x - r * 0.22}" cy="${y + r * 0.12}" r="${r * 0.66}" fill="${o.iris || '#1d1b2c'}"/>`
    + `<circle cx="${x - r * 0.42}" cy="${y - r * 0.22}" r="${r * 0.26}" fill="#fff"/>`;
  if (o.brow) s += `<path d="M${x - r * 1.2} ${y - r * 0.95} L${x + r * 1.1} ${y - r * 1.65}" ${S(5)}/>`;
  if (o.lashes) s += `<path d="M${x + r * 0.5} ${y - r} l${r * 0.5} ${-r * 0.5} M${x + r * 0.9} ${y - r * 0.6} l${r * 0.6} ${-r * 0.3}" ${S(3)}/>`;
  return s;
}

const sparkle = (x, y, r, c = '#fff6b8') =>
  `<path d="M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z" fill="${c}" stroke="${dark(c, 0.35)}" stroke-width="1.5"/>`;

function star(x, y, r, fill, w = 3) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${r1(x + Math.cos(a) * rr)},${r1(y + Math.sin(a) * rr)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" ${S(w)}/>`;
}

// A pointed feather, pointing up when rot = 0.
const feather = (x, y, len, w, rot, fill, sw = 4) =>
  `<path transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)})" d="M0 0 C${w} ${-len * 0.3} ${w * 0.7} ${-len * 0.8} 0 ${-len} C${-w * 0.7} ${-len * 0.8} ${-w} ${-len * 0.3} 0 0 Z" fill="${fill}" ${S(sw)}/>`;

const crown = (x, y, k, fill = '#ffd23f', gem = '#e8455a') => at(x, y, k,
  `<path d="M-30 0 L-34 -34 L-17 -16 L0 -40 L17 -16 L34 -34 L30 0 Z" fill="${fill}" ${S(4)}/>`
  + `<circle cx="0" cy="-10" r="6" fill="${gem}" ${S(2.5)}/><circle cx="-34" cy="-36" r="4" fill="${fill}" ${S(2.5)}/><circle cx="34" cy="-36" r="4" fill="${fill}" ${S(2.5)}/>`);

// ---------- Eggs (shared) ----------

const EGG = 'M120 22 C178 22 214 132 214 190 C214 250 172 290 120 290 C68 290 26 250 26 190 C26 132 62 22 120 22 Z';
const SHELL = 'M14 186 L44 162 L70 190 L98 160 L126 188 L152 158 L180 188 L206 160 L232 186 L246 178 C250 248 206 296 130 296 C54 296 10 248 14 186 Z';

function egg({ base, decor, crackGlow }, cracked) {
  let b = `<path d="${EGG}" fill="url(#egg)"/><g clip-path="url(#eggclip)">${decor}</g>`
    + `<ellipse cx="80" cy="96" rx="15" ry="34" fill="#fff" opacity=".55" transform="rotate(22 80 96)"/>`
    + `<path d="${EGG}" fill="none" ${S(6)}/>`;
  if (cracked) {
    const crack = 'M58 130 L88 144 L80 166 L110 174 L104 198 L134 206 L156 190';
    if (crackGlow) b += `<path d="${crack}" fill="none" stroke="${crackGlow}" stroke-width="14" stroke-linejoin="round" opacity=".85"/>`;
    b += `<path d="${crack}" fill="none" ${S(5)}/><path d="M110 174 L132 160 M134 206 L146 222" fill="none" ${S(4)}/>`;
    if (crackGlow) b += sparkle(176, 128, 14, crackGlow) + sparkle(54, 210, 9, crackGlow);
  }
  return doc(240, 300, b, shade('egg', base) + `<clipPath id="eggclip"><path d="${EGG}"/></clipPath>`);
}

// The baby peeking out of its broken shell.
function peek(e, head, headDefs) {
  const b = `<ellipse cx="130" cy="182" rx="112" ry="24" fill="${dark(e.base, 0.45)}"/>`
    + head
    + `<path d="${SHELL}" fill="url(#egg)"/><g clip-path="url(#shellclip)">${e.decor.replace(/(cx|x)="(\d+)/g, (m, a, v) => `${a}="${+v + 10}`)}</g>`
    + `<path d="${SHELL}" fill="none" ${S(6)}/>`;
  return doc(260, 300, b, shade('egg', e.base) + headDefs + `<clipPath id="shellclip"><path d="${SHELL}"/></clipPath>`);
}

// ---------- Dino (male) ----------

function dinoPalette(L) {
  if (L <= 8) return { base: '#7ccf62', belly: '#f3f0b8', mark: '#4c9a43' };
  if (L <= 11) return { base: '#56b88f', belly: '#eef3c2', mark: '#2d7a5b' };
  if (L <= 13) return { base: '#4f8fd8', belly: '#dcecff', mark: '#ffd23f' };
  if (L === 14) return { base: '#5a5368', belly: '#f6b86c', mark: '#ff7b1c' };
  if (L === 15) return { base: '#7b55c7', belly: '#efe1ff', mark: '#4b2f8a' };
  return { base: '#d6a63a', belly: '#fff3c4', mark: '#9a6a16' };
}

// Head facing left, centred on 0,0.
function dinoHead(p, o = {}) {
  let s = '';
  if (o.horns) {
    s += `<path d="M-50 -36 L-44 -70 L-30 -42 Z" fill="#fff7e0" ${S(4)}/>`
      + `<path d="M16 -42 L34 -76 L42 -36 Z" fill="#fff7e0" ${S(4)}/>`;
  }
  if (o.crest) {
    s += `<path d="M48 -26 Q50 -60 26 -66 Q30 -50 16 -46 Q14 -64 -8 -62 Q0 -50 -10 -44 Z" fill="${o.crestColor || p.mark}" ${S(4)}/>`;
  }
  const outline = 'M54 -20 Q32 -54 -16 -48 Q-56 -44 -68 -18 Q-76 2 -68 18 Q-56 32 -30 34 L28 38 Q58 34 62 6 Z';
  s += `<path d="${outline}" fill="url(#body)" ${S(5)}/>`
    + `<path d="M-68 14 Q-56 32 -30 34 L28 38 Q50 36 58 22 Q10 24 -68 14 Z" fill="${p.belly}"/>`
    + `<path d="${outline}" fill="none" ${S(5)}/>`;
  if (o.teeth) {
    for (let x = -58; x <= 14; x += 12) s += `<path d="M${x} ${13 + (x + 58) * 0.06} l5 9 l5 -8 Z" fill="#fff" ${S(2)}/>`;
  }
  s += `<path d="M-68 12 Q-20 22 40 18" fill="none" ${S(4)}/>`
    + `<circle cx="-58" cy="-16" r="3.5" fill="${OL}"/>`
    + `<ellipse cx="26" cy="8" rx="12" ry="7" fill="#ff8fa3" opacity="${o.cute ? 0.5 : 0.25}"/>`
    + eye(6, -18, o.cute ? 15 : 12, { brow: o.brow, closed: o.closed });
  if (o.crown) s += crown(10, -48, 0.9);
  return s;
}

function dinoAdult(L) {
  const p = dinoPalette(L);
  const t = (L - 4) / 12;
  const W = 420, H = 320;
  const k = 1.18 - t * 0.28; // babies have big heads
  const head = { x: 104 + t * 6, y: 94 - t * 8 };
  let b = '';
  let defs = shade('body', p.base);

  if (L === 16) { defs += glow('aura', '#ffe27a'); b += `<ellipse cx="220" cy="170" rx="210" ry="160" fill="url(#aura)"/>`; }

  // Tail (curls up more as it grows)
  const tipY = 150 - t * 70;
  b += `<path d="M262 140 Q350 ${126 - t * 20} 412 ${tipY} Q360 ${176 - t * 20} 282 208 Z" fill="url(#body)" ${S(5)}/>`;

  // Back spikes / plates: three along the back, three along the tail
  if (L >= 7) {
    const plates = L >= 10;
    const size = plates ? 30 + t * 12 : 16 + t * 10;
    const fill = plates ? (L === 14 ? '#ff9a3c' : light(p.mark, 0.25)) : p.mark;
    const rx = 92 + t * 6;
    const q = (s, a, c, d) => (1 - s) ** 2 * a + 2 * (1 - s) * s * c + s * s * d;
    const spots = [170, 205, 240].map((x) => [x, 170 - 66 * Math.sqrt(1 - ((x - 222) / rx) ** 2) + 4])
      .concat([0.3, 0.55, 0.8].map((s) => [q(s, 262, 350, 412), q(s, 140, 126 - t * 20, tipY) + 3]));
    spots.forEach(([x, y], i) => {
      const sz = size * (1 - i * 0.11);
      b += plates
        ? `<path d="M${r1(x - sz * 0.55)} ${r1(y + 6)} Q${r1(x - sz * 0.4)} ${r1(y - sz)} ${r1(x)} ${r1(y - sz * 1.05)} Q${r1(x + sz * 0.5)} ${r1(y - sz * 0.6)} ${r1(x + sz * 0.55)} ${r1(y + 6)} Z" fill="${fill}" ${S(4)}/>`
        : `<path d="M${r1(x - sz * 0.5)} ${r1(y + 6)} L${r1(x)} ${r1(y - sz)} L${r1(x + sz * 0.5)} ${r1(y + 6)} Z" fill="${fill}" ${S(4)}/>`;
    });
  }

  // Far leg
  const farC = dark(p.base, 0.2);
  b += `<ellipse cx="266" cy="206" rx="30" ry="40" fill="${farC}" ${S(5)}/>`
    + `<rect x="254" y="222" width="26" height="74" rx="12" fill="${farC}" ${S(5)}/>`
    + `<ellipse cx="256" cy="298" rx="30" ry="12" fill="${farC}" ${S(5)}/>`;

  // Body
  b += `<ellipse cx="222" cy="170" rx="${92 + t * 6}" ry="66" fill="url(#body)" ${S(5)}/>`
    + `<clipPath id="bodyclip"><ellipse cx="222" cy="170" rx="${92 + t * 6}" ry="66"/></clipPath>`
    + `<g clip-path="url(#bodyclip)"><ellipse cx="196" cy="202" rx="70" ry="46" fill="${p.belly}"/>`;
  // Markings
  if (L >= 5 && L !== 12 && L !== 13 && L !== 14) {
    for (let i = 0; i < 4; i++) b += `<path d="M${210 + i * 24} 108 q-6 22 4 40" fill="none" stroke="${p.mark}" stroke-width="9" stroke-linecap="round"/>`;
  }
  if (L === 12 || L === 13) {
    b += `<path d="M238 118 l-14 26 h14 l-12 28 l30 -36 h-14 l12 -18 Z" fill="${p.mark}" ${S(3)}/>`;
  }
  if (L === 13 || L >= 15) {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      b += `<ellipse cx="${232 + i * 26 + j * 12}" cy="${124 + j * 22}" rx="11" ry="8" fill="${light(p.base, 0.2)}" ${S(3)}/>`;
    }
  }
  if (L === 14) {
    b += `<path d="M180 130 l18 16 l-6 18 l20 14 M232 118 l-10 24 l16 12 l-4 22 M266 132 l-14 18 l10 20" fill="none" stroke="${p.mark}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  b += `</g><ellipse cx="222" cy="170" rx="${92 + t * 6}" ry="66" fill="none" ${S(5)}/>`;

  // Near leg
  b += `<ellipse cx="214" cy="212" rx="36" ry="44" fill="url(#body)" ${S(5)}/>`
    + `<rect x="198" y="230" width="30" height="66" rx="13" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="202" cy="298" rx="34" ry="12" fill="url(#body)" ${S(5)}/>`
    + `<path d="M172 302 l-6 -6 M182 304 l-6 -6" ${S(3)}/>`;

  // Little arm
  b += `<ellipse cx="146" cy="196" rx="11" ry="24" transform="rotate(28 146 196)" fill="url(#body)" ${S(4)}/>`
    + `<path d="M134 216 l-6 4 M140 220 l-4 6" ${S(3)}/>`;

  // Neck + head
  b += `<ellipse cx="${head.x + 46}" cy="${head.y + 52}" rx="44" ry="52" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="${head.x + 30}" cy="${head.y + 70}" rx="26" ry="30" fill="${p.belly}"/>`;
  b += at(head.x, head.y, k, dinoHead(p, {
    cute: L <= 6, teeth: L >= 9, crest: L >= 8, horns: L >= 11, brow: L >= 9, crown: L >= 15,
    crestColor: L === 14 ? '#ff9a3c' : undefined,
  }));
  if (L === 16) b += sparkle(60, 40, 14) + sparkle(370, 60, 12) + sparkle(390, 250, 10) + sparkle(36, 230, 10);

  const mouth = L >= 12 ? [[(head.x - 68 * k) / W, (head.y + 12 * k) / H, -6, 0.8]] : undefined;
  return { svg: doc(W, H, b, defs), legs: { band: (H - 234) / H, split: 240 / W }, mouths: mouth };
}

function dino() {
  const p = dinoPalette(4);
  const e = {
    base: '#c3eaa6',
    decor: `<ellipse cx="150" cy="80" rx="22" ry="16" fill="#79b85f"/><ellipse cx="72" cy="180" rx="18" ry="24" fill="#79b85f"/><ellipse cx="168" cy="220" rx="26" ry="18" fill="#79b85f"/><ellipse cx="110" cy="262" rx="14" ry="10" fill="#79b85f"/><ellipse cx="190" cy="150" rx="10" ry="12" fill="#79b85f"/>`,
  };
  const defs = shade('body', p.base);
  const baby = doc(340, 240,
    `<path d="M240 190 Q310 196 322 150 Q330 196 262 214 Z" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="190" cy="180" rx="100" ry="50" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="170" cy="200" rx="64" ry="26" fill="${p.belly}"/>`
    + `<ellipse cx="150" cy="222" rx="22" ry="11" fill="url(#body)" ${S(4)}/><ellipse cx="236" cy="222" rx="22" ry="11" fill="url(#body)" ${S(4)}/>`
    + at(100, 128, 0.95, dinoHead(p, { cute: true }))
    + `<path d="M58 92 L68 70 L82 84 L96 64 L110 82 L126 70 L134 92 Q96 104 58 92 Z" fill="#f4fbe8" ${S(4)}/>`,
    defs);
  const stages = [
    ['Speckled Egg', 'egg', egg(e, false)],
    ['Cracking Egg', 'egg', egg({ ...e, crackGlow: '#fff2a6' }, true)],
    ['Peekaboo Dino', 'squirm', peek(e, at(130, 128, 1.05, dinoHead(p, { cute: true })), defs)],
    ['Nestling', 'squirm', baby],
  ];
  const names = ['Dino Pup', 'Stripy Raptor', 'Swift Raptor', 'Spiky Raptor', 'Crested Raptor', 'Young Rex', 'Plated Rex',
    'Horned Rex', 'Thunder Rex', 'Armored Rex', 'Volcano Rex', 'King Rex', 'Titan Rex'];
  names.forEach((name, i) => stages.push([name, 'walk', dinoAdult(i + 4)]));
  return { id: 'dino', name: 'Dino', gender: 'male', stages };
}

// ---------- Unicorn (female) ----------

function unicornPalette(L) {
  const rainbow = ['#ff6b8b', '#ffb347', '#ffe066', '#7ed957', '#5ec8f2', '#a78bfa'];
  if (L <= 6) return { base: '#fbf3ff', mane: ['#ff9ed2', '#c59bff'], hoof: '#b9a3d6', muzzle: '#ffd9ec' };
  if (L <= 9) return { base: '#fff7fb', mane: rainbow, hoof: '#c7a9ff', muzzle: '#ffd9ec' };
  if (L <= 12) return { base: '#eef2ff', mane: ['#7aa8ff', '#b9a3ff', '#ffffff'], hoof: '#ffd23f', muzzle: '#e0e7ff' };
  if (L === 13) return { base: '#f3fff9', mane: ['#4fe3b2', '#5ec8f2', '#a78bfa', '#ff7ad9'], hoof: '#ffd23f', muzzle: '#dcfff3' };
  if (L === 14) return { base: '#eaf9ff', mane: ['#7fe7ff', '#b3a6ff', '#ffffff'], hoof: '#9ae6ff', muzzle: '#dff6ff' };
  return { base: '#fff9ec', mane: ['#ffd23f', '#ff9ed2', '#c59bff', '#7aa8ff'], hoof: '#ffd23f', muzzle: '#ffeccf' };
}

// Mane colours as a stripy gradient.
const maneGrad = (id, colors) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${colors.map((c, i) => `<stop offset="${i / Math.max(1, colors.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`;

function unicornHead(p, o = {}) {
  let s = '';
  if (o.horn) {
    const hc = o.hornColor || '#ffd23f';
    s += `<path d="M-6 -26 L-30 -${86 + (o.hornLen || 0)} L12 -30 Z" fill="${hc}" ${S(4)}/>`
      + `<path d="M-10 -40 L8 -42 M-16 -54 L2 -52 M-22 -68 L-6 -64" fill="none" stroke="${dark(hc, 0.3)}" stroke-width="3" stroke-linecap="round"/>`;
  }
  s += `<path d="M8 -24 L22 -64 L36 -20 Z" fill="${p.base}" ${S(4)}/><path d="M16 -28 L22 -50 L29 -26 Z" fill="#ffc2dc"/>`
    + `<ellipse cx="0" cy="0" rx="40" ry="33" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="-34" cy="16" rx="28" ry="22" fill="${p.muzzle}" ${S(5)}/>`
    + `<ellipse cx="-4" cy="0" rx="40" ry="33" fill="url(#body)" opacity="0"/>`
    + `<circle cx="-50" cy="12" r="3.5" fill="${OL}"/>`
    + `<path d="M-48 28 Q-38 34 -26 28" fill="none" ${S(3.5)}/>`
    + `<ellipse cx="-4" cy="16" rx="9" ry="6" fill="#ff8fb8" opacity=".55"/>`
    + eye(6, -6, 13, { closed: o.closed, lashes: true, iris: '#4b2a7a' })
    + `<path d="M26 -30 Q4 -44 -14 -30 Q-4 -22 4 -16 Q18 -34 30 -18 Z" fill="url(#mane)" ${S(4)}/>`;
  if (o.crystal) s += `<path d="M-14 -26 l6 -12 l6 12 l-6 6 Z" fill="#9ae6ff" ${S(2.5)}/>`;
  if (o.tiara) s += at(14, -36, 0.55, `<path d="M-30 0 Q0 -14 30 0 L22 -18 L12 -8 L0 -30 L-12 -8 L-22 -18 Z" fill="#ffd23f" ${S(5)}/><circle cx="0" cy="-12" r="6" fill="#ff7ad9" ${S(3)}/>`);
  if (o.crown) s += crown(18, -34, 0.7, '#ffd23f', '#7aa8ff');
  return s;
}

function wing(x, y, k, fill) {
  return at(x, y, k,
    `<path d="M0 0 C-4 -64 52 -112 128 -114 C108 -92 122 -82 98 -72 C120 -66 108 -50 86 -46 C104 -36 88 -24 66 -24 C66 -8 40 6 0 0 Z" fill="${fill}" ${S(5)}/>`
    + `<path d="M24 -10 Q50 -30 64 -24 M30 -32 Q66 -52 86 -46 M40 -58 Q76 -74 98 -72" fill="none" ${S(3)}/>`);
}

function unicornAdult(L) {
  const p = unicornPalette(L);
  const t = (L - 4) / 12;
  const W = 420, H = 320;
  const k = 1.2 - t * 0.25;
  let defs = shade('body', p.base) + maneGrad('mane', p.mane);
  let b = '';
  if (L >= 15) { defs += glow('aura', L === 16 ? '#c9b6ff' : '#ffe9a8'); b += `<ellipse cx="220" cy="160" rx="210" ry="160" fill="url(#aura)"/>`; }
  if (L >= 12) b += `<path d="M100 300 q10 -20 30 -10 q14 -16 32 -2 q20 -8 26 12 Z M240 300 q10 -20 30 -10 q14 -16 32 -2 q20 -8 26 12 Z" fill="#ffffff" opacity=".85"/>`;

  // Tail
  b += `<path d="M322 138 C392 124 412 196 378 262 C374 226 360 196 332 176 Z" fill="url(#mane)" ${S(5)}/>`
    + `<path d="M340 150 C380 160 388 200 378 232" fill="none" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/>`;

  // Far wing
  if (L >= 10) b += wing(250, 128, 0.75 + t * 0.35, dark(p.base, 0.08));

  // Far legs
  const farC = dark(p.base, 0.12);
  for (const x of [194, 292]) {
    b += `<rect x="${x - 11}" y="186" width="22" height="104" rx="10" fill="${farC}" ${S(5)}/>`
      + `<rect x="${x - 13}" y="284" width="26" height="18" rx="5" fill="${dark(p.hoof, 0.1)}" ${S(4)}/>`;
  }

  // Body + neck
  b += `<ellipse cx="242" cy="164" rx="96" ry="54" fill="url(#body)" ${S(5)}/>`
    + `<path d="M162 154 Q138 104 120 74 L170 54 Q196 108 222 128 Z" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="242" cy="164" rx="94" ry="52" fill="url(#body)"/>`
    + `<path d="M166 152 Q150 120 132 90" fill="none" stroke="${p.base}" stroke-width="22"/>`;
  // Mane down the neck
  b += `<path d="M168 48 Q196 52 196 80 Q214 86 210 108 Q228 116 224 134 Q206 130 196 116 Q182 110 182 92 Q168 84 166 66 Z" fill="url(#mane)" ${S(5)}/>`;

  // Flank mark
  if (L >= 6) {
    const mx = 288, my = 160;
    if (L >= 9 && L <= 12) b += `<path d="M${mx + 6} ${my - 18} A18 18 0 1 0 ${mx + 6} ${my + 18} A13 13 0 1 1 ${mx + 6} ${my - 18} Z" fill="#ffe066" ${S(3)}/>`;
    else if (L >= 14) b += `<path d="M${mx} ${my - 20} l14 20 l-14 20 l-14 -20 Z" fill="#9ae6ff" ${S(3)}/>`;
    else b += star(mx, my, 16, '#ffe066');
  }

  // Near legs
  for (const x of [172, 270]) {
    b += `<rect x="${x - 12}" y="186" width="24" height="106" rx="11" fill="url(#body)" ${S(5)}/>`
      + `<rect x="${x - 14}" y="286" width="28" height="18" rx="5" fill="${p.hoof}" ${S(4)}/>`;
  }
  // Cover leg tops with the body
  b += `<path d="M150 170 Q160 214 210 216 L300 216 Q332 210 336 172 Z" fill="url(#body)"/>`
    + `<path d="M160 196 Q176 216 214 218 L292 218 Q326 212 334 186" fill="none" ${S(5)}/>`;

  // Near wing
  if (L >= 10) b += wing(232, 140, 0.85 + t * 0.4, L === 14 ? '#e6f9ff' : '#ffffff');

  b += at(122, 74, k, unicornHead(p, {
    horn: L >= 7, hornLen: L >= 14 ? 14 : 0, hornColor: L === 14 ? '#9ae6ff' : undefined,
    crystal: L === 14, tiara: L === 15, crown: L === 16,
  }));
  if (L === 8 || L === 13) b += sparkle(56, 40, 10) + sparkle(390, 110, 8);
  if (L >= 15) b += sparkle(50, 36, 14) + sparkle(380, 40, 12) + sparkle(400, 210, 10) + sparkle(30, 200, 10) + star(330, 20, 9, '#fff6b8', 2);

  return { svg: doc(W, H, b, defs), legs: { band: (H - 222) / H, split: 232 / W } };
}

function unicorn() {
  const p = unicornPalette(4);
  const e = {
    base: '#fbeefc',
    decor: [[150, 70, '#ffb5da'], [70, 150, '#c9b6ff'], [170, 200, '#9fe3ff'], [96, 240, '#ffe39a'], [120, 120, '#b9f5d0']]
      .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="14" fill="${c}"/>`).join(''),
  };
  const defs = shade('body', p.base) + maneGrad('mane', p.mane);
  const baby = doc(340, 240,
    `<path d="M270 170 C320 160 332 206 314 226 C306 206 296 196 280 192 Z" fill="url(#mane)" ${S(4)}/>`
    + `<ellipse cx="200" cy="182" rx="94" ry="46" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="150" cy="222" rx="34" ry="12" fill="url(#body)" ${S(4)}/><ellipse cx="240" cy="222" rx="34" ry="12" fill="url(#body)" ${S(4)}/>`
    + `<rect x="112" y="214" width="16" height="16" rx="4" fill="${p.hoof}" ${S(3)}/><rect x="202" y="214" width="16" height="16" rx="4" fill="${p.hoof}" ${S(3)}/>`
    + `<path d="M134 172 Q114 142 96 126 L128 104 Q150 140 174 152 Z" fill="url(#body)" ${S(5)}/>`
    + at(100, 112, 0.95, unicornHead(p, { closed: true }))
    + `<text x="250" y="80" font-family="Arial" font-weight="bold" font-size="30" fill="#a78bfa">z</text><text x="276" y="56" font-family="Arial" font-weight="bold" font-size="22" fill="#a78bfa">z</text>`,
    defs);
  const stages = [
    ['Pearl Egg', 'egg', egg(e, false)],
    ['Glowing Egg', 'egg', egg({ ...e, crackGlow: '#ffe7fb' }, true)],
    ['Peekaboo Foal', 'squirm', peek(e, at(130, 132, 1.05, unicornHead(p)), defs)],
    ['Sleepy Foal', 'squirm', baby],
  ];
  const names = ['Wobbly Foal', 'Pony', 'Star Pony', 'Little Unicorn', 'Rainbow Unicorn', 'Moon Unicorn', 'Winged Unicorn',
    'Sky Dancer', 'Cloud Alicorn', 'Aurora Alicorn', 'Crystal Alicorn', 'Starlight Queen', 'Celestial Empress'];
  names.forEach((name, i) => stages.push([name, 'walk', unicornAdult(i + 4)]));
  return { id: 'unicorn', name: 'Unicorn', gender: 'female', stages };
}

// ---------- Phoenix (female) ----------

function phoenixPalette(L) {
  if (L <= 5) return { base: '#ffcf4a', belly: '#fff3b8', tip: '#ff9a3c', beak: '#ff8a2a' };
  if (L <= 8) return { base: '#ff9a3c', belly: '#ffe39a', tip: '#ff5a2a', beak: '#ffd23f' };
  if (L <= 12) return { base: '#ff6a3a', belly: '#ffd27a', tip: '#ffd23f', beak: '#ffd23f' };
  if (L <= 14) return { base: '#e8384f', belly: '#ffb35c', tip: '#ffd23f', beak: '#ffe066' };
  if (L === 15) return { base: '#c92f6e', belly: '#ffc46b', tip: '#ffd23f', beak: '#ffe066' };
  return { base: '#5b8cff', belly: '#d9f0ff', tip: '#ffe066', beak: '#ffe066' };
}

function phoenixHead(p, o = {}) {
  let s = '';
  const n = o.crest || 0;
  for (let i = 0; i < n; i++) {
    const a = 10 + i * (50 / Math.max(1, n - 1));
    s += feather(4 + i * 6, -34, 34 + i * 4 + (o.crestLen || 0), 11, a, i % 2 ? p.tip : p.base, 4);
  }
  s += `<circle cx="0" cy="0" r="44" fill="url(#body)" ${S(5)}/>`
    + `<path d="M-34 -8 L-74 6 L-34 20 Z" fill="${p.beak}" ${S(4)}/><path d="M-36 6 L-72 6" ${S(3)}/>`
    + `<ellipse cx="2" cy="14" rx="10" ry="6" fill="#ff7a8f" opacity=".45"/>`
    + eye(-6, -10, 13, { closed: o.closed, lashes: true, brow: o.brow });
  if (o.crown) s += crown(14, -38, 0.7, '#ffe066', '#5b8cff');
  return s;
}

function phoenixChick(L) {
  const p = phoenixPalette(L);
  const t = (L - 4) / 4;
  const W = 380, H = 320;
  const defs = shade('body', p.base);
  let b = '';
  // Tail feathers fan out to the right
  const tails = 3 + Math.round(t * 2);
  for (let i = 0; i < tails; i++) b += feather(262, 182, 60 + t * 50, 16, 55 + i * 14, i % 2 ? p.tip : p.base);
  // Far leg
  b += `<path d="M228 240 L224 298 M224 298 l-16 6 M224 298 l-4 8 M224 298 l10 6" fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round"/>`
    + `<path d="M228 240 L224 298 M224 298 l-16 6 M224 298 l-4 8 M224 298 l10 6" fill="none" stroke="${dark(p.beak, 0.15)}" stroke-width="6" stroke-linecap="round"/>`;
  // Body
  b += `<ellipse cx="204" cy="186" rx="82" ry="70" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="178" cy="210" rx="50" ry="40" fill="${p.belly}"/>`
    + `<path d="M178 172 Q246 150 282 210 Q240 222 206 208 Z" fill="${dark(p.base, 0.08)}" ${S(4.5)}/>`
    + (L >= 6 ? `<path d="M222 190 l26 10 M216 202 l24 10" fill="none" stroke="${p.tip}" stroke-width="4" stroke-linecap="round"/>` : '');
  // Near leg
  b += `<path d="M182 244 L180 298 M180 298 l-18 6 M180 298 l-4 8 M180 298 l10 6" fill="none" stroke="${OL}" stroke-width="13" stroke-linecap="round"/>`
    + `<path d="M182 244 L180 298 M180 298 l-18 6 M180 298 l-4 8 M180 298 l10 6" fill="none" stroke="${p.beak}" stroke-width="6" stroke-linecap="round"/>`;
  b += at(132, 112, 1.15 - t * 0.1, phoenixHead(p, { crest: L >= 5 ? 1 + Math.round(t * 3) : 0 }));
  return { svg: doc(W, H, b, defs), legs: { band: (H - 252) / H, split: 204 / W } };
}

function phoenixFlying(L) {
  const p = phoenixPalette(L);
  const t = (L - 9) / 7;
  const W = 420, H = 320;
  let defs = shade('body', p.base);
  let b = '';
  if (L >= 13) { defs += glow('aura', L === 16 ? '#9fd0ff' : '#ffb347'); b += `<ellipse cx="220" cy="160" rx="210" ry="160" fill="url(#aura)"/>`; }

  b += '<g transform="translate(0 18)">';
  // Tail plumes trailing behind
  const plumes = 3 + Math.round(t * 2);
  for (let i = 0; i < plumes; i++) {
    const dy = i * (12 + t * 3);
    const len = 0.75 + t * 0.25;
    const ex = 250 + 150 * len, ey = 196 + dy + 30 * len;
    b += `<path d="M252 182 C300 ${190 + dy * 0.6} ${330} ${206 + dy} ${r1(ex)} ${r1(ey)} C${r1(ex - 40)} ${r1(ey + 10)} 300 ${210 + dy * 0.9} 250 200 Z" fill="${i % 2 ? p.tip : p.base}" ${S(4)}/>`
      + `<circle cx="${r1(ex - 4)}" cy="${r1(ey)}" r="${8 + t * 4}" fill="${i % 2 ? p.base : p.tip}" ${S(3.5)}/>`;
  }
  // Far wing
  const span = 0.9 + t * 0.3;
  for (let i = 0; i < 6; i++) b += feather(232, 140, (120 - i * 12) * span, 20, 12 + i * 13, dark(i % 2 ? p.tip : p.base, 0.15));
  // Body
  b += `<ellipse cx="200" cy="168" rx="76" ry="50" transform="rotate(-14 200 168)" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="178" cy="186" rx="44" ry="26" transform="rotate(-14 178 186)" fill="${p.belly}"/>`
    + `<path d="M192 214 l-8 18 M210 210 l-4 18" ${S(6)}/>`;
  // Near wing
  for (let i = 0; i < 7; i++) b += feather(208, 150, (130 - i * 10) * span, 22, -28 + i * 13, i % 2 ? p.tip : p.base);
  b += `<ellipse cx="208" cy="148" rx="26" ry="20" fill="url(#body)" ${S(4)}/>`;
  // Head
  const k = 1;
  const head = { x: 124, y: 120 };
  b += at(head.x, head.y, k, phoenixHead(p, { crest: 4 + Math.round(t), crestLen: t * 18, brow: L >= 11, crown: L >= 15 }));
  b += '</g>';
  if (L >= 14) b += sparkle(380, 40, 12, '#fff6b8') + sparkle(40, 220, 10, '#fff6b8') + sparkle(330, 300, 9, '#fff6b8');

  const mouths = L >= 11 ? [[(head.x - 74 * k) / W, (head.y + 18 + 6 * k) / H, -4, 0.8]] : undefined;
  return { svg: doc(W, H, b, defs), mouths };
}

function phoenix() {
  const p = phoenixPalette(4);
  const e = {
    base: '#ff9d5c',
    decor: `<path d="M26 230 Q60 190 80 230 Q100 170 124 226 Q148 180 166 230 Q190 196 214 232 L214 300 L26 300 Z" fill="#ff5a3a"/><path d="M26 262 Q60 236 84 262 Q108 226 132 262 Q160 236 214 262 L214 300 L26 300 Z" fill="#ffd23f"/>`,
  };
  const defs = shade('body', p.base);
  const baby = doc(300, 240,
    feather(220, 170, 50, 14, 70, p.tip) + feather(222, 180, 46, 14, 95, p.base)
    + `<circle cx="150" cy="146" r="80" fill="url(#body)" ${S(5)}/>`
    + `<ellipse cx="140" cy="176" rx="48" ry="38" fill="${p.belly}"/>`
    + `<path d="M150 66 q-8 -20 6 -26 q-2 14 10 18 Z" fill="${p.base}" ${S(4)}/>`
    + `<path d="M90 120 L54 132 L90 146 Z" fill="${p.beak}" ${S(4)}/>`
    + eye(112, 110, 14, { lashes: true }) + `<ellipse cx="124" cy="136" rx="10" ry="6" fill="#ff7a8f" opacity=".45"/>`
    + `<path d="M70 196 L92 182 L112 204 L136 180 L160 206 L184 182 L208 204 L230 186 C236 222 200 238 150 238 C100 238 66 226 70 196 Z" fill="url(#egg)" ${S(5)}/>`,
    defs + shade('egg', e.base));
  const stages = [
    ['Ember Egg', 'egg', egg(e, false)],
    ['Smouldering Egg', 'egg', egg({ ...e, crackGlow: '#ffe066' }, true)],
    ['Peekaboo Chick', 'squirm', peek(e, at(130, 132, 1.1, phoenixHead(p)), defs)],
    ['Fluffball', 'squirm', baby],
  ];
  ['Spark Chick', 'Flame Chick', 'Fledgling', 'Crested Fledgling', 'Firebird']
    .forEach((name, i) => stages.push([name, 'walk', phoenixChick(i + 4)]));
  ['Sky Firebird', 'Blaze Phoenix', 'Flame Phoenix', 'Sunfire Phoenix', 'Inferno Phoenix', 'Solar Phoenix', 'Phoenix Queen', 'Eternal Phoenix']
    .forEach((name, i) => stages.push([name, 'fly', phoenixFlying(i + 9)]));
  return { id: 'phoenix', name: 'Phoenix', gender: 'female', stages };
}

// ---------- Write files ----------

const CREATURES = [dino, unicorn, phoenix];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmt = (n) => Math.round(n * 100) / 100;

for (const make of CREATURES) {
  const c = make();
  if (c.stages.length !== DAYS.length) throw new Error(`${c.id} has ${c.stages.length} stages, expected ${DAYS.length}`);
  const dir = new URL(`sprites/${c.id}/`, PUBLIC);
  mkdirSync(dir, { recursive: true });

  const lines = c.stages.map(([name, motion, art], i) => {
    const { svg, legs, mouths } = typeof art === 'string' ? { svg: art } : art;
    const file = `${String(i).padStart(2, '0')}-${slug(name)}.svg`;
    writeFileSync(new URL(file, dir), svg);
    let line = `    { name: '${name}', days: ${DAYS[i]}, file: '${file}', motion: '${motion}'`;
    if (legs && motion === 'walk') line += `, legs: { band: ${fmt(legs.band)}, split: ${fmt(legs.split)} }`;
    if (mouths) line += `,\n      mouths: [${mouths.map((m) => `[${m.map(fmt).join(', ')}]`).join(', ')}]`;
    return `${line} },`;
  });

  const js = `// Generated by tools/draw-creatures.mjs: edit that script and re-run it instead of this file.
export default {
  id: '${c.id}',
  name: '${c.name}',
  gender: '${c.gender}',
  stages: [
${lines.join('\n')}
  ],
};
`;
  writeFileSync(new URL(`creatures/${c.id}.js`, PUBLIC), js);
  console.log(`${c.id}: ${c.stages.length} stages`);
}
