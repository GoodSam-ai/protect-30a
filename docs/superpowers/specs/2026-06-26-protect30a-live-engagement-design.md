# Protect30A Live Podcast Engagement System Design

Date: 2026-06-26
Repository: `GoodSam-ai/protect-30a`
Vercel project: `protect-30a`
Current canonical domain: `https://protect30a.org`

## Summary

Migrate the current static Protect30A site into a real Next.js App Router application backed by Supabase. Preserve the existing homepage and `/show` page as closely as possible, then add a live podcast engagement system on new routes.

The public brand remains Protect30A for the first release. The system should be configured so a future Protect38 canonical domain and brand change can be made through centralized site configuration after Protect38 domains are configured in Vercel.

## Approved Direction

Use the recommended full migration approach:

- Port the current static homepage from `index.html` to `/`.
- Port the current static show page from `show/index.html` to `/show`.
- Add `/live` for the active or current event.
- Add `/live/[event-slug]` for specific events.
- Add `/admin` for admins and moderators.
- Use Supabase for auth, Postgres, RLS, realtime, and engagement data.
- Use Vercel as the deployment target.
- Keep `https://protect30a.org` canonical until Protect38 domains are configured.
- Preserve existing Protect30A `.com` and `www` redirects/aliases to the canonical `.org` domain.

## Product Principles

The live podcast experience is community education and conversation, not a government meeting, official public board meeting, or decision-making body.

The opening disclaimer must appear in the podcast experience:

> Let me make this crystal clear: this podcast is purely for community education and conversation. We're not a government body, nor are we making any official decisions. We're committed to full transparency, because we believe that open information builds community trust.

The interface should feel local, trustworthy, clean, mobile-first, easy for older residents to use, and fast during a live event.

## Architecture

Use Next.js App Router with TypeScript.

Core structure:

- `app/page.tsx`: port of current homepage.
- `app/show/page.tsx`: port of current show page.
- `app/live/page.tsx`: active live event page.
- `app/live/[slug]/page.tsx`: event-specific live page.
- `app/admin/page.tsx` and nested admin routes as needed.
- `lib/supabase`: browser and server Supabase clients.
- `lib/site-config`: canonical URL, brand labels, domain aliases, feature flags.
- `lib/live-engagement`: queries, mutations, realtime/polling logic.
- `components/live`: public event, feed, dashboard, leaderboard, share, composer, and auth UI.
- `components/admin`: event setup, moderation, import, export, and scoring controls.
- `supabase/migrations`: schema, RLS, functions, views, and seed data.
- `docs`: setup, auth provider, Facebook/Meta integration, and release notes.

Supabase project creation/connection is part of the migration. The project should be created in "PerpetualRoyalty's Org". Because no Supabase connector is available in this Codex session, implementation should use Supabase CLI and/or dashboard steps and document them.

Bootstrap admin email: `doug@goodsam.ai`.

## Routes

`/`

- Preserve current Protect30A homepage content, design, metadata, and behavior as closely as possible.

`/show`

- Preserve current show page content, design, metadata, Spotify/YouTube links, district overview, sponsor sections, and community framing as closely as possible.

`/live`

- Resolve and display the current active event. If no event is live, show the next upcoming event or the most recent replay with clear status.

`/live/[event-slug]`

- Display a specific podcast event by slug.

`/admin`

- Role-gated admin and moderation workspace.

## Live Experience Layout

Use the "Resident Live Room" layout.

Desktop layout:

- Main column:
  - event title, district, status, and date/time
  - live player or replay placeholder
  - opening disclaimer
  - login state and comment composer
  - live comment feed
- Side column:
  - share panel
  - simple trend dashboard
  - leaderboard
  - district selector/context

Mobile layout order:

1. Event status and live player
2. Opening disclaimer
3. Share prompt
4. Login/comment composer
5. Comment feed
6. Dashboard toggle
7. Leaderboard
8. District navigation

Public visitors can read event details, visible comments, top comments, and leaderboards. Login is required to comment, like/unlike, report, and create share-count events.

## Components

Build these public components:

- `LivePodcastPage`
- `DistrictSelector`
- `CommentComposer`
- `LiveCommentFeed`
- `LikeButton`
- `EngagementDashboard`
- `InfluencerLeaderboard`
- `SharePanel`

Build these admin components:

- `AdminModerationPanel`
- `EventEditor`
- `ReportedCommentsQueue`
- `ManualFacebookImport`
- `EngagementExport`
- `ScoringSettings`
- `BadgeSettings`

