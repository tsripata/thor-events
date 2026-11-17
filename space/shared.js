/* Space Crayon — shared engine
   Realistic space rendering (stars, nebula, lit planets) + kid-style crayon spaceships
   + draw / upload input. No build step, no dependencies. */
(function (G) {
'use strict';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
function makeRamp(stops) {
  const s = stops.map(([t, c]) => [t, hex(c)]);
  return t => {
    t = clamp(t, 0, 1);
    for (let i = 1; i < s.length; i++) if (t <= s[i][0]) {
      const a = s[i - 1], b = s[i], k = (t - a[0]) / ((b[0] - a[0]) || 1);
      return mix(a[1], b[1], k);
    }
    return s[s.length - 1][1].slice();
  };
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

/* ---------- random + value noise ---------- */
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function Noise(seed) {
  const r = rng(seed), p = new Uint8Array(256), val = new Float32Array(256);
  for (let i = 0; i < 256; i++) { p[i] = i; val[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const hash = (i, j) => val[perm[(i & 255) + perm[j & 255]]];
  function n(x, y, px) {
    let xi = Math.floor(x); const yi = Math.floor(y), xf = x - xi, yf = y - yi;
    let x1 = xi + 1;
    if (px) { xi = ((xi % px) + px) % px; x1 = ((x1 % px) + px) % px; }
    const a = hash(xi, yi), b = hash(x1, yi), c = hash(xi, yi + 1), d = hash(x1, yi + 1);
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct, px) {
    let s = 0, amp = 0.5, f = 1, nrm = 0;
    for (let o = 0; o < oct; o++) { s += amp * n(x * f, y * f, px ? px * f : 0); nrm += amp; amp *= 0.5; f *= 2; }
    return s / nrm;
  }
  return { n, fbm };
}

/* ---------- glow sprites ---------- */
const glowCache = {};
function glow(color) {
  if (glowCache[color]) return glowCache[color];
  const s = 128, c = canvas(s, s), g = c.getContext('2d'), [r, gg, b] = hex(color);
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  gr.addColorStop(0.18, `rgba(${r},${gg},${b},0.6)`);
  gr.addColorStop(0.45, `rgba(${r},${gg},${b},0.16)`);
  gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  return (glowCache[color] = c);
}
function drawGlow(ctx, color, x, y, r, a) {
  if (r <= 0 || a <= 0) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(glow(color), x - r, y - r, r * 2, r * 2);
}

/* ---------- planet textures (equirectangular) ---------- */
const RAMPS = {
  ocean: makeRamp([[0, '#04112b'], [0.7, '#0b2f63'], [0.93, '#1b5f98'], [1, '#2f86b5']]),
  mars: makeRamp([[0, '#4a1b10'], [0.35, '#8c3a1f'], [0.6, '#b8562b'], [0.8, '#d27a43'], [1, '#e6a46a']]),
  jup: makeRamp([[0, '#6b4430'], [0.25, '#a9714b'], [0.45, '#d9b48a'], [0.6, '#f0e2c8'], [0.78, '#c9925f'], [1, '#8a5a3c']]),
  sat: makeRamp([[0, '#9c8158'], [0.35, '#c9ad7c'], [0.6, '#e6d2a4'], [0.85, '#d4b98a'], [1, '#b39566']]),
  ura: makeRamp([[0, '#8fd0d8'], [0.5, '#a9e2e6'], [1, '#c4eef0']]),
  nep: makeRamp([[0, '#1a3b8f'], [0.45, '#2c5fc4'], [0.75, '#4a80e0'], [1, '#7aa6f0']]),
  ven: makeRamp([[0, '#9b7a45'], [0.4, '#d0aa67'], [0.7, '#e8cf94'], [1, '#f6e7bf']]),
  sun: makeRamp([[0, '#c43c00'], [0.35, '#ff7a10'], [0.65, '#ffb43c'], [0.85, '#ffe08a'], [1, '#fff6d6']])
};
function planetTexture(type, W, H, seed) {
  const N = Noise(seed || 7), d = new Uint8ClampedArray(W * H * 4), P = 8, rr = rng((seed || 7) * 31 + 5);
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - y / H) * Math.PI, al = Math.abs(lat), v = (y / H) * P * 0.5;
    for (let x = 0; x < W; x++) {
      const u = (x / W) * P; let c;
      switch (type) {
        case 'earth': {
          const e = N.fbm(u, v, 6, P);
          if (e < 0.53) c = RAMPS.ocean(e / 0.53);
          else {
            const dry = N.fbm(u * 2, v * 2 + 40, 4, P * 2);
            const desert = smooth(0.5, 0.65, dry) * (1 - smooth(0.9, 1.2, al)) * (0.4 + 0.6 * smooth(0.15, 0.5, al));
            c = mix([38, 78, 34], [176, 148, 98], desert);
            c = mix(c, [110, 92, 70], smooth(0.62, 0.7, e));
            c = mix(c, [230, 230, 230], smooth(0.72, 0.78, e));
          }
          if (al > 1.2 + (N.fbm(u * 2, v * 2 + 90, 3, P * 2) - 0.5) * 0.4) c = [232, 238, 244];
          const cl = N.fbm(u * 2, v * 2 + 77, 5, P * 2);
          c = mix(c, [248, 249, 252], smooth(0.5, 0.7, cl) * 0.92);
          break;
        }
        case 'mars': {
          const e = N.fbm(u, v, 6, P);
          c = RAMPS.mars(e * 1.2 - 0.1);
          if (N.fbm(u * 2, v * 2 + 9, 4, P * 2) > 0.58) c = mix(c, [60, 28, 20], 0.45);
          if (al > 1.33 + (e - 0.5) * 0.3) c = [236, 230, 224];
          break;
        }
        case 'jupiter': case 'saturn': {
          const w = N.fbm(u * 2, v * 2 + 5, 5, P * 2);
          const f = type === 'jupiter' ? 13 : 10, turb = type === 'jupiter' ? 3.2 : 1.4;
          const t = 0.5 + 0.5 * Math.sin(lat * f + (w - 0.5) * turb + Math.sin(lat * 31) * 0.3);
          c = (type === 'jupiter' ? RAMPS.jup : RAMPS.sat)(t * 0.8 + w * 0.2);
          if (type === 'jupiter') {
            const dx = (x / W - 0.62) / 0.055, dy = (lat + 0.38) / 0.1, dd = dx * dx + dy * dy;
            if (dd < 1.6) c = mix(c, [178, 82, 52], smooth(1.6, 0.6, dd) * 0.9);
          }
          break;
        }
        case 'uranus': {
          const t = 0.5 + 0.5 * Math.sin(lat * 6 + (N.fbm(u, v, 4, P) - 0.5) * 1.2);
          c = RAMPS.ura(t);
          break;
        }
        case 'neptune': {
          const w = N.fbm(u * 2, v * 2, 5, P * 2);
          c = RAMPS.nep(0.5 + 0.5 * Math.sin(lat * 9 + (w - 0.5) * 2.5) * 0.7 + (w - 0.5) * 0.4);
          const dx = (x / W - 0.3) / 0.05, dy = (lat + 0.32) / 0.08, dd = dx * dx + dy * dy;
          if (dd < 1.4) c = mix(c, [14, 26, 70], smooth(1.4, 0.5, dd) * 0.8);
          break;
        }
        case 'venus': {
          const w = N.fbm(u, v, 4, P);
          c = RAMPS.ven(N.fbm(u, v * 1.0 + w * 2.2, 5, P));
          break;
        }
        case 'sun': {
          const g = N.fbm(u * 4, v * 4, 4, P * 4), g2 = N.fbm(u, v + 3, 3, P);
          c = RAMPS.sun(g * 0.75 + g2 * 0.35);
          break;
        }
        default: { /* mercury, moon */
          const e = N.fbm(u * 2, v * 2, 5, P * 2), m = N.fbm(u, v + 11, 3, P);
          const base = type === 'moon' ? 120 + e * 90 - smooth(0.55, 0.65, m) * 55 : 100 + e * 80;
          c = type === 'moon' ? [base, base * 0.99, base * 0.97] : [base * 1.02, base * 0.95, base * 0.88];
        }
      }
      const i = (y * W + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
  }
  if (type === 'mercury' || type === 'moon') {
    for (let k = 0; k < 160; k++) {
      const cx = rr() * W, cy = H * (0.15 + rr() * 0.7), cr = Math.pow(rr(), 2.2) * W * 0.03 + 1.5;
      for (let y = Math.floor(cy - cr * 1.2); y <= cy + cr * 1.2; y++) {
        if (y < 0 || y >= H) continue;
        for (let x = Math.floor(cx - cr * 1.2); x <= cx + cr * 1.2; x++) {
          const dist = Math.hypot(x - cx, y - cy) / cr; if (dist > 1.2) continue;
          const xx = ((x % W) + W) % W, i = (y * W + xx) * 4;
          const f = dist < 0.85 ? 0.78 + dist * 0.12 : dist < 1.0 ? 1.18 : 1.06;
          d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
        }
      }
    }
  }
  return { d, W, H };
}

/* ---------- lit, rotating sphere (per-pixel lookup table) ---------- */
class Sphere {
  constructor(tex, r, o = {}) {
    this.tex = tex; this.r = r;
    const res = o.res || 1, rr = r * res, L = norm3(o.light || [-0.6, -0.4, 0.7]);
    const crop = o.crop || { x0: -r, y0: -r, x1: r, y1: r };
    const x0 = Math.floor(Math.max(-r, crop.x0) * res), y0 = Math.floor(Math.max(-r, crop.y0) * res);
    const x1 = Math.ceil(Math.min(r, crop.x1) * res), y1 = Math.ceil(Math.min(r, crop.y1) * res);
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    this.ox = x0 / res; this.oy = y0 / res; this.cw = w / res; this.ch = h / res;
    this.cv = canvas(w, h); this.ctx = this.cv.getContext('2d'); this.img = this.ctx.createImageData(w, h);
    const ct = Math.cos(o.tilt || 0), st = Math.sin(o.tilt || 0), cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0), TW = tex.W, TH = tex.H;
    const amb = o.ambient == null ? 0.025 : o.ambient, emis = !!o.emissive;
    const cap = w * h, pix = new Int32Array(cap), ub = new Float32Array(cap), vr = new Int32Array(cap), vf = new Float32Array(cap), sh = new Float32Array(cap), al = new Uint8Array(cap);
    let n = 0;
    for (let py = 0; py < h; py++) {
      const y = (y0 + py + 0.5) / rr;
      for (let px = 0; px < w; px++) {
        const x = (x0 + px + 0.5) / rr, d2 = x * x + y * y, dist = Math.sqrt(d2);
        if (dist > 1 + 1 / rr) continue;
        const a = clamp((1 - dist) * rr + 0.5, 0, 1), z = Math.sqrt(Math.max(0, 1 - d2));
        const yp = y * cp - z * sp, zp = y * sp + z * cp;
        const xt = x * ct - yp * st, yt = x * st + yp * ct;
        const lat = Math.asin(clamp(-yt, -1, 1)), lon = Math.atan2(xt, zp);
        let s;
        if (emis) s = 0.6 + 0.45 * Math.pow(z, 0.5);
        else {
          const lam = x * L[0] + y * L[1] + z * L[2];
          s = amb + (1 - amb) * smooth(-0.12, 0.75, lam) * (0.8 + 0.2 * z);
        }
        pix[n] = (py * w + px) * 4; ub[n] = (lon / TAU + 0.5) * TW;
        const vv = clamp((0.5 - lat / Math.PI) * TH - 0.5, 0, TH - 1.001);
        vr[n] = clamp(Math.floor((0.5 - lat / Math.PI) * TH), 0, TH - 1) * TW; vf[n] = vv;
        sh[n] = s; al[n] = a * 255; n++;
      }
    }
    this.n = n; this.pix = pix; this.ub = ub; this.vr = vr; this.vf = vf; this.sh = sh; this.al = al; this.bilinear = !!o.bilinear;
  }
  render(rot) {
    if (this.bilinear) return this.renderBilinear(rot);
    const d = this.img.data, t = this.tex.d, TW = this.tex.W, n = this.n, ub = this.ub, vr = this.vr, sh = this.sh, pix = this.pix, al = this.al;
    for (let i = 0; i < n; i++) {
      let u = (ub[i] + rot) % TW; if (u < 0) u += TW;
      const ti = (vr[i] + (u | 0)) * 4, p = pix[i], s = sh[i];
      d[p] = t[ti] * s; d[p + 1] = t[ti + 1] * s; d[p + 2] = t[ti + 2] * s; d[p + 3] = al[i];
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
  renderBilinear(rot) {
    const d = this.img.data, t = this.tex.d, TW = this.tex.W, n = this.n, ub = this.ub, vf = this.vf, sh = this.sh, pix = this.pix, al = this.al;
    for (let i = 0; i < n; i++) {
      let u = (ub[i] + rot - 0.5) % TW; if (u < 0) u += TW;
      const u0 = u | 0, fu = u - u0, u1 = u0 + 1 === TW ? 0 : u0 + 1, v = vf[i], v0 = v | 0, fv = v - v0;
      const r0 = v0 * TW, r1 = (v0 + 1) * TW, a = (r0 + u0) * 4, b = (r0 + u1) * 4, c = (r1 + u0) * 4, e = (r1 + u1) * 4;
      const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv, p = pix[i], s = sh[i];
      d[p] = (t[a] * w00 + t[b] * w10 + t[c] * w01 + t[e] * w11) * s;
      d[p + 1] = (t[a + 1] * w00 + t[b + 1] * w10 + t[c + 1] * w01 + t[e + 1] * w11) * s;
      d[p + 2] = (t[a + 2] * w00 + t[b + 2] * w10 + t[c + 2] * w01 + t[e + 2] * w11) * s;
      d[p + 3] = al[i];
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
  draw(ctx, cx, cy, scale = 1) {
    ctx.drawImage(this.cv, cx + this.ox * scale, cy + this.oy * scale, this.cw * scale, this.ch * scale);
  }
}

/* ---------- space backdrop: nebula + star field ---------- */
function makeSpaceBackground(W, H, seed, o = {}) {
  const res = o.res || 1, c = canvas(W * res, H * res), g = c.getContext('2d');
  g.scale(res, res);
  g.fillStyle = '#010208'; g.fillRect(0, 0, W, H);
  const s = 4, w = Math.ceil(W / s), h = Math.ceil(H / s), nc = canvas(w, h), nx = nc.getContext('2d'), im = nx.createImageData(w, h);
  const N = Noise(seed), c1 = hex(o.nebula ? o.nebula[0] : '#3b1a6b'), c2 = hex(o.nebula ? o.nebula[1] : '#0d4c78'), c3 = hex(o.nebula ? o.nebula[2] || '#a33a3a' : '#a33a3a');
  const inten = o.intensity || 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = (x / w) * 4, Y = (y / w) * 4;
    const q = N.fbm(X, Y, 4), r2 = N.fbm(X + q * 2.6 + 3, Y + q * 2.6 + 7, 5);
    let dens = smooth(0.42, 0.82, r2) * (0.35 + 0.65 * smooth(0.3, 0.72, N.fbm(X * 0.5 + 20, Y * 0.5, 3)));
    dens *= 1 - 0.85 * smooth(0.55, 0.72, N.fbm(X * 2.2 + 50, Y * 2.2, 4));
    let col = mix(c1, c2, smooth(0.32, 0.68, q));
    col = mix(col, c3, smooth(0.62, 0.8, r2) * 0.5);
    const k = dens * 0.85 * inten, i = (y * w + x) * 4;
    im.data[i] = col[0] * k; im.data[i + 1] = col[1] * k; im.data[i + 2] = col[2] * k; im.data[i + 3] = 255;
  }
  nx.putImageData(im, 0, 0);
  g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(nc, 0, 0, W, H);
  const r = rng(seed + 5), temps = [[255, 214, 180], [255, 244, 232], [214, 226, 255], [176, 196, 255]];
  const count = Math.round((W * H) / 700);
  for (let i = 0; i < count; i++) {
    const m = Math.pow(r(), 3.2), col = temps[(r() * temps.length) | 0];
    g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.2 + m * 0.8})`;
    const sz = 0.5 + m * 1.5; g.fillRect(r() * W, r() * H, sz, sz);
  }
  for (let i = 0; i < Math.round((W * H) / 90000) + 8; i++) {
    const x = r() * W, y = r() * H, sz = 6 + r() * 14;
    drawGlow(g, r() < 0.5 ? '#cfe0ff' : '#fff1dc', x, y, sz, 0.8);
    g.globalAlpha = 0.35; g.strokeStyle = '#e8f0ff'; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(x - sz * 1.6, y); g.lineTo(x + sz * 1.6, y); g.moveTo(x, y - sz * 1.6); g.lineTo(x, y + sz * 1.6); g.stroke();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  return c;
}
function makeTwinklers(W, H, n, seed) {
  const r = rng(seed || 3), a = [];
  for (let i = 0; i < n; i++) a.push({ x: r() * W, y: r() * H, s: 1 + r() * 2.2, p: r() * TAU, f: 0.6 + r() * 2, c: r() < 0.6 ? '#ffffff' : '#bcd2ff' });
  return a;
}
function drawTwinklers(ctx, a, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of a) drawGlow(ctx, s.c, s.x, s.y, s.s * 2.2, 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.f + s.p)));
  ctx.restore();
}

/* ---------- particles ---------- */
class Particles {
  constructor(max = 3000) { this.a = []; this.max = max; }
  add(p) { if (this.a.length < this.max) { p.max = p.life; this.a.push(p); } }
  update(dt) {
    const a = this.a;
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i]; p.life -= dt;
      if (p.life <= 0) { a[i] = a[a.length - 1]; a.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      if (p.g) p.vy += p.g * dt;
    }
  }
  draw(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of this.a) {
      const t = p.life / p.max, r = p.size * (p.grow ? 1 + (1 - t) * p.grow : 1);
      drawGlow(ctx, p.color, p.x, p.y, r, Math.min(1, t * 1.6) * (p.alpha == null ? 1 : p.alpha));
    }
    ctx.restore();
  }
}

/* ---------- kid-style crayon spaceships ---------- */
const KID_COLORS = ['#ff3b3b', '#ff8c1a', '#ffd21a', '#38c24a', '#1a8cff', '#9b4dff', '#ff4da6', '#00bfc4'];
function cropAlpha(src, thr = 24, pad = 6) {
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > thr) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0 || (x1 - x0) < 8 || (y1 - y0) < 8) return null;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const c = canvas(x1 - x0 + 1, y1 - y0 + 1);
  c.getContext('2d').drawImage(src, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}
function kidShip(seed) {
  const r = rng(seed * 7919 + 13), W = 330, H = 210, c = canvas(W, H), g = c.getContext('2d');
  const pick = a => a[(r() * a.length) | 0];
  const body = pick(KID_COLORS); let acc = pick(KID_COLORS); while (acc === body) acc = pick(KID_COLORS);
  let acc2 = pick(KID_COLORS); while (acc2 === body) acc2 = pick(KID_COLORS);
  const wob = (pts, a = 3) => pts.map(([x, y]) => [x + (r() - 0.5) * a, y + (r() - 0.5) * a]);
  const path = pts => {
    g.beginPath(); const n = pts.length, p0 = pts[n - 1], p1 = pts[0];
    g.moveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    g.closePath();
  };
  const ell = (cx, cy, rx, ry, n = 26, a0 = 0, a1 = TAU) => { const p = []; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * (a1 - a0); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
  const mirror = pts => pts.map(([x, y]) => [x, H - y]).reverse();
  function fill(pts, color, clipPts) {
    pts = wob(pts, 4);
    let bx = 1e9, by = 1e9, ex = -1e9, ey = -1e9;
    for (const [x, y] of pts) { bx = Math.min(bx, x); by = Math.min(by, y); ex = Math.max(ex, x); ey = Math.max(ey, y); }
    const bw = ex - bx, bh = ey - by, cx = bx + bw / 2, cy = by + bh / 2, diag = Math.hypot(bw, bh) + 10;
    g.save();
    if (clipPts) { path(clipPts); g.clip(); }
    path(pts); g.clip();
    g.globalAlpha = 0.25; g.fillStyle = color; g.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    g.strokeStyle = color; g.lineCap = 'round';
    for (const [ang, gap, alpha] of [[-0.95 + (r() - 0.5) * 0.4, 2.8, 0.8], [0.5 + (r() - 0.5) * 0.4, 5.5, 0.35]]) {
      const ca = Math.cos(ang), sa = Math.sin(ang); g.globalAlpha = alpha;
      for (let k = -diag / 2; k < diag / 2; k += gap + r() * 1.6) {
        if (r() < 0.06) continue;
        g.lineWidth = 2 + r() * 2.4; g.beginPath();
        for (let s = 0; s <= 6; s++) {
          const t = (s / 6 - 0.5) * diag, x = cx + ca * t - sa * k + (r() - 0.5) * 1.6, y = cy + sa * t + ca * k + (r() - 0.5) * 1.6;
          s ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
    }
    g.restore();
  }
  function line(pts, w = 3.4, closed = true) {
    g.save(); g.strokeStyle = '#2a211c'; g.lineJoin = 'round'; g.lineCap = 'round';
    for (let p = 0; p < 2; p++) {
      g.globalAlpha = p ? 0.5 : 0.88; g.lineWidth = w - p * 1.2;
      const q = wob(pts, 2.6);
      if (closed) path(q); else { g.beginPath(); q.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); }
      g.stroke();
    }
    g.restore();
  }
  const shape = (pts, color, clip) => { fill(pts, color, clip); line(pts); };
  const star = (cx, cy, rad) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, rd = i % 2 ? rad * 0.45 : rad; p.push([cx + Math.cos(a) * rd, cy + Math.sin(a) * rd]); } shape(p, '#ffd21a'); };
  const flame = (x, y, s) => {
    shape([[x, y - 20 * s], [x - 36 * s, y - 32 * s], [x - 22 * s, y - 12 * s], [x - 52 * s, y], [x - 22 * s, y + 12 * s], [x - 36 * s, y + 32 * s], [x, y + 20 * s]], '#ff8c1a');
    fill([[x, y - 10 * s], [x - 24 * s, y - 8 * s], [x - 36 * s, y], [x - 24 * s, y + 8 * s], [x, y + 10 * s]], '#ffd21a');
  };
  const face = (cx, cy, s) => {
    g.save(); g.fillStyle = '#2a211c';
    g.beginPath(); g.arc(cx - 6 * s, cy - 3 * s, 2.6 * s, 0, TAU); g.arc(cx + 6 * s, cy - 3 * s, 2.6 * s, 0, TAU); g.fill();
    g.restore(); line([[cx - 7 * s, cy + 4 * s], [cx, cy + 8 * s], [cx + 7 * s, cy + 4 * s]], 2.6, false);
  };
  const type = (r() * 3) | 0, win = '#8fdcff';
  if (type === 0) {
    const bodyP = [[72, 64], [160, 58], [228, 66], [270, 86], [294, 105], [270, 124], [228, 144], [160, 152], [72, 146], [62, 105]];
    flame(66, 105, 1);
    shape([[80, 68], [48, 18], [94, 24], [138, 62]], acc);
    shape(mirror([[80, 68], [48, 18], [94, 24], [138, 62]]), acc);
    shape(bodyP, body);
    fill([[116, 52], [140, 52], [140, 158], [116, 158]], acc2, bodyP);
    fill([[236, 60], [270, 86], [296, 105], [270, 124], [236, 150], [250, 105]], acc, bodyP);
    line(bodyP);
    shape(ell(196, 103, 20, 20), win);
    if (r() < 0.45) face(196, 103, 1);
    if (r() < 0.6) star(92, 105, 11);
  } else if (type === 1) {
    shape([[95, 140], [78, 182], [70, 182]].concat([[90, 182], [104, 142]]), acc, null);
    shape([[225, 142], [242, 182], [250, 182], [230, 182], [216, 142]], acc, null);
    const dome = ell(165, 104, 56, 52, 18, Math.PI, TAU).concat([[221, 108], [109, 108]]);
    shape(dome, win);
    if (r() < 0.6) {
      shape(ell(165, 86, 18, 20), '#38c24a');
      g.fillStyle = '#2a211c'; g.beginPath(); g.arc(159, 84, 3, 0, TAU); g.arc(171, 84, 3, 0, TAU); g.fill();
    }
    shape(ell(165, 120, 145, 34, 30), body);
    fill(ell(165, 128, 118, 13, 24), acc, ell(165, 120, 145, 34, 30));
    for (let i = 0; i < 5; i++) shape(ell(75 + i * 45, 120, 10, 10, 12), i % 2 ? '#ffd21a' : acc2);
  } else {
    flame(50, 105, 0.75);
    shape([[118, 90], [192, 90], [112, 22], [92, 30]], acc);
    shape([[52, 94], [86, 94], [52, 50], [38, 54]], acc2);
    const fus = [[52, 90], [200, 84], [262, 92], [306, 106], [262, 120], [200, 128], [52, 122], [42, 106]];
    shape(fus, body);
    shape(mirror([[118, 90], [192, 90], [112, 22], [92, 30]]), acc);
    shape(ell(246, 97, 28, 12), win);
    fill([[150, 82], [166, 82], [166, 130], [150, 130]], acc2, fus);
    line(fus);
    if (r() < 0.6) star(128, 64, 10);
    if (r() < 0.5) star(128, 150, 10);
  }
  g.save(); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { g.globalAlpha = 0.3 + r() * 0.5; g.fillRect(r() * W, r() * H, 1.4, 1.4); }
  g.restore();
  return cropAlpha(c, 10, 4);
}

/* Turn a photo/scan of a drawing on paper into a transparent sprite. */
function extractDrawing(src) {
  const sw = src.naturalWidth || src.videoWidth || src.width, sh = src.naturalHeight || src.videoHeight || src.height;
  const s = Math.min(1, 720 / Math.max(sw, sh)), w = Math.round(sw * s), h = Math.round(sh * s);
  const c = canvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0, w, h);
  const im = g.getImageData(0, 0, w, h), d = im.data, lums = [];
  const lumAt = i => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  for (let x = 0; x < w; x += 3) { lums.push(lumAt(x * 4), lumAt(((h - 1) * w + x) * 4)); }
  for (let y = 0; y < h; y += 3) { lums.push(lumAt(y * w * 4), lumAt((y * w + w - 1) * 4)); }
  lums.sort((a, b) => a - b);
  const paper = Math.max(150, lums[(lums.length * 0.6) | 0]);
  for (let i = 0; i < d.length; i += 4) {
    const lum = lumAt(i), ch = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    const ink = Math.max((paper - lum - 22) / 50, (ch - 30) / 60);
    d[i + 3] = ink < 0.22 ? 0 : clamp(ink * 1.1, 0, 1) * 255;
    if (ch > 30) { const k = 1.15; const m = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i] = clamp(m + (d[i] - m) * k, 0, 255); d[i + 1] = clamp(m + (d[i + 1] - m) * k, 0, 255); d[i + 2] = clamp(m + (d[i + 2] - m) * k, 0, 255); }
  }
  g.putImageData(im, 0, 0);
  return cropAlpha(c, 60, 4);
}

/* ---------- animated ship ---------- */
let SHIP_ID = 1;
const LASERS = ['#5ef0ff', '#ff5ec8', '#9dff5e', '#ffe25e', '#ff9a4a', '#b48cff'];
class Ship {
  constructor(img, o = {}) {
    this.img = img; this.id = SHIP_ID++;
    this.setHeight(o.height || 90);
    this.x = o.x || 0; this.y = o.y || 0; this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.angle = 0; this.face = 1; this.t = Math.random() * 10; this.age = 0; this.pop = 0;
    this.roll = 0; this.rollDur = 1; this.rollTurns = 1; this.scale = 1; this.dim = 0;
    this.laser = LASERS[this.id % LASERS.length];
    this.cool = 1 + Math.random() * 2;
  }
  setHeight(h) {
    const maxW = h * 2.3; let s = h / this.img.height;
    if (this.img.width * s > maxW) s = maxW / this.img.width;
    this.s = s; this.w = this.img.width * s; this.h = this.img.height * s;
  }
  doRoll(dur, turns) { this.roll = dur; this.rollDur = dur; this.rollTurns = turns; }
  get spin() { return this.roll > 0 ? (1 - this.roll / this.rollDur) * TAU * this.rollTurns : 0; }
  update(dt) {
    this.t += dt; this.age += dt; this.pop = Math.min(1, this.pop + dt * 1.5);
    if (this.roll > 0) this.roll = Math.max(0, this.roll - dt);
  }
  aimAt(vx, vy, k = 0.7) {
    const a = this.face > 0 ? Math.atan2(vy, vx) : Math.atan2(-vy, -vx);
    return clamp(a, -k, k);
  }
  point(f) {
    const a = this.angle + this.spin, sc = this.scale * this.popScale(), dx = this.face * this.w * f * sc;
    return [this.x + Math.cos(a) * dx, this.y + Math.sin(a) * dx];
  }
  popScale() { const p = this.pop; if (p >= 1) return 1; const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  draw(ctx) {
    const sc = this.scale * this.popScale(); if (sc <= 0.02) return;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + this.spin);
    ctx.scale(this.face * sc, sc * (1 + 0.035 * Math.sin(this.t * 4.5)));
    const N = 22, iw = this.img.width, ih = this.img.height, w = this.w, h = this.h;
    for (let i = 0; i < N; i++) {
      const u = i / N, amp = 4 * Math.pow(1 - u, 1.4), dy = Math.sin(this.t * 7 - u * 5) * amp;
      ctx.drawImage(this.img, u * iw, 0, iw / N + 0.8, ih, -w / 2 + u * w, -h / 2 + dy, w / N + 0.8, h);
    }
    if (this.dim > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = this.dim; ctx.fillStyle = '#000814'; ctx.fillRect(-w, -h, w * 2, h * 2); }
    ctx.restore();
  }
  exhaust(ps, power = 1) {
    const [tx, ty] = this.point(-0.47), a = this.angle + this.spin, bx = -Math.cos(a) * this.face, by = -Math.sin(a) * this.face;
    const sc = this.h / 90;
    for (let k = 0; k < 2; k++) {
      const sp = (90 + Math.random() * 90) * power;
      ps.add({ x: tx + (Math.random() - 0.5) * 6 * sc, y: ty + (Math.random() - 0.5) * 6 * sc, vx: bx * sp + this.vx * 0.3 + (Math.random() - 0.5) * 30, vy: by * sp + this.vy * 0.3 + (Math.random() - 0.5) * 30,
        life: 0.25 + Math.random() * 0.3, size: (7 + Math.random() * 7) * sc * Math.sqrt(power), color: k ? '#ff7a2a' : '#ffd9a0', grow: -0.5, drag: 2, alpha: 0.8 });
    }
  }
}

/* ---------- draw / upload input UI ---------- */
function setupShipInput(onShip, o = {}) {
  const css = `
  .sc-bar{position:fixed;right:16px;bottom:16px;display:flex;gap:8px;z-index:20;transition:opacity .4s}
  .sc-bar.idle{opacity:0;pointer-events:none}
  .sc-btn{font:600 16px "Fredoka",system-ui,sans-serif;color:#fff;background:rgba(12,16,34,.62);border:1px solid rgba(255,255,255,.22);
    border-radius:999px;padding:10px 16px;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
  .sc-btn:hover{background:rgba(40,52,96,.8)} .sc-btn.big{background:#ff8c1a;border-color:#ffb36b}
  .sc-modal{position:fixed;inset:0;background:rgba(0,0,8,.72);display:none;align-items:center;justify-content:center;z-index:30}
  .sc-modal.open{display:flex}
  .sc-card{background:#fffaf0;border-radius:24px;padding:18px;max-width:94vw;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:"Fredoka",system-ui,sans-serif;color:#33302e}
  .sc-card h3{margin:0 0 4px;font-size:22px;font-weight:600}.sc-card p{margin:0 0 10px;color:#8a7f74;font-size:15px}
  .sc-pad{display:block;background:#fff;border:2px dashed #f3d9b8;border-radius:16px;touch-action:none;cursor:crosshair;width:min(680px,88vw,(100vh - 200px)*1.7);height:auto;aspect-ratio:17/10}
  .sc-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
  .sc-sw{width:34px;height:34px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #ddd;cursor:pointer;padding:0}
  .sc-sw.on{box-shadow:0 0 0 3px #33302e}
  .sc-card .sc-btn{color:#33302e;background:#fff;border:2px solid #f3d9b8;backdrop-filter:none}
  .sc-card .sc-btn.big{background:#ff8c1a;color:#fff;border-color:#ff8c1a}
  .sc-sp{flex:1}
  .sc-toasts{position:fixed;left:50%;top:76px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center;z-index:25;pointer-events:none}
  .sc-toast{font:600 20px "Fredoka",system-ui,sans-serif;color:#fff;background:rgba(10,14,32,.72);border:1px solid rgba(255,255,255,.25);padding:10px 20px;border-radius:999px;
    animation:sc-in .5s cubic-bezier(.2,1.6,.4,1) both, sc-out .6s ease 3.4s forwards;backdrop-filter:blur(6px)}
  @keyframes sc-in{from{transform:scale(.6);opacity:0}} @keyframes sc-out{to{opacity:0;transform:translateY(-10px)}}
  .sc-drop{position:fixed;inset:12px;border:4px dashed #ffd21a;border-radius:28px;display:none;align-items:center;justify-content:center;z-index:28;
    font:600 34px "Fredoka",system-ui,sans-serif;color:#ffd21a;background:rgba(0,0,10,.55)}
  .sc-drop.on{display:flex}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  const toasts = el('div', 'sc-toasts'); document.body.appendChild(toasts);
  function toast(msg) { const t = el('div', 'sc-toast', msg); toasts.appendChild(t); setTimeout(() => t.remove(), 4200); }

  const bar = el('div', 'sc-bar');
  const bDraw = el('button', 'sc-btn big', '✏️ Draw · วาดยาน');
  const bUp = el('button', 'sc-btn', '📷 Upload · อัปโหลด');
  const bRnd = el('button', 'sc-btn', '🎲 Surprise · สุ่ม');
  const bFs = el('button', 'sc-btn', '⛶');
  bFs.title = 'Full screen'; bar.append(bDraw, bUp, bRnd, bFs); document.body.appendChild(bar);
  const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.multiple = true; file.style.display = 'none'; document.body.appendChild(file);

  const params = new URLSearchParams(location.search);
  if (params.get('ui') === '0') bar.style.display = 'none';
  let idleT;
  const wake = () => { bar.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => bar.classList.add('idle'), 7000); };
  ['mousemove', 'pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, wake, { passive: true })); wake();

  const deliver = (img, src) => { if (img) onShip(img, src); else toast('Hmm, no drawing found · ไม่เจอรูปวาด'); };
  function loadFile(f) {
    if (!f || !f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => { deliver(extractDrawing(im), 'upload'); URL.revokeObjectURL(url); };
    im.src = url;
  }
  bUp.onclick = () => file.click();
  file.onchange = () => { [...file.files].forEach(loadFile); file.value = ''; };
  bRnd.onclick = () => onShip(kidShip((Math.random() * 1e9) | 0), 'surprise');
  bFs.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };

  const drop = el('div', 'sc-drop', 'Drop drawings here · วางรูปที่นี่'); document.body.appendChild(drop);
  addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
  addEventListener('dragleave', e => { if (e.target === drop) drop.classList.remove('on'); });
  addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('on'); [...e.dataTransfer.files].forEach(loadFile); });

  /* drawing pad with crayon brush */
  const modal = el('div', 'sc-modal'), card = el('div', 'sc-card');
  card.innerHTML = `<h3>Draw your spaceship 🚀 · วาดยานอวกาศของหนู</h3><p>Point the front to the right → · ให้หัวยานหันไปทางขวา</p>`;
  const pad = el('canvas', 'sc-pad'); pad.width = 850; pad.height = 500;
  const row = el('div', 'sc-row');
  const colors = ['#ff3b3b', '#ff8c1a', '#ffd21a', '#38c24a', '#1a8cff', '#9b4dff', '#ff4da6', '#8b5a2b', '#2a211c'];
  let pen = colors[4], size = 10, last = null, drawing = false;
  colors.forEach((c, i) => { const b = el('button', 'sc-sw' + (i === 4 ? ' on' : '')); b.style.background = c; b.onclick = () => { pen = c; row.querySelectorAll('.sc-sw').forEach(x => x.classList.remove('on')); b.classList.add('on'); }; row.appendChild(b); });
  const bSize = el('button', 'sc-btn', 'Thick · หนา'); bSize.onclick = () => { size = size === 10 ? 20 : size === 20 ? 5 : 10; bSize.textContent = size === 20 ? 'Fat · หนามาก' : size === 5 ? 'Thin · บาง' : 'Thick · หนา'; };
  const bClr = el('button', 'sc-btn', 'Clear · ล้าง'), bCancel = el('button', 'sc-btn', 'Cancel · ยกเลิก'), bGo = el('button', 'sc-btn big', 'Launch! · ปล่อยยาน 🚀');
  row.append(bSize, bClr, el('span', 'sc-sp'), bCancel, bGo);
  card.append(pad, row); modal.appendChild(card); document.body.appendChild(modal);
  const pg = pad.getContext('2d');
  const clearPad = () => { pg.fillStyle = '#fff'; pg.fillRect(0, 0, pad.width, pad.height); };
  clearPad();
  const pos = e => { const b = pad.getBoundingClientRect(); return [(e.clientX - b.left) * pad.width / b.width, (e.clientY - b.top) * pad.height / b.height]; };
  pad.addEventListener('pointerdown', e => { drawing = true; last = pos(e); pad.setPointerCapture(e.pointerId); });
  pad.addEventListener('pointerup', () => drawing = false);
  pad.addEventListener('pointermove', e => {
    if (!drawing) return; const p = pos(e);
    pg.strokeStyle = pen; pg.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const ox = (Math.random() - 0.5) * size * 0.8, oy = (Math.random() - 0.5) * size * 0.8;
      pg.globalAlpha = 0.35 + Math.random() * 0.35; pg.lineWidth = size * (0.35 + Math.random() * 0.4);
      pg.beginPath(); pg.moveTo(last[0] + ox, last[1] + oy); pg.lineTo(p[0] + ox, p[1] + oy); pg.stroke();
    }
    pg.globalAlpha = 1; last = p;
  });
  bDraw.onclick = () => { clearPad(); modal.classList.add('open'); };
  bClr.onclick = clearPad;
  bCancel.onclick = () => modal.classList.remove('open');
  bGo.onclick = () => { const img = extractDrawing(pad); if (!img) { toast('Draw something first · วาดก่อนนะ'); return; } modal.classList.remove('open'); onShip(img, 'draw'); };

  addEventListener('keydown', e => {
    if (modal.classList.contains('open')) return;
    if (e.key === 's' || e.key === 'S') bRnd.onclick();
    if (e.key === 'd' || e.key === 'D') bDraw.onclick();
    if (e.key === 'f' || e.key === 'F') bFs.onclick();
  });

  /* other tabs or a scanner page can send drawings: new BroadcastChannel('space-crayon').postMessage({dataURL}) */
  try {
    const bc = new BroadcastChannel('space-crayon');
    bc.onmessage = ev => { const im = new Image(); im.onload = () => deliver(extractDrawing(im), 'scan'); im.src = ev.data && ev.data.dataURL; };
  } catch (_) {}

  return { toast };
}

G.SpaceCrayon = { TAU, clamp, lerp, smooth, hex, mix, rng, Noise, glow, drawGlow, planetTexture, Sphere, makeSpaceBackground, makeTwinklers, drawTwinklers, Particles, kidShip, extractDrawing, cropAlpha, Ship, setupShipInput, KID_COLORS, canvas };
})(window);
