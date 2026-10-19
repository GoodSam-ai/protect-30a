create table public.correspondence_cases (
 reference text primary key, title text not null, recipient text not null,
 provider_email_id text not null unique, delivery_status text not null default 'pending',
 acknowledged_at timestamptz, council_status text not null default 'Pending — not confirmed',
 direction_adopted_at timestamptz, notes text, created_at timestamptz not null default now()
);
create table public.correspondence_events (
 id text primary key, provider_email_id text not null, event_type text not null,
 occurred_at timestamptz not null, sender text, recipients jsonb not null default '[]'::jsonb,
 subject text, recorded_at timestamptz not null default now()
);
create index correspondence_events_email_time on public.correspondence_events(provider_email_id, occurred_at desc);
alter table public.correspondence_cases enable row level security;
alter table public.correspondence_events enable row level security;
revoke all on public.correspondence_cases, public.correspondence_events from anon, authenticated;
grant all on public.correspondence_cases, public.correspondence_events to service_role;
