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

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    avatar_url,
    role,
    is_candidate,
    is_potential_guest,
    is_restricted
  )
  values (
    new.id,
    nullif(
      trim(coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Community member'
      )),
      ''
    ),
    nullif(
      trim(coalesce(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture',
        ''
      )),
      ''
    ),
    'user',
    false,
    false,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger create_profile_on_auth_user_insert
after insert on auth.users
for each row
execute function public.create_profile_for_auth_user();

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
  unique (comment_id, reporter_user_id),
  constraint comment_reports_reason_check check (reason in ('spam', 'harassment', 'misinformation', 'off_topic', 'other')),
  constraint comment_reports_details_length_check check (details is null or char_length(details) <= 1000)
);

create table public.event_shares (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.podcast_events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  platform text not null,
  created_at timestamptz not null default now(),
  constraint event_shares_platform_check check (platform in ('facebook', 'instagram', 'tiktok', 'x', 'email', 'copy_link', 'other'))
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

create table public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint admin_settings_key_check check (key in ('engagement_scoring', 'engagement_badges'))
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

insert into public.admin_settings (key, value) values
  (
    'engagement_scoring',
    '{"comment_weight": 1, "like_weight": 3, "share_weight": 2, "featured_weight": 10}'::jsonb
  ),
  (
    'engagement_badges',
    '{"first_voice_comments": 1, "conversation_starter_comments": 5, "community_signal_score": 25, "podcast_invite_score": 30}'::jsonb
  );

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

create or replace function public.can_create_comment(
  target_event_id uuid,
  target_parent_comment_id uuid,
  target_district_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.podcast_events pe
    where pe.id = target_event_id
      and pe.status in ('upcoming', 'live')
      and pe.comments_enabled = true
      and pe.district_id is not distinct from target_district_id
      and (
        target_parent_comment_id is null
        or (
          pe.replies_enabled = true
          and exists (
            select 1
            from public.comments parent
            where parent.id = target_parent_comment_id
              and parent.event_id = target_event_id
              and parent.moderation_status = 'visible'
              and parent.is_hidden = false
          )
        )
      )
  );
$$;

create or replace function public.prepare_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at = now();
  new.updated_at = now();

  if new.source = 'site' then
    select pe.district_id
    into new.district_id
    from public.podcast_events pe
    where pe.id = new.event_id;

    new.external_source_url = null;
    new.external_source_author = null;
    new.is_hidden = false;
    new.is_featured = false;
    new.is_reported = false;
    new.moderation_status = 'visible';
  end if;

  return new;
end;
$$;

create trigger prepare_comment_insert
before insert on public.comments
for each row
execute function public.prepare_comment_insert();

create or replace function public.prepare_comment_like_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at = now();
  return new;
end;
$$;

create trigger prepare_comment_like_insert
before insert on public.comment_likes
for each row
execute function public.prepare_comment_like_insert();

create or replace function public.prepare_comment_report_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at = now();
  new.reason = lower(trim(new.reason));
  new.details = nullif(trim(new.details), '');
  return new;
end;
$$;

create trigger prepare_comment_report_insert
before insert on public.comment_reports
for each row
execute function public.prepare_comment_report_insert();

create or replace function public.prepare_event_share_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at = now();
  new.platform = lower(trim(new.platform));
  return new;
end;
$$;

create trigger prepare_event_share_insert
before insert on public.event_shares
for each row
execute function public.prepare_event_share_insert();

create or replace function public.can_engage_with_comment(target_comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.comments c
    join public.podcast_events pe on pe.id = c.event_id
    where c.id = target_comment_id
      and c.moderation_status = 'visible'
      and c.is_hidden = false
      and pe.status in ('upcoming', 'live', 'replay')
  );
$$;

create or replace function public.can_report_comment(
  target_comment_id uuid,
  target_reporter_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.comments c
    join public.podcast_events pe on pe.id = c.event_id
    where c.id = target_comment_id
      and c.moderation_status = 'visible'
      and c.is_hidden = false
      and c.user_id is distinct from target_reporter_user_id
      and pe.status in ('upcoming', 'live', 'replay')
  );
$$;

create or replace function public.can_share_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.podcast_events pe
    where pe.id = target_event_id
      and pe.status in ('upcoming', 'live', 'replay')
  );