## Authentication

Use Supabase Auth.

Initial release providers:

- Email magic link
- Google
- Apple
- Facebook
- LinkedIn
- TikTok through TikTok Login Kit/custom OAuth
- Instagram through Meta's supported Instagram Login/API path for eligible Business/Creator accounts

Regular residents must still be able to log in through Google, Apple, Facebook, LinkedIn, TikTok, or email magic link if they do not have eligible Instagram Business/Creator accounts.

TikTok and Instagram are part of the v1 implementation. Provider availability should still be controlled by environment flags so deployment can fail closed if credentials, review, or platform eligibility are not ready in a specific environment.

The profile table uses Supabase user ids as profile ids. Identity linking should use Supabase Auth behavior where possible, with setup docs calling out same-email linking expectations and provider callback URL testing.

Never expose service-role keys in browser code.

## Data Model

Create Supabase migrations for these tables and related constraints:

- `districts`
- `profiles`
- `podcast_events`
- `comments`
- `comment_likes`
- `comment_reports`
- `event_shares`
- `district_influencer_scores`
- `audit_log`

Additional config tables may be added during implementation if they keep behavior editable without hard-coding:

- `engagement_settings`
- `badge_definitions`
- `event_settings`

Seed eight placeholder districts based on the current show page:

1. Inlet Beach
2. Rosemary Beach
3. Alys Beach
4. Watersound
5. Seagrove
6. Grayton Beach
7. Santa Rosa Beach
8. Sandestin

District names and descriptions must be editable from admin.

## RLS And Security

Enable Row Level Security on all public Supabase tables.

Policy intent:

- Anyone can read visible districts.
- Anyone can read public upcoming/live/replay events.
- Anyone can read visible comments and public leaderboard aggregates.
- Logged-in users can insert their own comments.
- Logged-in users can like/unlike comments as themselves.
- Logged-in users can report comments as themselves.
- Users cannot directly set moderation fields such as `is_hidden`, `is_featured`, or `moderation_status`.
- Admins and moderators can hide, unhide, feature, remove, import, and moderate comments.
- Admins can manage podcast events, districts, settings, and scoring.
- Admins can view audit logs.
- Regular users cannot view private moderation metadata.

Add server-side validation through Next.js route handlers or Supabase RPC/functions for operations that should not rely only on the frontend.

## Commenting And Moderation

Comments appear immediately after a logged-in user posts.

Rules:

- Minimum length default: 5 characters.
- Maximum length default: 500 characters.
- Optional topic tag:
  - Stormwater
  - Traffic
  - Beach access
  - Mosquito control
  - Public safety
  - Growth/development
  - Parking
  - Environment
  - Other
- Prevent duplicate rapid posting.
- Add a profanity/spam moderation hook.
- Include a community guidelines link near the composer.

Moderation is post-publication:

- report
- hide/unhide
- feature/unfeature
- remove
- lock thread
- restrict or ban user
- assign user to district
- mark user as potential podcast guest
- audit every admin/moderator action

## Realtime And Polling

Implement `useLiveEngagement(eventId, options)`.

Modes:

- `auto`
- `realtime`
- `polling`
- `low-bandwidth`

Default mode: `auto`.

In `auto` mode, subscribe to Supabase Realtime first. If the subscription fails, disconnects repeatedly, or appears stale beyond a configured heartbeat interval, switch to polling.

Default polling interval: `5000ms`.

Realtime or polling must update:

- new comments
- hidden/removed comments
- like counts
- featured comments
- leaderboard ranks
- event status changes
- dashboard metrics

Switching between modes must not duplicate comments.

## Dashboard And Leaderboards

The dashboard supports two views:

Simple Trend View:

- live viewers if available
- total comments
- total likes
- total shares
- comments per minute
- top topics
- engagement score by district

Detailed Leaderboard View:

- most liked comments
- top commenters for current event
- top commenters for current district
- top weekly influencers
- running district leaderboard
- topic leaderboard

Create SQL views, RPCs, or API routes for:

- `top_comments_for_event`
- `top_commenters_for_event`
- `weekly_district_influencers`

Initial scoring formula:

```text
engagement_score =
  likes_received_count * 3 +
  comments_count * 1 +
  shares_count * 2 +
  featured_comments_count * 10
```

The leaderboard should promote quality engagement, not spam. Do not reward raw comment volume too heavily.

