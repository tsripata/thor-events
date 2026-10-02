import { json } from '../../../lib/util.js';

// Demo-only time travel (npm run demo). Does nothing on the real site, where DEMO is never set.
export async function onRequestPost({ params, env }) {
  if (env.DEMO !== '1' || !['next-day', 'skip-ahead'].includes(params.action)) {
    return json({ error: 'Not found' }, 404);
  }
  const res = await fetch(`${env.SUPABASE_URL}/demo/${params.action}`, { method: 'POST' });
  return json(await res.json());
}
