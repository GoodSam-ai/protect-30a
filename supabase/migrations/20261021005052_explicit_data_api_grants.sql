-- Explicit Data API permissions: grants and RLS are independent.
-- October 30 changes future object defaults; existing objects retain grants.
begin;
grant select on table public.districts to service_role;
grant select on table public.profiles to service_role;
grant select, update on table public.podcast_events to service_role;
grant select, insert, update on table public.comments to service_role;
grant select on table public.comment_likes to service_role;
grant select on table public.comment_reports to service_role;
grant select on table public.event_shares to service_role;
grant select, insert, update on table public.admin_settings to service_role;
grant insert on table public.audit_log to service_role;
-- Existing RLS policies restrict reads to admins and inserts to moderators.
grant select, insert on table public.audit_log to authenticated;
commit;
