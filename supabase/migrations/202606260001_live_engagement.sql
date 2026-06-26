create extension if not exists "pgcrypto";

create type public.profile_role as enum ('user', 'moderator', 'admin');
create type public.event_status as enum ('upcoming', 'live', 'replay', 'archived');
create type public.comment_source as enum ('site', 'facebook_manual', 'facebook_api', 'admin_import');
create type public.comment_moderation_status as enum ('visible', 'pending', 'hidden', 'removed');

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  primary_district_id uuid references public.districts(id),
  bio text,
  role public.profile_role not null default 'user',
  is_candidate boolean not null default false,
  is_potential_guest boolean not null default false,
  is_restricted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.podcast_events (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references public.districts(id),
  title text not null,
  slug text not null unique,
  description text,
  status public.event_status not null default 'upcoming',
  starts_at timestamptz,
  ends_at timestamptz,
  livestream_url text,
  replay_url text,
  host_name text not null default 'Doug Liles',
  cohost_name text,
  advocate_name text,
  guest_names text[] not null default '{}',
  entertainer_name text,
  entertainment_type text,
  entertainment_description text,
  disclaimer text not null default 'Let me make this crystal clear: this podcast is purely for community education and conversation. We''re not a government body, nor are we making any official decisions. We''re committed to full transparency, because we believe that open information builds community trust.',
  comments_enabled boolean not null default true,
  replies_enabled boolean not null default true,
  leaderboard_enabled boolean not null default true,
  forced_engagement_mode text not null default 'auto' check (forced_engagement_mode in ('auto', 'realtime', 'polling', 'low-bandwidth')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.podcast_events(id) on delete cascade,
  district_id uuid references public.districts(id),
  user_id uuid references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 5 and 500),
  topic text check (topic in ('Stormwater', 'Traffic', 'Beach access', 'Mosquito control', 'Public safety', 'Growth/development', 'Parking', 'Environment', 'Other')),
  source public.comment_source not null default 'site',
  external_source_url text,
  external_source_author text,
  is_hidden boolean not null default false,
  is_featured boolean not null default false,
  is_reported boolean not null default false,
  moderation_status public.comment_moderation_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_user_id)
);

create table public.event_shares (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.podcast_events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  platform text not null,
  created_at timestamptz not null default now()
);

create table public.district_influencer_scores (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id),
  user_id uuid not null references public.profiles(id),
  week_start date not null,
  comments_count int not null default 0,
  likes_received_count int not null default 0,
  shares_count int not null default 0,
  featured_comments_count int not null default 0,
  engagement_score numeric not null default 0,
  rank int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, user_id, week_start)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.districts (name, slug, description, sort_order) values
  ('Inlet Beach', 'inlet-beach', 'Inlet Beach district placeholder.', 1),
  ('Rosemary Beach', 'rosemary-beach', 'Rosemary Beach district placeholder.', 2),
  ('Alys Beach', 'alys-beach', 'Alys Beach district placeholder.', 3),
  ('Watersound', 'watersound', 'Watersound, Seacrest, Prominence, and Origins.', 4),
  ('Seagrove', 'seagrove', 'Seagrove, Seaside, and WaterColor.', 5),
  ('Grayton Beach', 'grayton-beach', 'Grayton Beach and Blue Mountain Beach.', 6),
  ('Santa Rosa Beach', 'santa-rosa-beach', 'Santa Rosa Beach, Gulf Place, and Dune Allen.', 7),
  ('Sandestin', 'sandestin', 'Sandestin, Miramar Beach, and Seascape.', 8);

insert into public.podcast_events (
  district_id,
  title,
  slug,
  description,
  status,
  starts_at,
  host_name,
  cohost_name,
  advocate_name,
  guest_names,
  entertainer_name,
  entertainment_type,
  entertainment_description,
  is_active
)
select
  id,
  'Protect30A Live: Community Conversation',
  'protect30a-live-community-conversation',
  'A district-based live podcast event for community education, comments, likes, sharing, and leaderboards.',
  'upcoming',
  now() + interval '7 days',
  'Doug Liles',
  'Jim Bagby',
  'Community advocate',
  array['Local resident voice'],
  'Local entertainer',
  'Music',
  'A short 3-5 minute local segment.',
  true
from public.districts
where slug = 'inlet-beach';

create index comments_event_created_idx on public.comments (event_id, created_at desc);
create index comments_event_featured_idx on public.comments (event_id, is_featured, created_at desc);
create index comments_parent_idx on public.comments (parent_comment_id);
create index comment_likes_comment_idx on public.comment_likes (comment_id);
create index event_shares_event_idx on public.event_shares (event_id);
create index event_shares_user_event_idx on public.event_shares (user_id, event_id);
create index influencer_scores_week_idx on public.district_influencer_scores (week_start, district_id, rank);

