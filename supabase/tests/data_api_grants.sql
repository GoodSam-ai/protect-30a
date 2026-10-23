-- Synthetic disposable database only. No automatic table/sequence grants.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth, public to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
\ir ../migrations/202606260001_live_engagement.sql
\ir ../migrations/202607010001_live_engagement_public_read_grants.sql
\ir ../migrations/202607010002_security_invoker_public_views.sql
\ir ../migrations/202607010003_security_definer_function_grants.sql
\ir ../migrations/202607010004_remove_direct_admin_rls_helpers.sql
\ir ../migrations/20260710161229_action_center_submissions.sql
\ir ../migrations/20260710161235_close_expired_event_comments.sql
\ir ../migrations/20261019152657_correspondence_tracking.sql
\ir ../migrations/20261019162000_unified_intake.sql
\ir ../migrations/20261019162100_unified_inbox_backend_read.sql
\ir ../migrations/20261019180000_email_history.sql
\ir ../migrations/20261019181000_public_records_register.sql
\ir ../migrations/20261019182000_mail_history_provenance.sql
\ir ../migrations/20261021005052_explicit_data_api_grants.sql

do $$ begin
if not (select relrowsecurity from pg_class where oid='public.districts'::regclass) then raise exception 'RLS disabled: districts'; end if;
if not has_table_privilege('service_role','public.districts','select') then raise exception 'Missing service_role select: districts'; end if;
if not (select relrowsecurity from pg_class where oid='public.profiles'::regclass) then raise exception 'RLS disabled: profiles'; end if;
if not has_table_privilege('service_role','public.profiles','select') then raise exception 'Missing service_role select: profiles'; end if;
if not (select relrowsecurity from pg_class where oid='public.podcast_events'::regclass) then raise exception 'RLS disabled: podcast_events'; end if;
if not has_table_privilege('service_role','public.podcast_events','select') then raise exception 'Missing service_role select: podcast_events'; end if;
if not has_table_privilege('service_role','public.podcast_events','update') then raise exception 'Missing service_role update: podcast_events'; end if;
if not (select relrowsecurity from pg_class where oid='public.comments'::regclass) then raise exception 'RLS disabled: comments'; end if;
if not has_table_privilege('service_role','public.comments','select') then raise exception 'Missing service_role select: comments'; end if;
if not has_table_privilege('service_role','public.comments','insert') then raise exception 'Missing service_role insert: comments'; end if;
if not has_table_privilege('service_role','public.comments','update') then raise exception 'Missing service_role update: comments'; end if;
if not (select relrowsecurity from pg_class where oid='public.comment_likes'::regclass) then raise exception 'RLS disabled: comment_likes'; end if;
if not has_table_privilege('service_role','public.comment_likes','select') then raise exception 'Missing service_role select: comment_likes'; end if;
if not (select relrowsecurity from pg_class where oid='public.comment_reports'::regclass) then raise exception 'RLS disabled: comment_reports'; end if;
if not has_table_privilege('service_role','public.comment_reports','select') then raise exception 'Missing service_role select: comment_reports'; end if;
if not (select relrowsecurity from pg_class where oid='public.event_shares'::regclass) then raise exception 'RLS disabled: event_shares'; end if;
if not has_table_privilege('service_role','public.event_shares','select') then raise exception 'Missing service_role select: event_shares'; end if;
if not (select relrowsecurity from pg_class where oid='public.admin_settings'::regclass) then raise exception 'RLS disabled: admin_settings'; end if;
if not has_table_privilege('service_role','public.admin_settings','select') then raise exception 'Missing service_role select: admin_settings'; end if;
if not has_table_privilege('service_role','public.admin_settings','insert') then raise exception 'Missing service_role insert: admin_settings'; end if;
if not has_table_privilege('service_role','public.admin_settings','update') then raise exception 'Missing service_role update: admin_settings'; end if;
if not (select relrowsecurity from pg_class where oid='public.audit_log'::regclass) then raise exception 'RLS disabled: audit_log'; end if;
if not has_table_privilege('service_role','public.audit_log','insert') then raise exception 'Missing service_role insert: audit_log'; end if;
end $$;
-- A future public table must declare an access model, not rely on defaults.
do $$ declare missing text; begin
 select string_agg(c.relname,', ') into missing from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p') and not exists (
  select 1 from unnest(array['anon','authenticated','service_role']) r
  where has_any_column_privilege(r,c.oid,'SELECT,INSERT,UPDATE') or has_table_privilege(r,c.oid,'DELETE')
 );
 if missing is not null then raise exception 'Public tables without declared Data API grants: %',missing; end if;
end $$;
-- Public reads stay available; sensitive intake stays closed.
do $$ begin
 if not has_table_privilege('anon','public.districts','SELECT') then raise exception 'Public districts broken'; end if;
 if not has_table_privilege('anon','public.visible_comments','SELECT') then raise exception 'Public comments broken'; end if;
 if has_table_privilege('anon','public.records_requests','SELECT') or has_table_privilege('authenticated','public.records_requests','SELECT') then raise exception 'Records exposed'; end if;
end $$;
set role service_role;
select count(*) from public.profiles;
insert into public.admin_settings(key,value) values ('engagement_scoring','{}') on conflict(key) do update set value=excluded.value;
update public.admin_settings set value='{"tested":true}' where key='engagement_scoring';
reset role;
