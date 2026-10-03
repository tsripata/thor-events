-- Thor's Reading Dragon: database setup.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- The child (or children, later) whose reading is tracked.
create table if not exists public.readers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Which creature they're growing (an id from public/creatures/index.js). Null until they pick.
  creature text,
  created_at timestamptz not null default now()
);
-- For databases created before creatures could be picked.
alter table public.readers add column if not exists creature text;

-- One row per reading day.
create table if not exists public.reading_logs (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.readers(id) on delete cascade,
  read_date date not null,
  book_title text not null check (char_length(book_title) between 1 and 200),
  note text check (char_length(note) <= 500),
  photo_path text,
  logged_by text,
  created_at timestamptz not null default now(),
  -- The "only one log per day" rule, enforced by the database itself.
  unique (reader_id, read_date)
);

-- Lock both tables. With RLS on and NO policies, the public (publishable) key
-- can't read or write anything. Only the Cloudflare API, using the secret key, can.
alter table public.readers enable row level security;
alter table public.reading_logs enable row level security;

-- Private bucket for book photos (only reachable through short-lived signed links).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-photos', 'book-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- The reader.
insert into public.readers (name)
select 'Thor'
where not exists (select 1 from public.readers);