create or replace function public.is_admin_or_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'moderator')
      and is_restricted = false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_restricted = false
  );
$$;

alter table public.districts enable row level security;
alter table public.profiles enable row level security;
alter table public.podcast_events enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.comment_reports enable row level security;
alter table public.event_shares enable row level security;
alter table public.district_influencer_scores enable row level security;
alter table public.audit_log enable row level security;

create policy "public read districts" on public.districts for select using (true);
create policy "admins manage districts" on public.districts for all using (public.is_admin()) with check (public.is_admin());

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;

create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "moderators read profiles" on public.profiles for select using (public.is_admin_or_moderator());
create policy "users insert own profile" on public.profiles for insert with check (id = auth.uid() and role = 'user' and is_candidate = false and is_potential_guest = false and is_restricted = false);
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = 'user' and is_candidate = false and is_potential_guest = false and is_restricted = false);
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "public read public events" on public.podcast_events for select using (status in ('upcoming', 'live', 'replay'));
create policy "admins manage events" on public.podcast_events for all using (public.is_admin()) with check (public.is_admin());

revoke all on table public.comments from anon, authenticated;
grant select, insert, update, delete on table public.comments to authenticated;

create policy "users read own comments" on public.comments for select using (auth.uid() = user_id);
create policy "logged in users create own comments" on public.comments for insert with check (
  auth.uid() = user_id
  and source = 'site'
  and moderation_status = 'visible'
  and is_hidden = false
  and is_featured = false
);
create policy "admins moderate comments" on public.comments for all using (public.is_admin_or_moderator()) with check (public.is_admin_or_moderator());

revoke all on table public.comment_likes from anon, authenticated;
grant select, insert, delete on table public.comment_likes to authenticated;

create policy "users read own likes" on public.comment_likes for select using (auth.uid() = user_id);
create policy "moderators read likes" on public.comment_likes for select using (public.is_admin_or_moderator());
create policy "users like as themselves" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "users unlike as themselves" on public.comment_likes for delete using (auth.uid() = user_id);

create policy "users report as themselves" on public.comment_reports for insert with check (auth.uid() = reporter_user_id);
create policy "moderators read reports" on public.comment_reports for select using (public.is_admin_or_moderator());

create policy "users track own shares" on public.event_shares for insert with check (auth.uid() = user_id);
create policy "admins read shares" on public.event_shares for select using (public.is_admin_or_moderator());

create policy "public read influencer scores" on public.district_influencer_scores for select using (true);
create policy "admins manage influencer scores" on public.district_influencer_scores for all using (public.is_admin()) with check (public.is_admin());

create policy "admins read audit log" on public.audit_log for select using (public.is_admin());
create policy "moderators insert audit log" on public.audit_log for insert with check (public.is_admin_or_moderator());

create or replace view public.public_profiles as
select
  id,
  display_name,
  avatar_url,
  primary_district_id,
  bio
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

create or replace view public.visible_comments as
select
  c.id,
  c.event_id,
  c.district_id,
  c.user_id,
  c.parent_comment_id,
  c.body,
  c.topic,
  c.is_featured,
  c.created_at,
  p.display_name,
  p.avatar_url,
  d.name as district_name,
  coalesce(likes.like_count, 0)::int as like_count,
  coalesce(replies.reply_count, 0)::int as reply_count
from public.comments c
left join public.public_profiles p on p.id = c.user_id
left join public.districts d on d.id = c.district_id
left join (
  select comment_id, count(*)::int as like_count
  from public.comment_likes
  group by comment_id
) likes on likes.comment_id = c.id
left join (
  select parent_comment_id, count(*)::int as reply_count
  from public.comments
  where moderation_status = 'visible' and is_hidden = false and parent_comment_id is not null
  group by parent_comment_id
) replies on replies.parent_comment_id = c.id
where c.moderation_status = 'visible' and c.is_hidden = false;

create or replace view public.top_comments_for_event as
select
  id,
  event_id,
  body,
  topic,
  created_at,
  is_featured,
  display_name,
  avatar_url,
  district_name,
  like_count,
  reply_count
from public.visible_comments;

