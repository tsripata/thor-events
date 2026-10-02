import { supabase } from '../../../lib/supabase.js';
import { PHOTO_BUCKET, json, currentDate, getReader } from '../../../lib/util.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Undo today's log (e.g. a typo), so it can be logged again. Past days stay locked.
export async function onRequestDelete({ params, env }) {
  if (!UUID.test(params.id)) return json({ error: 'Not found' }, 404);

  const db = supabase(env);
  const reader = await getReader(db);
  const today = await currentDate(env);

  const [log] = await db.select(
    'reading_logs',
    `select=id,read_date,photo_path&id=eq.${params.id}&reader_id=eq.${reader.id}`,
  );
  if (!log) return json({ error: 'Not found' }, 404);
  if (log.read_date !== today) return json({ error: "Only today's log can be removed" }, 403);

  await db.remove('reading_logs', `id=eq.${log.id}`);
  if (log.photo_path) await db.removeObjects(PHOTO_BUCKET, [log.photo_path]).catch(() => {});
  return json({ ok: true });
}