Weekly influencer scores can be refreshed by a Supabase SQL function/RPC in v1. Scheduling can use Supabase cron or an admin-triggered refresh, documented during implementation.

## Sharing

Add visible sharing on `/live`.

Share options:

- copy link
- SMS/text
- email
- Facebook
- LinkedIn
- X/Twitter if enabled
- Instagram instructions/share path where direct web sharing is limited
- TikTok instructions/share path where direct web sharing is limited

Track shares in `event_shares` for logged-in users.

Default share copy:

```text
Protect30A is live right now discussing issues that affect our district. Join the conversation, comment, and help shape what gets discussed next.
```

Add mobile sticky "Share Live Podcast" behavior if it does not obscure the composer or feed.

## Facebook Group Integration

Do not build unauthorized Facebook Group scraping.

V1 includes:

- manual curation mode for moderators to paste/import highlighted Facebook Group comments
- share-back mode with share buttons and prewritten copy

Official API mode should be documented and feature-flagged. Use Meta Graph API or Webhooks only where permissions, review, and platform rules allow.

The integration README must note the no-scraping rule and Meta Groups API limitations/deprecations, including the April 22, 2024 changes to Groups API permissions/features.

## Environment Variables

Include `.env.example` with at least:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=https://protect30a.org
NEXT_PUBLIC_BRAND_NAME=Protect30A
NEXT_PUBLIC_CANONICAL_DOMAIN=protect30a.org

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=

FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

ENABLE_TIKTOK_LOGIN=true
ENABLE_INSTAGRAM_LOGIN=true
ENABLE_FACEBOOK_GROUP_API=false
DEFAULT_REALTIME_MODE=auto
POLLING_INTERVAL_MS=5000
```

## Accessibility

Requirements:

- keyboard-accessible buttons
- clear labels
- sufficient contrast
- ARIA labels for live regions
- screen-reader-friendly updates
- no aggressive auto-scroll unless user opts in
- respect reduced motion preferences
- mobile tap targets suitable for older residents

## Testing

Cover:

- TypeScript and lint/build checks
- Supabase migration syntax
- RLS policy review and smoke tests
- anonymous read access for visible events/comments/leaderboards
- logged-in comment creation
- duplicate/rate-limit behavior
- like/unlike uniqueness and rollback behavior
- report comment flow
- admin moderation flow
- manual Facebook import
- CSV export
- leaderboard queries
- weekly influencer refresh
- realtime subscription behavior
- polling fallback behavior
- mobile layouts for `/`, `/show`, `/live`, and `/admin`
- canonical and redirect behavior on `protect30a.org`

## Release Plan

1. Create the Next.js app structure inside the existing repo.
2. Port `/` and `/show` closely from the current static HTML pages.
3. Add Supabase project setup docs and local env examples.
4. Add migrations, RLS, seed data, views/RPCs, and bootstrap admin handling.
5. Add auth providers and provider configuration docs.
6. Build `/live` and `/live/[event-slug]`.
7. Build `/admin`.
8. Wire realtime and polling fallback.
9. Configure Vercel environment variables after Supabase project creation.
10. Deploy preview, verify routes, then promote/deploy production.

## Acceptance Criteria

The first release is complete when:

- Existing `/` and `/show` pages still work and remain visually close to the current static pages.
- `/live` displays the active/current event.
- Public visitors can read comments and leaderboards without logging in.
- Logged-in users can comment, like/unlike, report comments, and share.
- Comments and likes update through Supabase Realtime.
- The system falls back to polling when realtime fails.
- Users can toggle simple trend and detailed leaderboard views.
- Weekly district influencer data is visible.
- Admins can create/edit events and moderate comments.
- Admins can manually import curated Facebook Group comments.
- Admins can export comments and engagement data.
- RLS is enabled and smoke-tested.
- No unauthorized scraping is used.
- The opening disclaimer appears on live podcast pages.
- Public UI uses Protect30A branding for now.
- `https://protect30a.org` remains canonical until Protect38 domains are configured in Vercel.
- Existing Protect30A `.com` and `www` host redirects still point to the canonical `.org` domain.

## External Setup Notes

Implementation docs should reference official provider documentation for:

- Supabase social login and custom OAuth/OIDC providers
- TikTok Login Kit for Web
- Meta Instagram Login/API eligibility and setup
- Meta Graph API/Webhooks and Groups API limitations