$$;

create or replace function public.enforce_profile_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.is_candidate is distinct from old.is_candidate
    or new.is_potential_guest is distinct from old.is_potential_guest
    or new.is_restricted is distinct from old.is_restricted
    or new.created_at is distinct from old.created_at then
    raise exception 'Only admins can update protected profile fields.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger enforce_profile_update_permissions
before update on public.profiles
for each row
execute function public.enforce_profile_update_permissions();

alter table public.districts enable row level security;
alter table public.profiles enable row level security;
alter table public.podcast_events enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.comment_reports enable row level security;
alter table public.event_shares enable row level security;
alter table public.district_influencer_scores enable row level security;
alter table public.audit_log enable row level security;
alter table public.admin_settings enable row level security;

create policy "public read districts" on public.districts for select using (true);
create policy "admins manage districts" on public.districts for all using (public.is_admin()) with check (public.is_admin());

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;

create policy "users read own profile" on public.profiles for select using (id = auth.uid());
create policy "moderators read profiles" on public.profiles for select using (public.is_admin_or_moderator());
create policy "users insert own profile" on public.profiles for insert with check (id = auth.uid() and role = 'user' and is_candidate = false and is_potential_guest = false and is_restricted = false);
create policy "users update own profile" on public.profiles for update using (id = auth.uid() and is_restricted = false) with check (id = auth.uid() and is_restricted = false);
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "public read public events" on public.podcast_events for select using (status in ('upcoming', 'live', 'replay'));
create policy "admins manage events" on public.podcast_events for all using (public.is_admin()) with check (public.is_admin());

revoke all on table public.comments from anon, authenticated;
grant select, insert, update, delete on table public.comments to authenticated;

create policy "users read own comments" on public.comments for select using (auth.uid() = user_id);
create policy "logged in users create own comments" on public.comments for insert with check (
  auth.uid() = user_id
  and public.can_create_comment(event_id, parent_comment_id, district_id)
  and source = 'site'
  and moderation_status = 'visible'
  and is_hidden = false
  and is_featured = false
  and is_reported = false
);
create policy "admins moderate comments" on public.comments for all using (public.is_admin_or_moderator()) with check (public.is_admin_or_moderator());

revoke all on table public.comment_likes from anon, authenticated;
grant select, insert, delete on table public.comment_likes to authenticated;

create policy "users read own likes" on public.comment_likes for select using (auth.uid() = user_id);
create policy "moderators read likes" on public.comment_likes for select using (public.is_admin_or_moderator());
create policy "users like as themselves" on public.comment_likes for insert with check (
  auth.uid() = user_id
  and public.can_engage_with_comment(comment_id)
);
create policy "users unlike as themselves" on public.comment_likes for delete using (auth.uid() = user_id);

revoke all on table public.comment_reports from anon, authenticated;
grant insert, select on table public.comment_reports to authenticated;

create policy "users report as themselves" on public.comment_reports for insert with check (
  auth.uid() = reporter_user_id
  and public.can_report_comment(comment_id, reporter_user_id)
);
create policy "moderators read reports" on public.comment_reports for select using (public.is_admin_or_moderator());

revoke all on table public.event_shares from anon, authenticated;
grant insert, select on table public.event_shares to authenticated;

create policy "users track own shares" on public.event_shares for insert with check (
  auth.uid() = user_id
  and public.can_share_event(event_id)
);
create policy "admins read shares" on public.event_shares for select using (public.is_admin_or_moderator());

revoke all on table public.district_influencer_scores from anon, authenticated;
grant select, insert, update, delete on table public.district_influencer_scores to authenticated;