create or replace view public.top_commenters_for_event as
with comment_stats as (
  select
    c.event_id,
    c.user_id,
    count(*)::int as comments_count,
    count(*) filter (where c.is_featured)::int as featured_comments_count
  from public.comments c
  where c.moderation_status = 'visible'
    and c.is_hidden = false
    and c.user_id is not null
  group by c.event_id, c.user_id
),
like_stats as (
  select
    c.event_id,
    c.user_id,
    count(cl.id)::int as likes_received_count
  from public.comments c
  left join public.comment_likes cl on cl.comment_id = c.id
  where c.moderation_status = 'visible'
    and c.is_hidden = false
    and c.user_id is not null
  group by c.event_id, c.user_id
),
share_stats as (
  select
    es.event_id,
    es.user_id,
    count(*)::int as shares_count
  from public.event_shares es
  where es.user_id is not null
  group by es.event_id, es.user_id
)
select
  cs.event_id,
  cs.user_id,
  p.display_name,
  p.avatar_url,
  cs.comments_count,
  coalesce(ls.likes_received_count, 0)::int as likes_received_count,
  coalesce(ss.shares_count, 0)::int as shares_count,
  cs.featured_comments_count,
  (
    coalesce(ls.likes_received_count, 0) * 3 +
    cs.comments_count * 1 +
    coalesce(ss.shares_count, 0) * 2 +
    cs.featured_comments_count * 10
  )::numeric as engagement_score
from comment_stats cs
join public.public_profiles p on p.id = cs.user_id
left join like_stats ls on ls.event_id = cs.event_id and ls.user_id = cs.user_id
left join share_stats ss on ss.event_id = cs.event_id and ss.user_id = cs.user_id;

grant select on public.visible_comments, public.top_comments_for_event, public.top_commenters_for_event to anon, authenticated;

create or replace function public.refresh_weekly_district_influencer_scores(target_week date default date_trunc('week', now())::date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can refresh district influencer scores.'
      using errcode = '42501';
  end if;

  delete from public.district_influencer_scores where week_start = target_week;

  insert into public.district_influencer_scores (
    district_id,
    user_id,
    week_start,
    comments_count,
    likes_received_count,
    shares_count,
    featured_comments_count,
    engagement_score,
    rank
  )
  with comment_stats as (
    select
      c.district_id,
      c.user_id,
      count(*)::int as comments_count,
      count(*) filter (where c.is_featured)::int as featured_comments_count
    from public.comments c
    where c.moderation_status = 'visible'
      and c.is_hidden = false
      and c.district_id is not null
      and c.user_id is not null
      and c.created_at >= target_week
      and c.created_at < target_week + interval '7 days'
    group by c.district_id, c.user_id
  ),
  like_stats as (
    select
      c.district_id,
      c.user_id,
      count(cl.id)::int as likes_received_count
    from public.comments c
    left join public.comment_likes cl on cl.comment_id = c.id
    where c.moderation_status = 'visible'
      and c.is_hidden = false
      and c.district_id is not null
      and c.user_id is not null
      and c.created_at >= target_week
      and c.created_at < target_week + interval '7 days'
    group by c.district_id, c.user_id
  ),
  share_stats as (
    select
      pe.district_id,
      es.user_id,
      count(*)::int as shares_count
    from public.event_shares es
    join public.podcast_events pe on pe.id = es.event_id
    where pe.district_id is not null
      and es.created_at >= target_week
      and es.created_at < target_week + interval '7 days'
    group by pe.district_id, es.user_id
  ),
  score_base as (
    select
      cs.district_id,
      cs.user_id,
      coalesce(p.display_name, 'Community member') as display_name,
      cs.comments_count,
      coalesce(ls.likes_received_count, 0)::int as likes_received_count,
      coalesce(ss.shares_count, 0)::int as shares_count,
      cs.featured_comments_count,
      (
        coalesce(ls.likes_received_count, 0) * 3 +
        cs.comments_count * 1 +
        coalesce(ss.shares_count, 0) * 2 +
        cs.featured_comments_count * 10
      )::numeric as engagement_score
    from comment_stats cs
    join public.profiles p on p.id = cs.user_id
    left join like_stats ls on ls.district_id = cs.district_id and ls.user_id = cs.user_id
    left join share_stats ss on ss.district_id = cs.district_id and ss.user_id = cs.user_id
  ),
  ranked as (
    select
      score_base.*,
      row_number() over (partition by score_base.district_id order by score_base.engagement_score desc, score_base.display_name asc) as rank
    from score_base
  )
  select
    ranked.district_id,
    ranked.user_id,
    target_week,
    ranked.comments_count,
    ranked.likes_received_count,
    ranked.shares_count,
    ranked.featured_comments_count,
    ranked.engagement_score,
    ranked.rank
  from ranked;
end;
$$;

revoke execute on function public.refresh_weekly_district_influencer_scores(date) from public, anon, authenticated;
grant execute on function public.refresh_weekly_district_influencer_scores(date) to authenticated, service_role;
