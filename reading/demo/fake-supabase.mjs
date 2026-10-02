// A tiny in-memory stand-in for Supabase, used only by `npm run demo`.
// It answers the handful of requests the app's API makes. Data is lost when it stops.
import http from 'node:http';

const READER = { id: '00000000-0000-4000-8000-000000000001', name: 'Thor', created_at: '2026-01-01' };
const DEMO_EMAIL = 'demo@example.com';
const SAMPLE_BOOKS = [
  'The Gruffalo', 'Where the Wild Things Are', 'The Very Hungry Caterpillar', 'Room on the Broom',
  "Dragons Love Tacos", 'Zog', 'Goodnight Moon', 'The Day the Crayons Quit', 'Stick Man', 'Oi Frog!',
];

export function startFakeSupabase({ port, timeZone }) {
  let logs = [];
  let offset = 0; // demo days moved forward
  const photos = new Map();
  let seq = 0;

  const realToday = () => new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const demoToday = () => addDays(realToday(), offset);
  const newId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;

    // Demo controls
    if (path === '/demo/offset') return send(res, 200, { offset });
    if (path === '/demo/next-day') { offset++; return send(res, 200, { today: demoToday() }); }
    if (path === '/demo/skip-ahead') {
      for (let i = 1; i <= 5; i++) {
        const date = addDays(demoToday(), i);
        if (!logs.some((l) => l.read_date === date)) {
          logs.push({
            id: newId(), reader_id: READER.id, read_date: date,
            book_title: SAMPLE_BOOKS[logs.length % SAMPLE_BOOKS.length], note: null, photo_path: null, logged_by: DEMO_EMAIL,
          });
        }
      }
      offset += 6;
      return send(res, 200, { today: demoToday() });
    }

    // Photos (the signed links the browser loads)
    if (req.method === 'GET' && path.startsWith('/storage/v1/object/sign/book-photos/')) {
      const photo = photos.get(path.replace('/storage/v1/object/sign/book-photos/', ''));
      if (!photo) return send(res, 404, {});
      res.writeHead(200, { 'Content-Type': photo.type });
      return res.end(photo.data);
    }

    // Auth: the demo login token
    if (path === '/auth/v1/user') {
      return req.headers.authorization === 'Bearer demo'
        ? send(res, 200, { id: 'demo-user', email: DEMO_EMAIL, user_metadata: { full_name: 'Demo Parent' } })
        : send(res, 401, { msg: 'invalid token' });
    }

    if (path === '/rest/v1/readers') return send(res, 200, [READER]);

    if (path === '/rest/v1/reading_logs') {
      const filters = [...url.searchParams].filter(([k]) => !['select', 'order', 'limit'].includes(k));
      const match = (l) => filters.every(([k, v]) => String(l[k]) === v.replace(/^eq\./, ''));
      if (req.method === 'GET') {
        return send(res, 200, logs.filter(match).sort((a, b) => b.read_date.localeCompare(a.read_date)));
      }
      if (req.method === 'POST') {
        const row = JSON.parse(raw);
        if (logs.some((l) => l.reader_id === row.reader_id && l.read_date === row.read_date)) {
          return send(res, 409, { code: '23505', message: 'duplicate key' });
        }
        const saved = { id: newId(), ...row };
        logs.push(saved);
        return send(res, 201, [saved]);
      }
      if (req.method === 'DELETE') {
        const removed = logs.filter(match);
        logs = logs.filter((l) => !match(l));
        return send(res, 200, removed);
      }
    }

    if (path === '/storage/v1/object/sign/book-photos' && req.method === 'POST') {
      const { paths } = JSON.parse(raw);
      return send(res, 200, paths.map((p) => ({ path: p, signedURL: `/object/sign/book-photos/${p}?token=demo`, error: null })));
    }
    if (path === '/storage/v1/object/book-photos' && req.method === 'DELETE') {
      JSON.parse(raw).prefixes.forEach((p) => photos.delete(p));
      return send(res, 200, []);
    }
    if (path.startsWith('/storage/v1/object/book-photos/') && req.method === 'POST') {
      const key = path.replace('/storage/v1/object/book-photos/', '');
      photos.set(key, { data: raw, type: req.headers['content-type'] });
      return send(res, 200, { Key: key });
    }

    send(res, 404, { msg: `fake supabase: no route for ${req.method} ${path}` });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