create policy "moderators read influencer scores" on public.district_influencer_scores for select using (public.is_admin_or_moderator());
create policy "admins manage influencer scores" on public.district_influencer_scores for all using (public.is_admin()) with check (public.is_admin());

create policy "admins read audit log" on public.audit_log for select using (public.is_admin());
create policy "moderators insert audit log" on public.audit_log for insert with check (public.is_admin_or_moderator());

revoke all on table public.admin_settings from anon, authenticated;
grant select on table public.admin_settings to anon, authenticated;

create policy "public read admin settings" on public.admin_settings for select using (true);
create policy "admins manage admin settings" on public.admin_settings for all using (public.is_admin_or_moderator()) with check (public.is_admin_or_moderator());

create or replace view public.public_profiles as
select
  id,
  display_name,
  avatar_url
from public.profiles;

revoke all on table public.public_profiles from public, anon, authenticated;

create or replace view public.visible_comments as
select
  c.id,
  c.event_id,
  c.district_id,
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
join public.podcast_events pe on pe.id = c.event_id
left join public.public_profiles p on p.id = c.user_id
left join public.districts d on d.id = c.district_id
left join (
  select comment_id, count(*)::int as like_count
  from public.comment_likes
  group by comment_id
) likes on likes.comment_id = c.id
left join (
  select replies.parent_comment_id, count(*)::int as reply_count
  from public.comments replies
  join public.comments parent on parent.id = replies.parent_comment_id
    and parent.event_id = replies.event_id
    and parent.moderation_status = 'visible'
    and parent.is_hidden = false
  join public.podcast_events reply_events on reply_events.id = replies.event_id
  where replies.moderation_status = 'visible'
    and replies.is_hidden = false
    and replies.parent_comment_id is not null
    and reply_events.status in ('upcoming', 'live', 'replay')
  group by replies.parent_comment_id
) replies on replies.parent_comment_id = c.id
where c.moderation_status = 'visible'
  and c.is_hidden = false
  and pe.status in ('upcoming', 'live', 'replay');

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
  join public.podcast_events pe on pe.id = c.event_id
  where c.moderation_status = 'visible'
    and c.is_hidden = false
    and c.user_id is not null
    and pe.status in ('upcoming', 'live', 'replay')
  group by c.event_id, c.user_id
),
like_stats as (
  select
    c.event_id,
    c.user_id,
    count(cl.id)::int as likes_received_count
  from public.comments c
  join public.podcast_events pe on pe.id = c.event_id
  left join public.comment_likes cl on cl.comment_id = c.id
  where c.moderation_status = 'visible'
    and c.is_hidden = false
    and c.user_id is not null
    and pe.status in ('upcoming', 'live', 'replay')
  group by c.event_id, c.user_id
),
share_stats as (
  select
    es.event_id,
    es.user_id,
    count(*)::int as shares_count
  from public.event_shares es
  join public.podcast_events pe on pe.id = es.event_id
  where es.user_id is not null
    and pe.status in ('upcoming', 'live', 'replay')
  group by es.event_id, es.user_id
),
top_comment_stats as (
  select distinct on (c.event_id, c.user_id)
    c.event_id,
    c.user_id,
    c.body as top_comment_text
  from public.comments c
  join public.podcast_events pe on pe.id = c.event_id
  left join (
    select comment_id, count(*)::int as like_count
    from public.comment_likes
    group by comment_id
  ) likes on likes.comment_id = c.id
  where c.moderation_status = 'visible'
    and c.is_hidden = false
    and c.user_id is not null
    and pe.status in ('upcoming', 'live', 'replay')
  order by c.event_id, c.user_id, coalesce(likes.like_count, 0) desc, c.created_at desc
),
active_users as (
  select event_id, user_id from comment_stats
  union
  select event_id, user_id from like_stats
  union
  select event_id, user_id from share_stats
),
scoring_settings as (
  select
    comment_weight,
    like_weight,
    share_weight,
    featured_weight
  from (
    select
      0 as priority,
      coalesce((value->>'comment_weight')::numeric, 1) as comment_weight,
      coalesce((value->>'like_weight')::numeric, 3) as like_weight,
      coalesce((value->>'share_weight')::numeric, 2) as share_weight,
      coalesce((value->>'featured_weight')::numeric, 10) as featured_weight
    from public.admin_settings
    where key = 'engagement_scoring'
    union all
    select 1 as priority, 1::numeric, 3::numeric, 2::numeric, 10::numeric
  ) configured_scoring_settings
  order by priority
  limit 1
)
select
  active_users.event_id,
  p.display_name,
  p.avatar_url,
  coalesce(cs.comments_count, 0)::int as comments_count,
  coalesce(ls.likes_received_count, 0)::int as likes_received_count,
  coalesce(ss.shares_count, 0)::int as shares_count,
  coalesce(cs.featured_comments_count, 0)::int as featured_comments_count,
  (
    coalesce(ls.likes_received_count, 0) * weights.like_weight +
    coalesce(cs.comments_count, 0) * weights.comment_weight +
    coalesce(ss.shares_count, 0) * weights.share_weight +
    coalesce(cs.featured_comments_count, 0) * weights.featured_weight
  )::numeric as engagement_score,
  tcs.top_comment_text
