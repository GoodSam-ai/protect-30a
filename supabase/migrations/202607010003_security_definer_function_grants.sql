create or replace function public.can_create_comment(
  target_event_id uuid,
  target_parent_comment_id uuid,
  target_district_id uuid
)
returns boolean
language sql
stable
security invoker
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

create or replace function public.can_engage_with_comment(target_comment_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.comments c
    join public.podcast_events pe on pe.id = c.event_id
    where c.id = target_comment_id
      and c.moderation_status = 'visible'
      and c.is_hidden = false
      and c.user_id is distinct from auth.uid()
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
security invoker
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
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.podcast_events pe
    where pe.id = target_event_id
      and pe.status in ('upcoming', 'live', 'replay')
  );
$$;

revoke all on function public.can_create_comment(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.can_engage_with_comment(uuid) from public, anon, authenticated;
revoke all on function public.can_report_comment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.can_share_event(uuid) from public, anon, authenticated;

grant execute on function public.can_create_comment(uuid, uuid, uuid) to authenticated;
grant execute on function public.can_engage_with_comment(uuid) to anon, authenticated;
grant execute on function public.can_report_comment(uuid, uuid) to authenticated;
grant execute on function public.can_share_event(uuid) to anon, authenticated;

grant select (id, display_name, avatar_url) on public.profiles to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'public read visible participant profiles'
  ) then
    create policy "public read visible participant profiles"
      on public.profiles
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.comments c
          join public.podcast_events pe on pe.id = c.event_id
          where c.user_id = profiles.id
            and c.moderation_status = 'visible'
            and c.is_hidden = false
            and pe.status in ('upcoming', 'live', 'replay')
        )
        or exists (
          select 1
          from public.district_influencer_scores scores
          where scores.user_id = profiles.id
        )
      );
  end if;
end
$$;

create or replace view public.visible_comments
with (security_invoker = true) as
select
  c.id,
  c.event_id,
  c.district_id,
  c.parent_comment_id,
  c.body,
  c.topic,
  c.is_featured,
  c.created_at,
  coalesce(p.display_name, c.external_source_author) as display_name,
  p.avatar_url,
  d.name as district_name,
  coalesce(likes.like_count, 0)::int as like_count,
  coalesce(replies.reply_count, 0)::int as reply_count
from public.comments c
join public.podcast_events pe on pe.id = c.event_id
left join public.profiles p on p.id = c.user_id
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

create or replace view public.top_comments_for_event
with (security_invoker = true) as
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

create or replace view public.top_commenters_for_event
with (security_invoker = true) as
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
    and cl.user_id is distinct from c.user_id
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
    select
      cl.comment_id,
      count(*)::int as like_count
    from public.comment_likes cl
    join public.comments liked_comment on liked_comment.id = cl.comment_id
    where cl.user_id is distinct from liked_comment.user_id
    group by cl.comment_id
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
left join public.profiles p on p.id = active_users.user_id
left join comment_stats cs on cs.event_id = active_users.event_id and cs.user_id = active_users.user_id
left join like_stats ls on ls.event_id = active_users.event_id and ls.user_id = active_users.user_id
left join share_stats ss on ss.event_id = active_users.event_id and ss.user_id = active_users.user_id
left join top_comment_stats tcs on tcs.event_id = active_users.event_id and tcs.user_id = active_users.user_id;

create or replace view public.weekly_district_influencers
with (security_invoker = true) as
with top_weekly_comments as (
  select distinct on (c.district_id, c.user_id, date_trunc('week', c.created_at)::date)
    date_trunc('week', c.created_at)::date as week_start,
    c.district_id,
    c.user_id,
    c.body as top_comment_text
  from public.comments c
  join public.podcast_events pe on pe.id = c.event_id
  left join (
    select
      cl.comment_id,
      count(*)::int as like_count
    from public.comment_likes cl
    join public.comments liked_comment on liked_comment.id = cl.comment_id
    where cl.user_id is distinct from liked_comment.user_id
    group by cl.comment_id
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
left join public.profiles profiles on profiles.id = scores.user_id
left join top_weekly_comments on top_weekly_comments.week_start = scores.week_start
  and top_weekly_comments.district_id = scores.district_id
  and top_weekly_comments.user_id = scores.user_id;

drop function if exists public.public_profile_display_name(uuid);
drop function if exists public.public_profile_avatar_url(uuid);

do $$
declare
  exposed_function regprocedure;
begin
  for exposed_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      exposed_function
    );
  end loop;
end
$$;
