export const PHOTO_BUCKET = 'book-photos';

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Today's date (YYYY-MM-DD) in the family's timezone, so "one log per day" follows local midnight.
export function todayIn(timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Consecutive reading days ending today (or yesterday, if today isn't logged yet).
export function streakFrom(dates, today) {
  const set = new Set(dates);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function timezone(env) {
  return env.APP_TIMEZONE || 'Asia/Bangkok';
}

// The child whose reading is tracked. One reader for now (see PLAN.md, Phase 4).
export async function getReader(db) {
  const rows = await db.select('readers', 'select=id,name&order=created_at.asc&limit=1');
  if (!rows.length) throw new Error('No reader found. Run supabase/schema.sql first.');
  return rows[0];
}