from active_users
cross join scoring_settings weights
join public.public_profiles p on p.id = active_users.user_id
left join comment_stats cs on cs.event_id = active_users.event_id and cs.user_id = active_users.user_id
left join like_stats ls on ls.event_id = active_users.event_id and ls.user_id = active_users.user_id
left join share_stats ss on ss.event_id = active_users.event_id and ss.user_id = active_users.user_id
left join top_comment_stats tcs on tcs.event_id = active_users.event_id and tcs.user_id = active_users.user_id;

create or replace view public.weekly_district_influencers as
with top_weekly_comments as (
  select distinct on (c.district_id, c.user_id, date_trunc('week', c.created_at)::date)
    date_trunc('week', c.created_at)::date as week_start,
    c.district_id,
    c.user_id,
    c.body as top_comment_text
  from public.comments c
  join public.podcast_events pe on pe.id = c.event_id
  left join (
    select comment_id, count(*)::int as like_count
    from public.comment_likes
    group by comment_id
  ) likes on likes.comment_id = c.id
  where c.moderation_status = 'visible'
    and c.is_hidden = false
    and c.district_id is not null
    and c.user_id is not null
    and pe.status in ('upcoming', 'live', 'replay')
  order by c.district_id, c.user_id, date_trunc('week', c.created_at)::date, coalesce(likes.like_count, 0) desc, c.created_at desc
)
select
  scores.week_start,
  scores.district_id,
  districts.name as district_name,
  districts.slug as district_slug,
  profiles.display_name,
  profiles.avatar_url,
  scores.comments_count,
  scores.likes_received_count,
  scores.shares_count,
  scores.featured_comments_count,
  scores.engagement_score,
  scores.rank,
  scores.updated_at,
  top_weekly_comments.top_comment_text
from public.district_influencer_scores scores
join public.districts districts on districts.id = scores.district_id
join public.public_profiles profiles on profiles.id = scores.user_id
left join top_weekly_comments on top_weekly_comments.week_start = scores.week_start
  and top_weekly_comments.district_id = scores.district_id
  and top_weekly_comments.user_id = scores.user_id;

create or replace view public.live_event_metrics as
with comment_metrics as (
  select
    vc.event_id,
    count(*)::int as total_comments,
    coalesce(sum(vc.like_count), 0)::int as total_likes
  from public.visible_comments vc
  group by vc.event_id
),
share_metrics as (
  select
    es.event_id,
    count(es.id)::int as total_shares
  from public.event_shares es
  join public.podcast_events pe on pe.id = es.event_id
  where pe.status in ('upcoming', 'live', 'replay')
  group by es.event_id
)
select
  pe.id as event_id,
  coalesce(comment_metrics.total_comments, 0)::int as total_comments,
  coalesce(comment_metrics.total_likes, 0)::int as total_likes,
  coalesce(share_metrics.total_shares, 0)::int as total_shares
