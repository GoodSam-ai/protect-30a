create table public.records_requests (
 reference text primary key, title text not null, agency text not null, recipient text not null,
 recipient_verified boolean not null default false, original_sender text not null,
 requested_at timestamptz not null, source_url text, source_message_id text,
 status text not null default 'sent' check(status in ('sent','acknowledged','partial_response','clarification_needed','completed','denied','withdrawn')),
 next_followup_on date, followup_enabled boolean not null default false,
 notes text not null default '', updated_at timestamptz not null default now()
);
create table public.records_replies (
 source_key text primary key, request_reference text references public.records_requests(reference),
 received_at timestamptz not null, subject text not null, summary text not null, source_url text,
 reviewed boolean not null default false
);
create table public.records_followups (
 request_reference text not null references public.records_requests(reference), due_on date not null,
 state text not null check(state in ('claimed','sent','failed','review_required')),
 provider_email_id text, claimed_at timestamptz not null default now(), sent_at timestamptz,
 primary key(request_reference,due_on)
);
alter table public.records_requests enable row level security;
alter table public.records_replies enable row level security;
alter table public.records_followups enable row level security;
revoke all on public.records_requests,public.records_replies,public.records_followups from public,anon,authenticated;
grant select,insert,update on public.records_requests,public.records_replies,public.records_followups to service_role;
create view public.records_followup_candidates with (security_invoker=true) as
select r.* from public.records_requests r where followup_enabled and recipient_verified
and next_followup_on <= (now() at time zone 'America/Chicago')::date
and status in ('sent','acknowledged','partial_response')
and not exists (select 1 from public.records_replies p where p.request_reference=r.reference and not p.reviewed)
and not exists (select 1 from public.records_replies p where p.request_reference is null and not p.reviewed)
and not exists (select 1 from public.records_followups f where f.request_reference=r.reference and f.due_on=r.next_followup_on);
revoke all on public.records_followup_candidates from public,anon,authenticated;
grant select on public.records_followup_candidates to service_role;
