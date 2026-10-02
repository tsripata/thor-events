import { supabase } from '../../lib/supabase.js';
import { json } from '../../lib/util.js';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'ALLOWED_EMAILS'];

// Runs before every /api/* route: checks the Google login and the family allow-list.
export async function onRequest({ request, env, next, data }) {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) return json({ error: `Server not configured: missing ${missing.join(', ')}` }, 500);

  if (new URL(request.url).pathname === '/api/config') return next();

  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ error: 'Not signed in' }, 401);

  const user = await supabase(env).getUser(token);
  if (!user?.email) return json({ error: 'Session expired, please sign in again' }, 401);

  const allowed = env.ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(user.email.toLowerCase())) {
    return json({ error: 'This Google account is not on the family list', email: user.email }, 403);
  }

  data.user = {
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
  };

  try {
    return await next();
  } catch (err) {
    console.error(err);
    return json({ error: 'Something went wrong on the server' }, 500);
  }
}
