import fs from 'fs';
const src = fs.readFileSync(process.argv[2], 'utf8');
const window = {}; new Function('window', 'document', src)(window, { createElement: () => ({ getContext: () => ({}) }) });
const S = window.SpaceCrayon;
const keys = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
const W = 2048, H = 1024;
keys.forEach((k, i) => { const t = S.planetTexture(k, W, H, 20 + i * 7); fs.writeFileSync(`tex/${k}.rgba`, Buffer.from(t.d.buffer)); });
const m = S.planetTexture('moon', 1024, 512, 4); fs.writeFileSync('tex/moon.rgba', Buffer.from(m.d.buffer));
// ring radial strip (same formula as makeRing), t=0 inner .. 1 outer
const N = S.Noise(77), R = 1024, d = new Uint8ClampedArray(R * 4);
for (let x = 0; x < R; x++) { const t = x / (R - 1);
  let a = 0.5 + 0.35 * (N.n(t * 60, 0.5) - 0.5) * 2 + 0.15 * Math.sin(t * 90);
  if (t < 0.16) a *= 0.3; if (t > 0.7 && t < 0.75) a *= 0.06; if (t > 0.93) a *= 0.5;
  const c = S.mix([150,128,96],[236,220,186], 0.5 + 0.5 * Math.sin(t * 13));
  d.set([c[0], c[1], c[2], S.clamp(a, 0, 0.9) * 255], x * 4); }
fs.writeFileSync('tex/ring.rgba', Buffer.from(d.buffer));
