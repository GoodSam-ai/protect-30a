create table if not exists public.action_center_submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint action_center_submissions_form_type_check
    check (form_type in ('pledge', 'rsvp', 'signup')),
  constraint action_center_submissions_fields_object_check
    check (jsonb_typeof(fields) = 'object')
);

create index if not exists action_center_submissions_form_created_idx
  on public.action_center_submissions (form_type, created_at desc);

alter table public.action_center_submissions enable row level security;

revoke all on table public.action_center_submissions from public, anon, authenticated;
grant select, insert on table public.action_center_submissions to service_role;

comment on table public.action_center_submissions is
  'Private Action Center intake. Public access is denied; sanitized pledge-wall output is served by the service-role API.';
