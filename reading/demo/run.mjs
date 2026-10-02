// `npm run demo`: try the app on your computer with no accounts.
// Starts a fake Supabase and the real app (Cloudflare's local dev server) wired to it.
import { spawn } from 'node:child_process';
import { startFakeSupabase } from './fake-supabase.mjs';

const FAKE_PORT = 54329;
const APP_PORT = 8788;
const fakeUrl = `http://127.0.0.1:${FAKE_PORT}`;

try {
  await startFakeSupabase({ port: FAKE_PORT, timeZone: 'Asia/Bangkok' });
} catch (err) {
  console.error(`Could not start the fake database on port ${FAKE_PORT}: ${err.message}`);
  process.exit(1);
}

const bindings = {
  DEMO: '1',
  SUPABASE_URL: fakeUrl,
  SUPABASE_PUBLISHABLE_KEY: 'demo-publishable',
  SUPABASE_SECRET_KEY: 'demo-secret',
  ALLOWED_EMAILS: 'demo@example.com',
};

const args = ['wrangler', 'pages', 'dev', '--port', String(APP_PORT), '--ip', '127.0.0.1'];
for (const [k, v] of Object.entries(bindings)) args.push('--binding', `${k}=${v}`);

console.log(`\n  Thor's Reading Dragon (demo) starting...\n  Open http://localhost:${APP_PORT} when it says "Ready".\n  Press Ctrl+C to stop. Demo data is lost when you stop.\n`);

const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
