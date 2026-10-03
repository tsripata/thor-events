import { supabase } from '../../lib/supabase.js';
import { json, getReader } from '../../lib/util.js';
import { GENDERS, randomCreature } from '../../public/creatures/index.js';

// Pick the reader's creature: they ask for a male or female one and get a random creature of it.
// Picking again swaps the creature; reading days are kept, so the new one starts at the same stage.
export async function onRequestPost({ request, env }) {
  const { gender } = await request.json().catch(() => ({}));
  if (!GENDERS.includes(gender)) return json({ error: `Choose one of: ${GENDERS.join(', ')}` }, 400);

  const db = supabase(env);
  const reader = await getReader(db);
  const creature = randomCreature(gender, reader.creature);
  await db.update('readers', `id=eq.${reader.id}`, { creature: creature.id });
  return json({ creature: creature.id });
}
