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
      and (
        pe.status = 'live'
        or (
          pe.status = 'upcoming'
          and (
            coalesce(pe.ends_at, pe.starts_at) is null
            or coalesce(pe.ends_at, pe.starts_at) >= now()
          )
        )
      )
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

revoke all on function public.can_create_comment(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.can_create_comment(uuid, uuid, uuid)
  to authenticated;
