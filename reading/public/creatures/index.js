// Every creature a reader can grow. Shared by the app and the API (functions/api/creature.js).
//
// To add a creature: make a module like the ones below and list it in CREATURES.
//   id      unique, also the sprite folder: public/sprites/<id>/
//   name    shown in the app ("Your Dino evolved...")
//   gender  'male' or 'female': the reader asks for one and gets a random creature of it
//   stages  the evolution path, any length. Each stage:
//     name, days   reading days needed to reach it
//     file         sprite in public/sprites/<id>/
//     motion       'egg' wriggles, 'squirm' for babies, 'walk' bobs and steps its legs, 'fly' hovers
//     legs         walkers only: the bottom `band` of the sprite holds the feet; `split` divides front legs from back
//     mouths       optional fire breath: [x, y, angle, size] as fractions of the sprite (sprites face left)
import crocDragon from './croc-dragon.js';
import dino from './dino.js';
import unicorn from './unicorn.js';
import phoenix from './phoenix.js';

export const CREATURES = [crocDragon, dino, unicorn, phoenix];

export const GENDERS = ['male', 'female'];

export const creatureById = (id) => CREATURES.find((c) => c.id === id) || null;

// A random creature of that gender. Avoids `exclude` (the current one) when there's another to pick.
export function randomCreature(gender, exclude = null, random = Math.random) {
  let pool = CREATURES.filter((c) => c.gender === gender);
  if (pool.length > 1) pool = pool.filter((c) => c.id !== exclude);
  return pool[Math.floor(random() * pool.length)] || null;
}

// Bump when sprite images change: they're cached for a year (see _headers).
const SPRITE_VERSION = 4;
export const spriteUrl = (creature, file) => `/sprites/${creature.id}/${file}?v=${SPRITE_VERSION}`;

export function stageFor(creature, totalDays) {
  const { stages } = creature;
  let index = 0;
  stages.forEach((s, i) => { if (totalDays >= s.days) index = i; });
  const stage = stages[index];
  const next = stages[index + 1] || null;
  return {
    index,
    stage,
    next,
    toGo: next ? next.days - totalDays : 0,
    progress: next ? (totalDays - stage.days) / (next.days - stage.days) : 1,
  };
}
