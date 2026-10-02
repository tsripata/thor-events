import { supabase } from '../../../lib/supabase.js';
import { PHOTO_BUCKET, json, todayIn, timezone, getReader } from '../../../lib/util.js';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Log today's book. Only one log per day (also enforced by a unique index in the database).
export async function onRequestPost({ request, env, data }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Expected a form upload' }, 400);
  }

  const title = String(form.get('title') || '').trim();
  const note = String(form.get('note') || '').trim();
  const photo = form.get('photo');

  if (!title) return json({ error: 'Please enter the book title' }, 400);
  if (title.length > 200) return json({ error: 'Book title is too long' }, 400);
  if (note.length > 500) return json({ error: 'Note is too long (500 characters max)' }, 400);

  const hasPhoto = photo && typeof photo === 'object' && photo.size > 0;
  if (hasPhoto) {
    if (!PHOTO_TYPES[photo.type]) return json({ error: 'Photo must be a JPEG, PNG or WebP image' }, 400);
    if (photo.size > MAX_PHOTO_BYTES) return json({ error: 'Photo is too large (8 MB max)' }, 400);
  }

  const db = supabase(env);
  const reader = await getReader(db);
  const today = todayIn(timezone(env));

  const existing = await db.select('reading_logs', `select=id&reader_id=eq.${reader.id}&read_date=eq.${today}`);
  if (existing.length) return json({ error: 'Already read today. Come back tomorrow!' }, 409);

  let photoPath = null;
  if (hasPhoto) {
    photoPath = `${reader.id}/${today}-${crypto.randomUUID()}.${PHOTO_TYPES[photo.type]}`;
    await db.upload(PHOTO_BUCKET, photoPath, await photo.arrayBuffer(), photo.type);
  }

  try {
    const [row] = await db.insert('reading_logs', {
      reader_id: reader.id,
      read_date: today,
      book_title: title,
      note: note || null,
      photo_path: photoPath,
      logged_by: data.user.email,
    });
    return json({ id: row.id, date: row.read_date }, 201);
  } catch (err) {
    if (photoPath) await db.removeObjects(PHOTO_BUCKET, [photoPath]).catch(() => {});
    // Two people logging at the same moment: the unique index rejects the second one.
    if (err.status === 409) return json({ error: 'Already read today. Come back tomorrow!' }, 409);
    throw err;
  }
}
