import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { STAGES, stageFor } from './stages.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['loading', 'login', 'denied', 'home', 'log', 'evolution'];

let supabase;
let state = null;        // last /api/state response
let celebrateFrom = null; // totalDays before the book we just logged
let photoBlob = null;

// ---------- Startup ----------

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

start();

async function start() {
  try {
    const cfg = await fetch('/api/config').then((r) => r.json());
    if (cfg.error) throw new Error(cfg.error);
    supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch (err) {
    showView('login');
    toast(`Can't reach the server: ${err.message}`);
    return;
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { state = null; showView('login'); }
  });

  const { data } = await supabase.auth.getSession();
  if (!data.session) return showView('login');
  try {
    await refresh();
    route();
  } catch (err) {
    if (!$('view-loading').hidden) showView('login');
    toast(err.message);
  }
}

window.addEventListener('hashchange', route);

// ---------- API ----------

async function api(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) { showView('login'); throw new Error('Not signed in'); }
  const res = await fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) { await supabase.auth.signOut(); throw new Error(body.error || 'Please sign in again'); }
  if (res.status === 403 && body.email) {
    $('denied-email').textContent = body.email;
    showView('denied');
    throw new Error(body.error);
  }
  if (!res.ok) throw Object.assign(new Error(body.error || `Error ${res.status}`), { status: res.status });
  return body;
}

async function refresh() {
  state = await api('/api/state');
}

// ---------- Routing ----------

function showView(name) {
  for (const v of VIEWS) $(`view-${v}`).hidden = v !== name;
  window.scrollTo(0, 0);
}

function route() {
  if (!state) return;
  const hash = location.hash.replace('#', '');
  if (hash === 'log' && !state.readToday) return renderLog();
  if (hash === 'evolution') return renderEvolution();
  if (hash) history.replaceState(null, '', location.pathname);
  renderHome();
}

// ---------- Home ----------

function renderHome() {
  const { totalDays, streak, readToday, recent, today, user } = state;
  const s = stageFor(totalDays);

  $('today-label').textContent = formatLong(today);
  const account = $('btn-account');
  account.textContent = (user.name || user.email).trim().charAt(0).toUpperCase();
  $('account-email').textContent = user.email;

  $('stage-pill').textContent = `STAGE ${s.index + 1} OF ${STAGES.length}`;
  $('streak').hidden = streak < 1;
  $('streak-label').textContent = `${streak}-day streak`;

  const img = $('dragon-img');
  img.src = `/sprites/${s.stage.file}`;
  img.alt = `${s.stage.name}, Thor's dragon at stage ${s.index + 1}`;
  img.style.height = `${Math.min(110 + s.index * 7, 220)}px`;

  $('dragon-name').textContent = s.stage.name;
  $('dragon-days').textContent = `${totalDays} reading ${totalDays === 1 ? 'day' : 'days'}`;
  $('progress-fill').style.width = `${Math.round(s.progress * 100)}%`;
  $('progress').setAttribute('aria-valuenow', String(Math.round(s.progress * 100)));
  if (s.next) {
    $('progress-label').textContent = `${s.toGo} more ${s.toGo === 1 ? 'day' : 'days'} to evolve`;
    $('progress-next').textContent = `Next: ${s.next.name}`;
  } else {
    $('progress-label').textContent = 'Fully evolved. Legendary reader!';
    $('progress-next').textContent = '';
  }

  // Celebrate the book we just logged.
  const card = $('dragon-card');
  card.classList.remove('celebrate');
  img.classList.remove('grow', 'munch');
  $('evolved-badge').hidden = true;
  if (celebrateFrom !== null) {
    const evolved = stageFor(celebrateFrom).index !== s.index;
    void img.offsetWidth; // restart the animation
    if (evolved) {
      card.classList.add('celebrate');
      $('evolved-badge').hidden = false;
      img.classList.add('grow');
      toast(`Your dragon evolved into ${s.stage.name}!`);
    } else {
      img.classList.add('munch');
      toast(`Yum! Day ${totalDays} done.`);
    }
    celebrateFrom = null;
  }

  $('btn-read').hidden = readToday;
  $('done-today').hidden = !readToday;

  const list = $('recent');
  list.replaceChildren(...recent.map((log) => bookItem(log, today)));
  $('recent-empty').hidden = recent.length > 0;

  showView('home');
}

