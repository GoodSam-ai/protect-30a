create table public.email_history (
 id text primary key check(id ~ '^[a-f0-9]{64}$'), message_id text not null unique,
 sent_at timestamptz not null, sender text not null, recipients jsonb not null,
 subject text not null, body text not null default '', attachments jsonb not null default '[]',
 content_sha256 text not null, raw_sha256 text not null, raw_mime_base64 text not null,
 source_account text not null, imported_at timestamptz not null default now()
);
alter table public.email_history enable row level security;
revoke all on public.email_history from public,anon,authenticated;
grant select,insert on public.email_history to service_role;
create index email_history_sent_at on public.email_history(sent_at desc);
alter table public.correspondence_events add column rfc_message_id text;
create or replace view public.unified_intake with (security_invoker=true) as
with source_rows as (
 select 'contact_submissions'::text as source_table,id::text as source_id,created_at,to_jsonb(s) as details from public.contact_submissions s
 union all select 'action_center_submissions',id::text,created_at,to_jsonb(s) from public.action_center_submissions s
 union all select 'comments',id::text,created_at,to_jsonb(s) from public.comments s
 union all select 'comment_reports',id::text,created_at,to_jsonb(s) from public.comment_reports s
 union all select 'event_shares',id::text,created_at,to_jsonb(s) from public.event_shares s
 union all select 'email_history',id,sent_at,to_jsonb(s)-'raw_mime_base64' from public.email_history s
 union all select 'correspondence_events',id,occurred_at,to_jsonb(s) from public.correspondence_events s where not exists (select 1 from public.email_history h where h.message_id=s.rfc_message_id)
 union all select 'correspondence_cases',reference,created_at,to_jsonb(s) from public.correspondence_cases s
), normalized as (
 select source_table||':'||source_id as id,source_table,source_id,created_at,details,
 case when (source_table like 'correspondence_%' or source_table='email_history') then 'email' else 'website' end as channel,
 case source_table
 when 'email_history' then 'mail_history'
 when 'contact_submissions' then details->>'category'
 when 'action_center_submissions' then details->>'form_type'
 when 'comments' then 'comment' when 'comment_reports' then 'moderation' when 'event_shares' then 'engagement'
 when 'correspondence_events' then case when details->>'event_type'='email.received' then 'inbound_email' else 'email_delivery' end
 else 'official_correspondence' end as category,
 case source_table when 'email_history' then '/admin/mail' when 'contact_submissions' then details->>'source_path'
 when 'action_center_submissions' then '/act'
 when 'comments' then '/live' when 'comment_reports' then '/live' when 'event_shares' then '/live'
 else '/admin/correspondence' end as source_path,
 coalesce(details->>'subject',details->>'title',details->>'topic',details->>'form_type',details->>'reason',details->>'platform','Community submission') as subject,
 coalesce(details->>'name',details->'fields'->>'first') as contact_name,
 coalesce(details->>'email',details->'fields'->>'email',details->>'sender') as contact_email,
 case when source_table='contact_submissions' then jsonb_build_object('contact',details->'consent_contact','updates',details->'consent_updates')
 when source_table='action_center_submissions' then jsonb_strip_nulls(jsonb_build_object('updates',details->'fields'->'consent','reminder',details->'fields'->'consentReminder','public',details->'fields'->'consentPublic','records',details->'fields'->'consentRecords'))
 else '{}'::jsonb end as consent
 from source_rows
)
select n.*,coalesce(a.status,'new') as status,coalesce(a.owner,'') as owner,coalesce(a.notes,'') as notes,a.due_at,
 greatest(n.created_at,(n.details->>'updated_at')::timestamptz,a.updated_at) as updated_at,
 md5(n.id||n.details::text||coalesce(to_jsonb(a)::text,'')) as automation_key
from normalized n left join public.intake_assignments a on a.source_key=n.id;
revoke all on public.unified_intake from public,anon,authenticated;
grant select on public.unified_intake to service_role;
comment on view public.unified_intake is 'Private read-only normalized inbox. Originals stay authoritative; automation_key identifies the current revision, not a complete transition history.';
