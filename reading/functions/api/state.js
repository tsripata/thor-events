import { supabase } from '../../lib/supabase.js';
import { PHOTO_BUCKET, json, currentDate, streakFrom, getReader } from '../../lib/util.js';

const RECENT = 10;

// Everything the home screen needs in one call.
export async function onRequestGet({ env, data }) {
  const db = supabase(env);
  const reader = await getReader(db);
  const today = await currentDate(env);

  const logs = await db.select(
    'reading_logs',
    `select=id,read_date,book_title,note,photo_path,logged_by&reader_id=eq.${reader.id}&order=read_date.desc`,
  );

  const totalDays = logs.length;
  const recent = logs.slice(0, RECENT);
  const urls = await db.signUrls(PHOTO_BUCKET, recent.map((l) => l.photo_path).filter(Boolean));

  return json({
    user: data.user,
    reader: { name: reader.name, creature: reader.creature || null },
    today,
    totalDays,
    streak: streakFrom(logs.map((l) => l.read_date), today),
    readToday: recent[0]?.read_date === today,
    recent: recent.map((l, i) => ({
      id: l.id,
      date: l.read_date,
      day: totalDays - i,
      title: l.book_title,
      note: l.note,
      loggedBy: l.logged_by,
      photoUrl: l.photo_path ? urls[l.photo_path] || null : null,
    })),
  });
}