from public.podcast_events pe
left join comment_metrics on comment_metrics.event_id = pe.id
left join share_metrics on share_metrics.event_id = pe.id
where pe.status in ('upcoming', 'live', 'replay');

create or replace view public.event_district_engagement_scores as
with comment_stats as (
  select
    c.event_id,
    c.district_id,
    count(*)::int as comments_count,
    count(*) filter (where c.is_featured)::int as featured_comments_count
  from public.comments c
  join public.podcast_events pe on pe.id = c.event_id
  where c.moderation_status = 'visible'
    and c.is_hidden = false
    and c.district_id is not null
    and pe.status in ('upcoming', 'live', 'replay')
  group by c.event_id, c.district_id
),
like_stats as (
  select
    c.event_id,
    c.district_id,
    count(cl.id)::int as likes_received_count
  from public.comments c
  join public.podcast_events pe on pe.id = c.event_id
  left join public.comment_likes cl on cl.comment_id = c.id
  where c.moderation_status = 'visible'
    and c.is_hidden = false
    and c.district_id is not null
    and pe.status in ('upcoming', 'live', 'replay')
  group by c.event_id, c.district_id
),
share_stats as (
  select
    es.event_id,
    pe.district_id,
    count(es.id)::int as shares_count
  from public.event_shares es
  join public.podcast_events pe on pe.id = es.event_id
  where pe.district_id is not null
    and pe.status in ('upcoming', 'live', 'replay')
  group by es.event_id, pe.district_id
),
active_districts as (
  select event_id, district_id from comment_stats
  union
  select event_id, district_id from like_stats
  union
  select event_id, district_id from share_stats
),
scoring_settings as (
  select
    comment_weight,
    like_weight,
    share_weight,
    featured_weight
  from (
    select
      0 as priority,
      coalesce((value->>'comment_weight')::numeric, 1) as comment_weight,
      coalesce((value->>'like_weight')::numeric, 3) as like_weight,
      coalesce((value->>'share_weight')::numeric, 2) as share_weight,
      coalesce((value->>'featured_weight')::numeric, 10) as featured_weight
    from public.admin_settings
    where key = 'engagement_scoring'
    union all
    select 1 as priority, 1::numeric, 3::numeric, 2::numeric, 10::numeric
  ) configured_scoring_settings
  order by priority
  limit 1
),
district_base as (
  select
    active_districts.event_id,
    active_districts.district_id,
    districts.name as district_name,
    districts.slug as district_slug,
    coalesce(comment_stats.comments_count, 0)::int as comments_count,
    coalesce(like_stats.likes_received_count, 0)::int as likes_received_count,
    coalesce(share_stats.shares_count, 0)::int as shares_count,
    coalesce(comment_stats.featured_comments_count, 0)::int as featured_comments_count,
    (
      coalesce(like_stats.likes_received_count, 0) * weights.like_weight +
      coalesce(comment_stats.comments_count, 0) * weights.comment_weight +
      coalesce(share_stats.shares_count, 0) * weights.share_weight +
      coalesce(comment_stats.featured_comments_count, 0) * weights.featured_weight
    )::numeric as engagement_score
  from active_districts
  cross join scoring_settings weights
  join public.districts districts on districts.id = active_districts.district_id
  left join comment_stats on comment_stats.event_id = active_districts.event_id
    and comment_stats.district_id = active_districts.district_id
  left join like_stats on like_stats.event_id = active_districts.event_id
    and like_stats.district_id = active_districts.district_id
  left join share_stats on share_stats.event_id = active_districts.event_id
    and share_stats.district_id = active_districts.district_id
),
ranked as (
  select
    district_base.*,
    row_number() over (partition by district_base.event_id order by district_base.engagement_score desc, district_base.district_name asc) as rank
  from district_base
)
select
  ranked.event_id,
  ranked.district_id,
  ranked.district_name,
  ranked.district_slug,
  ranked.comments_count,
  ranked.likes_received_count,
  ranked.shares_count,
  ranked.featured_comments_count,
  ranked.engagement_score,
  ranked.rank
