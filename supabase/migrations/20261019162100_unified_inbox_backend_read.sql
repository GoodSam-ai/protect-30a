-- Backend-only read access required by the security-invoker inbox view.
grant select on public.comments,public.comment_reports,public.event_shares to service_role;
