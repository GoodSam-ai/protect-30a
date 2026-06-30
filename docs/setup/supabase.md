# Supabase Setup

This repository expects a Supabase project for auth, live engagement data, and
admin moderation. The local repo currently includes migrations under
`supabase/migrations/`, but it does not have the Supabase CLI installed locally
and it does not have a linked `supabase/config.toml`. Do not assume the remote
project already exists or is linked.

## 1. Create the project

1. In Supabase, create a new project under **PerpetualRoyalty's Org**.
2. Choose the production project name that matches the Vercel project, for
   example `protect-30a`.
3. After the project is ready, copy these values from Project Settings > API:
   - Project URL
   - Anon public key
   - Service role key

The service role key is a server secret. Store it only in server environments as
`SUPABASE_SERVICE_ROLE_KEY`; never expose it as `NEXT_PUBLIC_...` and never use
it in browser code.

## 2. Configure Environment Variables

Copy `.env.example` to `.env.local` for local development and fill in the
Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Use the same names in the Vercel project **protect-30a**:

- `NEXT_PUBLIC_SUPABASE_URL`: Production, Preview, and Development.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Production, Preview, and Development.
- `SUPABASE_SERVICE_ROLE_KEY`: server environments only. It is safe to set in
  Vercel Production and Preview because it is not prefixed with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SITE_URL`: keep `https://protect30a.org` for production.
- `NEXT_PUBLIC_CANONICAL_DOMAIN`: keep `protect30a.org` for production.
- `BOOTSTRAP_ADMIN_EMAIL`: keep `doug@goodsam.ai`.

`https://protect30a.org` is the canonical production URL until Protect38
domains are configured in Vercel. Treat Protect38 domains as future deployment
targets, not current canonical domains.

## 3. Link the Supabase CLI

Install the Supabase CLI before running Supabase commands. This repo currently
does not provide an installed CLI binary.

After the remote project exists, link the local repo to it:

```bash
supabase link --project-ref <project-ref>
```

This should create local Supabase link metadata. If `supabase/config.toml` is
still absent, initialize or repair the local Supabase project before applying
migrations.

## 4. Apply Migrations

Once linked, apply the checked-in migrations:

```bash
supabase db push
```

Review the SQL output before confirming. The initial live engagement migration
creates the tables, policies, seed data, scoring settings, and admin support
needed by `/live`, `/live/[slug]`, and `/admin`.

## 5. Bootstrap the First Admin

After deployment, sign in once as `doug@goodsam.ai` so Supabase creates the auth
user and application profile. Then bootstrap that profile as admin:

```sql
update profiles
set role = 'admin'
where email = 'doug@goodsam.ai';
```

Run this from the Supabase SQL editor or another trusted server-side database
connection. After the role update, `doug@goodsam.ai` can access `/admin`.