from ranked;

revoke all on table public.visible_comments, public.top_comments_for_event, public.top_commenters_for_event, public.weekly_district_influencers, public.live_event_metrics, public.event_district_engagement_scores from public, anon, authenticated;
grant select on public.visible_comments, public.top_comments_for_event, public.top_commenters_for_event, public.weekly_district_influencers, public.live_event_metrics, public.event_district_engagement_scores to anon, authenticated;

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
    join public.podcast_events pe on pe.id = c.event_id
    where c.moderation_status = 'visible'
      and c.is_hidden = false
      and c.district_id is not null
      and c.user_id is not null
      and pe.status in ('upcoming', 'live', 'replay')
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
    join public.podcast_events pe on pe.id = c.event_id
    join public.comment_likes cl on cl.comment_id = c.id
    where c.moderation_status = 'visible'
      and c.is_hidden = false
      and c.district_id is not null
      and c.user_id is not null
      and pe.status in ('upcoming', 'live', 'replay')
      and cl.created_at >= target_week
      and cl.created_at < target_week + interval '7 days'
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
      and es.user_id is not null
      and pe.status in ('upcoming', 'live', 'replay')
      and es.created_at >= target_week
      and es.created_at < target_week + interval '7 days'
    group by pe.district_id, es.user_id
  ),
  active_users as (
    select district_id, user_id from comment_stats
    union
    select district_id, user_id from like_stats
    union
    select district_id, user_id from share_stats
  ),
  scoring_settings as (
    select
      comment_weight,
      like_weight,
      share_weight,
      featured_weight
    from (
      select
        0 as priority,
        coalesce((value->>'comment_weight')::numeric, 1) as comment_weight,
        coalesce((value->>'like_weight')::numeric, 3) as like_weight,
        coalesce((value->>'share_weight')::numeric, 2) as share_weight,
        coalesce((value->>'featured_weight')::numeric, 10) as featured_weight
      from public.admin_settings
      where key = 'engagement_scoring'
      union all
      select 1 as priority, 1::numeric, 3::numeric, 2::numeric, 10::numeric
    ) configured_scoring_settings
    order by priority
    limit 1
  ),
  score_base as (
    select
      au.district_id,
      au.user_id,
      coalesce(p.display_name, 'Community member') as display_name,
      coalesce(cs.comments_count, 0)::int as comments_count,
      coalesce(ls.likes_received_count, 0)::int as likes_received_count,
      coalesce(ss.shares_count, 0)::int as shares_count,
      coalesce(cs.featured_comments_count, 0)::int as featured_comments_count,
      (
        coalesce(ls.likes_received_count, 0) * weights.like_weight +
        coalesce(cs.comments_count, 0) * weights.comment_weight +
        coalesce(ss.shares_count, 0) * weights.share_weight +
        coalesce(cs.featured_comments_count, 0) * weights.featured_weight
      )::numeric as engagement_score
    from active_users au
    cross join scoring_settings weights
    join public.profiles p on p.id = au.user_id
    left join comment_stats cs on cs.district_id = au.district_id and cs.user_id = au.user_id
    left join like_stats ls on ls.district_id = au.district_id and ls.user_id = au.user_id
    left join share_stats ss on ss.district_id = au.district_id and ss.user_id = au.user_id
  ),
  ranked as (
    select
      score_base.*,
      row_number() over (partition by score_base.district_id order by score_base.engagement_score desc, score_base.display_name asc, score_base.user_id asc) as rank
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
grant execute on function public.refresh_weekly_district_influencer_scores(date) to authenticated;
