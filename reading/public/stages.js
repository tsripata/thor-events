// The dragon's evolution path: `days` = total reading days needed to reach each stage.
export const STAGES = [
  { name: 'Egg', days: 0, file: '00-egg.webp' },
  { name: 'Hatching Egg', days: 1, file: '01-germinating.webp' },
  { name: 'Hatchling', days: 2, file: '02-hatchling.webp' },
  { name: 'Wiggler', days: 3, file: '03-larva.webp' },
  { name: 'Aqua-Liz', days: 5, file: '04-aqua-liz.webp' },
  { name: 'Scale-Mote', days: 7, file: '05-scale-mote.webp' },
  { name: 'Little Croc', days: 9, file: '06-young-croc.webp' },
  { name: 'Canyon Croc', days: 12, file: '07-canyon-croc.webp' },
  { name: 'Armored Croc', days: 15, file: '08-armored-croc.webp' },
  { name: 'Drake', days: 19, file: '09-drake.webp' },
  { name: 'Wyvern', days: 24, file: '10-wyvern.webp' },
  { name: 'Wyvern Lord', days: 30, file: '11-wyvern-lord.webp' },
  { name: 'Twin-Head Drake', days: 37, file: '12-bicephalic.webp' },
  { name: 'Twin-Head Elder', days: 45, file: '13-bicephalic-elder.webp' },
  { name: 'Tri-Head Warden', days: 55, file: '14-tricephalic.webp' },
  { name: 'Five-Head Emperor', days: 70, file: '15-pentacephalic.webp' },
  { name: 'Omega Hydra-Archon', days: 100, file: '16-omega.webp' },
];

// Bump when the sprite images change: they're cached for a year (see _headers).
const SPRITE_VERSION = 2;
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
