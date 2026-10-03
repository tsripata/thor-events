// Minimal Supabase client for Cloudflare Functions, using plain fetch (no npm deps).
// Uses the SECRET key, which only exists in Cloudflare's encrypted env vars.

export function supabase(env) {
  const base = env.SUPABASE_URL.replace(/\/+$/, '');
  const key = env.SUPABASE_SECRET_KEY;

  function headers(extra = {}) {
    const h = { apikey: key, ...extra };
    // Legacy service_role keys are JWTs and also go in Authorization.
    // New sb_secret_ keys only need the apikey header.
    if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
    return h;
  }

  async function call(path, init = {}) {
    const res = await fetch(base + path, { ...init, headers: headers(init.headers) });
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Supabase ${res.status} on ${path}: ${body}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const type = res.headers.get('content-type') || '';
    return type.includes('json') ? res.json() : res.text();
  }

  return {
    // Validates a user's login token with Supabase Auth. Returns the user or null.
    async getUser(accessToken) {
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      });
      return res.ok ? res.json() : null;
    },

    select(table, query) {
      return call(`/rest/v1/${table}?${query}`);
    },

    insert(table, row) {
      return call(`/rest/v1/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
    },

    update(table, query, patch) {
      return call(`/rest/v1/${table}?${query}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
    },

    remove(table, query) {
      return call(`/rest/v1/${table}?${query}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      });
    },

    upload(bucket, path, body, contentType) {
      return call(`/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'x-upsert': 'false' },
        body,
      });
    },

    removeObjects(bucket, paths) {
      return call(`/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: paths }),
      });
    },

    // Returns { [path]: temporaryUrl } for private photos.
    async signUrls(bucket, paths, expiresIn = 3600) {
      if (!paths.length) return {};
      const rows = await call(`/storage/v1/object/sign/${bucket}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn, paths }),
      });
      const urls = {};
      for (const row of rows) if (row.signedURL) urls[row.path] = `${base}/storage/v1${row.signedURL}`;
      return urls;
    },
  };
}
