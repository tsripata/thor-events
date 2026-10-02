// The dragon's evolution path: `days` = total reading days needed to reach each stage.
// motion: 'egg' wriggles, 'squirm' for grubs, 'walk' bobs and steps its legs.
// legs: the bottom `band` of the sprite holds the feet; `split` divides front legs from back legs.
// mouths: [x, y, angle, size] as fractions of the sprite, for fire breath (sprites face left).
export const STAGES = [
  { name: 'Egg', days: 0, file: '00-egg.webp', motion: 'egg' },
  { name: 'Hatching Egg', days: 1, file: '01-germinating.webp', motion: 'egg' },
  { name: 'Hatchling', days: 2, file: '02-hatchling.webp', motion: 'squirm' },
  { name: 'Wiggler', days: 3, file: '03-larva.webp', motion: 'squirm' },
  { name: 'Aqua-Liz', days: 5, file: '04-aqua-liz.webp', motion: 'walk', legs: { band: 0.28, split: 0.42 } },
  { name: 'Scale-Mote', days: 7, file: '05-scale-mote.webp', motion: 'walk', legs: { band: 0.3, split: 0.5 } },
  { name: 'Little Croc', days: 9, file: '06-young-croc.webp', motion: 'walk', legs: { band: 0.22, split: 0.48 } },
  { name: 'Canyon Croc', days: 12, file: '07-canyon-croc.webp', motion: 'walk', legs: { band: 0.24, split: 0.48 } },
  { name: 'Armored Croc', days: 15, file: '08-armored-croc.webp', motion: 'walk', legs: { band: 0.22, split: 0.48 } },
  { name: 'Drake', days: 19, file: '09-drake.webp', motion: 'walk', legs: { band: 0.2, split: 0.4 },
    mouths: [[0.03, 0.36, -6, 0.8]] },
  { name: 'Wyvern', days: 24, file: '10-wyvern.webp', motion: 'walk', legs: { band: 0.18, split: 0.42 },
    mouths: [[0.24, 0.17, -14, 0.8]] },
  { name: 'Wyvern Lord', days: 30, file: '11-wyvern-lord.webp', motion: 'walk', legs: { band: 0.15, split: 0.45 },
    mouths: [[0.04, 0.2, -8, 0.8], [0.26, 0.17, -12, 0.8]] },
  { name: 'Twin-Head Drake', days: 37, file: '12-bicephalic.webp', motion: 'walk', legs: { band: 0.16, split: 0.4 },
    mouths: [[0.02, 0.17, -6, 0.8], [0.31, 0.17, -10, 0.8]] },
  { name: 'Twin-Head Elder', days: 45, file: '13-bicephalic-elder.webp', motion: 'walk', legs: { band: 0.14, split: 0.4 },
    mouths: [[0.03, 0.3, -6, 0.85], [0.33, 0.24, -12, 0.85]] },
  { name: 'Tri-Head Warden', days: 55, file: '14-tricephalic.webp', motion: 'walk', legs: { band: 0.14, split: 0.42 },
    mouths: [[0.04, 0.18, -4, 0.8], [0.04, 0.4, -10, 0.8], [0.35, 0.22, -12, 0.8]] },
  { name: 'Five-Head Emperor', days: 70, file: '15-pentacephalic.webp', motion: 'walk', legs: { band: 0.14, split: 0.42 },
    mouths: [[0.04, 0.35, -6, 0.8], [0.12, 0.18, -4, 0.8], [0.3, 0.15, -10, 0.8]] },
  { name: 'Omega Hydra-Archon', days: 100, file: '16-omega.webp', motion: 'walk', legs: { band: 0.14, split: 0.45 },
    mouths: [[0.05, 0.3, 0, 1]] },
];

// Bump when the sprite images change: they're cached for a year (see _headers).
const SPRITE_VERSION = 3;
export const spriteUrl = (file) => `/sprites/${file}?v=${SPRITE_VERSION}`;

export function stageFor(totalDays) {
  let index = 0;
  STAGES.forEach((s, i) => { if (totalDays >= s.days) index = i; });
  const stage = STAGES[index];
  const next = STAGES[index + 1] || null;
  return {
    index,
    stage,
    next,
    toGo: next ? next.days - totalDays : 0,
    progress: next ? (totalDays - stage.days) / (next.days - stage.days) : 1,
  };
}
