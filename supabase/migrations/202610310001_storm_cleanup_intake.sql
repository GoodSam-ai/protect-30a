-- Private intake; no public read or write policies.
create table if not exists public.storm_cleanup_reports (
 id uuid primary key default gen_random_uuid(),
 request_key text not null unique,
 contact_email text not null,
 location_address text,
 latitude double precision,
 longitude double precision,
 photo_path text not null unique,
 status text not null default 'received' check (status in ('received','under_review','referred','scheduled','collected','verified','closed','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint cleanup_location_required check (nullif(btrim(coalesce(location_address,'')),'') is not null or (latitude is not null and longitude is not null)),
 constraint cleanup_coordinates_valid check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);
alter table public.storm_cleanup_reports enable row level security;
revoke all on public.storm_cleanup_reports from anon, authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('storm-cleanup-private','storm-cleanup-private',false,15728640,array['image/jpeg','image/png','image/heic','image/heif','image/webp'])
on conflict (id) do nothing;
-- Only server-side service role may read/write reports or photos.
