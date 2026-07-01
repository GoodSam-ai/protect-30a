grant usage on schema public to anon, authenticated;

create or replace function public.public_profile_display_name(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select profiles.display_name
  from public.profiles profiles
  where profiles.id = target_user_id;
$$;

create or replace function public.public_profile_avatar_url(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select profiles.avatar_url
  from public.profiles profiles
  where profiles.id = target_user_id;
$$;

revoke all on function public.public_profile_display_name(uuid) from public, anon, authenticated;
revoke all on function public.public_profile_avatar_url(uuid) from public, anon, authenticated;
grant execute on function public.public_profile_display_name(uuid) to anon, authenticated;
grant execute on function public.public_profile_avatar_url(uuid) to anon, authenticated;

grant select (
  id,
  event_id,
  district_id,
  user_id,
  parent_comment_id,
  body,
  topic,
  external_source_author,
  is_hidden,
  is_featured,
  moderation_status,
  created_at
) on public.comments to anon;

grant select (id, comment_id, user_id) on public.comment_likes to anon;
grant select (id, event_id, user_id) on public.event_shares to anon;
grant select on table public.district_influencer_scores to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'public read visible comments'
  ) then
    create policy "public read visible comments"
      on public.comments
      for select
      to anon, authenticated
      using (
        moderation_status = 'visible'
        and is_hidden = false
        and exists (
          select 1
          from public.podcast_events pe
          where pe.id = comments.event_id
            and pe.status in ('upcoming', 'live', 'replay')
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comment_likes'
      and policyname = 'public read visible comment likes'
  ) then
    create policy "public read visible comment likes"
      on public.comment_likes
      for select
      to anon, authenticated
      using (public.can_engage_with_comment(comment_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_shares'
      and policyname = 'public read public event shares'
  ) then
    create policy "public read public event shares"
      on public.event_shares
      for select
      to anon, authenticated
      using (public.can_share_event(event_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'district_influencer_scores'
      and policyname = 'public read district influencer scores'
  ) then
    create policy "public read district influencer scores"
      on public.district_influencer_scores
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

alter view public.public_profiles set (security_invoker = true);

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
  coalesce(public.public_profile_display_name(c.user_id), c.external_source_author) as display_name,
  public.public_profile_avatar_url(c.user_id) as avatar_url,
  d.name as district_name,
  coalesce(likes.like_count, 0)::int as like_count,
  coalesce(replies.reply_count, 0)::int as reply_count
from public.comments c
join public.podcast_events pe on pe.id = c.event_id
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
  public.public_profile_display_name(active_users.user_id) as display_name,
  public.public_profile_avatar_url(active_users.user_id) as avatar_url,
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
  public.public_profile_display_name(scores.user_id) as display_name,
  public.public_profile_avatar_url(scores.user_id) as avatar_url,
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
left join top_weekly_comments on top_weekly_comments.week_start = scores.week_start
  and top_weekly_comments.district_id = scores.district_id
  and top_weekly_comments.user_id = scores.user_id;

alter view public.live_event_metrics set (security_invoker = true);
alter view public.event_district_engagement_scores set (security_invoker = true);

grant select on public.visible_comments,
  public.top_comments_for_event,
  public.top_commenters_for_event,
  public.weekly_district_influencers,
  public.live_event_metrics,
  public.event_district_engagement_scores
to anon, authenticated;
