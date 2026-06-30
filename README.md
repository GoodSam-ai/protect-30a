# Protect30A

Community stormwater plan and live engagement platform for South Walton's 30A corridor.

**Live site:** https://protect30a.org/

`https://protect30a.org` remains the canonical production URL until Protect38
domains are configured in Vercel.

## Routes

- `/`: legacy Protect30A homepage served from `public/legacy/index.html`.
- `/show`: legacy show page served from `public/legacy/show/index.html`.
- `/live`: active live engagement experience for the current event.
- `/live/[slug]`: live engagement experience for a specific event slug.
- `/admin`: moderation, event, scoring, badge, export, and manual Facebook
  import tools for admin/moderator profiles.

## Development

```bash
npm install
npm run dev
```

The current homepage and `/show` page are preserved as legacy static HTML under
`public/legacy/` and served through Next.js rewrites. New interactive routes run
through the Next.js app router.

## Environment Setup

Use `.env.example` as the source of required local variables. Copy it to
`.env.local`, then fill in Supabase, auth provider, and feature-flag values for
your local environment.

The production Vercel project is `protect-30a`. Configure the same environment
variable names there for Production, Preview, and Development as appropriate.
Keep `NEXT_PUBLIC_SITE_URL=https://protect30a.org` and
`NEXT_PUBLIC_CANONICAL_DOMAIN=protect30a.org` for production until Protect38
domains are added to Vercel.

Detailed setup and release notes:

- [Supabase setup](docs/setup/supabase.md)
- [Auth provider setup](docs/setup/auth-providers.md)
- [Facebook Groups integration](docs/integrations/facebook-groups.md)