function bookItem(log, today) {
  const li = document.createElement('li');
  li.className = 'book';

  if (log.photoUrl) {
    const img = document.createElement('img');
    img.className = 'book-thumb';
    img.src = log.photoUrl;
    img.alt = `Photo of ${log.title}`;
    img.loading = 'lazy';
    li.append(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'book-thumb';
    ph.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>';
    li.append(ph);
  }

  const body = document.createElement('div');
  body.className = 'book-body';
  const title = document.createElement('div');
  title.className = 'book-title';
  title.textContent = log.title;
  const meta = document.createElement('div');
  meta.className = 'book-meta';
  meta.textContent = `${formatShort(log.date, today)} · Day ${log.day}`;
  body.append(title, meta);
  if (log.note) {
    const note = document.createElement('div');
    note.className = 'book-note';
    note.textContent = log.note;
    body.append(note);
  }
  li.append(body);

  if (log.date === today) {
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'book-undo';
    undo.textContent = 'Undo';
    undo.addEventListener('click', () => undoToday(log));
    li.append(undo);
  }
  return li;
}

async function undoToday(log) {
  if (!confirm(`Remove today's log "${log.title}"? You can log it again afterwards.`)) return;
  try {
    await api(`/api/logs/${log.id}`, { method: 'DELETE' });
    await refresh();
    renderHome();
    toast("Today's log removed");
  } catch (err) {
    toast(err.message);
  }
}

// ---------- Log a book ----------

function renderLog() {
  $('log-date').textContent = `Today · ${formatLong(state.today)}`;
  $('log-error').hidden = true;
  showView('log');
  $('title').focus({ preventScroll: true });
}

for (const id of ['photo-camera', 'photo-library']) {
  $(id).addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      photoBlob = await shrinkPhoto(file);
      const preview = $('photo-preview');
      if (preview.src.startsWith('blob:')) URL.revokeObjectURL(preview.src);
      preview.src = URL.createObjectURL(photoBlob);
      preview.hidden = false;
      $('photo-empty').hidden = true;
    } catch {
      toast("Couldn't read that photo. Try another one.");
    }
  });
}

$('log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('title').value.trim();
  const error = $('log-error');
  if (!title) {
    error.textContent = 'Please enter the book title.';
    error.hidden = false;
    $('title').focus();
    return;
  }

  const form = new FormData();
  form.append('title', title);
  form.append('note', $('note').value.trim());
  if (photoBlob) form.append('photo', photoBlob, 'book.jpg');

  const btn = $('btn-save');
  btn.disabled = true;
  error.hidden = true;
  try {
    const before = state.totalDays;
    await api('/api/logs', { method: 'POST', body: form });
    resetLogForm();
    await refresh();
    celebrateFrom = before;
    location.hash = '';
    route();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    if (err.status === 409) { await refresh(); }
  } finally {
    btn.disabled = false;
  }
});

function resetLogForm() {
  $('log-form').reset();
  photoBlob = null;
  const preview = $('photo-preview');
  if (preview.src.startsWith('blob:')) URL.revokeObjectURL(preview.src);
  preview.removeAttribute('src');
  preview.hidden = true;
  $('photo-empty').hidden = false;
}

// Phone photos are huge: resize to max 1280px JPEG before uploading.
async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('resize failed'))), 'image/jpeg', 0.85));
}

// ---------- Evolution path ----------

function renderEvolution() {
  const { totalDays } = state;
  const current = stageFor(totalDays).index;
  $('evo-summary').textContent = `${current + 1} of ${STAGES.length} unlocked · ${totalDays} reading ${totalDays === 1 ? 'day' : 'days'}`;

  $('evo-grid').replaceChildren(...STAGES.map((s, i) => {
    const got = i <= current;
    const li = document.createElement('li');
    li.className = `evo${i === current ? ' current' : ''}${got ? '' : ' locked'}`;
    li.innerHTML = '<div class="evo-img"><img></div><div class="evo-name"></div><div class="evo-days"></div>';
    const img = li.querySelector('img');
    img.src = `/sprites/${s.file}`;
    img.alt = got ? s.name : 'Locked stage';
    img.loading = 'lazy';
    li.querySelector('.evo-name').textContent = got ? s.name : '???';
    li.querySelector('.evo-days').textContent = s.days === 0 ? 'Start' : `Day ${s.days}`;
    return li;
  }));
  showView('evolution');
}

// ---------- Account ----------

$('btn-google').addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/` },
  });
  if (error) toast(error.message);
});

$('btn-account').addEventListener('click', () => {
  $('account-menu').hidden = !$('account-menu').hidden;
});

for (const btn of document.querySelectorAll('.js-signout')) {
  btn.addEventListener('click', async () => {
    $('account-menu').hidden = true;
    await supabase.auth.signOut();
    state = null;
    showView('login');
  });
}

// ---------- Helpers ----------

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLong(iso) {
  return parseDate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatShort(iso, today) {
  if (iso === today) return 'Today';
  const diff = Math.round((parseDate(today) - parseDate(iso)) / 86400000);
  if (diff === 1) return 'Yesterday';
  return parseDate(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}
