import { json } from '../../lib/util.js';

// Public settings the browser needs to start Google sign-in.
// The publishable key can only sign people in: every table is locked by RLS (see supabase/schema.sql).
export function onRequestGet({ env }) {
  return json({
    supabaseUrl: env.SUPABASE_URL,
    supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY,
  });
}
