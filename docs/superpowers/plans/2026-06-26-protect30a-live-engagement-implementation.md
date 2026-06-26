# Protect30A Live Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `GoodSam-ai/protect-30a` into a Next.js + Supabase application that preserves the existing public site and adds live podcast engagement routes, auth, comments, likes, leaderboards, admin moderation, and compliant sharing/import workflows.

**Architecture:** Keep the current homepage and `/show` page visually stable by serving the legacy HTML through Next rewrites in v1, while building `/live`, `/live/[slug]`, `/admin`, auth callbacks, API routes, Supabase clients, and engagement UI as normal Next.js App Router code. Supabase owns auth, Postgres, RLS, realtime, and moderation data; Vercel remains deployment and canonical-domain enforcement.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Auth/Postgres/Realtime, Tailwind CSS, Zod, Vitest, Testing Library, Playwright, Vercel.

---

## Scope Check

This is a large integrated migration. Execute it in phases, with each task producing a buildable checkpoint and a commit. Do not begin by rewriting the current 3,404-line homepage into React components; preserving it as legacy static HTML behind Next rewrites is the v1 path that best satisfies "preserve as closely as possible" while making room for the live engagement app.

## File Structure Map

Create or modify these paths:

- `package.json`: npm scripts and dependencies.
- `package-lock.json`: locked dependency graph after `npm install`.
- `next.config.mjs`: static legacy rewrites for `/` and `/show`.
- `postcss.config.mjs`: Tailwind/PostCSS config.
- `tailwind.config.ts`: Tailwind content paths and theme extensions.
- `tsconfig.json`: TypeScript settings.
- `vitest.config.ts`: unit/component test setup.
- `tests/setup.ts`: Testing Library matchers.
- `tests/site-config.test.ts`: site config tests.
- `tests/live-engagement-mode.test.ts`: realtime/polling reducer tests.
- `tests/comment-actions.test.ts`: validation/action tests.
- `tests/leaderboards.test.ts`: scoring and leaderboard tests.
- `app/layout.tsx`: root layout for React app routes.
- `app/globals.css`: shared CSS for new React app routes.
- `app/live/page.tsx`: active/current live event route.
- `app/live/[slug]/page.tsx`: event-specific live route.
- `app/admin/page.tsx`: admin dashboard route.
- `app/auth/callback/route.ts`: Supabase OAuth callback.
- `app/api/comments/route.ts`: create comment endpoint.
- `app/api/comments/[commentId]/like/route.ts`: like/unlike endpoint.
- `app/api/comments/[commentId]/report/route.ts`: report endpoint.
- `app/api/shares/route.ts`: share tracking endpoint.
- `app/api/admin/facebook-import/route.ts`: manual Facebook import endpoint.
- `app/api/admin/export/comments/route.ts`: CSV export endpoint.
- `components/auth/SignInPanel.tsx`: provider and magic-link sign-in UI.
- `components/live/LivePodcastPage.tsx`: page composition.
- `components/live/DistrictSelector.tsx`: eight-district selector.
- `components/live/CommentComposer.tsx`: logged-in comment composer.
- `components/live/LiveCommentFeed.tsx`: comments list.
- `components/live/LikeButton.tsx`: optimistic like button.
- `components/live/EngagementDashboard.tsx`: simple/detailed dashboard toggle.
- `components/live/InfluencerLeaderboard.tsx`: influencer board.
- `components/live/SharePanel.tsx`: share actions and share tracking.
- `components/admin/AdminModerationPanel.tsx`: admin shell.
- `components/admin/EventEditor.tsx`: event form.
- `components/admin/ManualFacebookImport.tsx`: manual import form.
- `components/admin/ReportedCommentsQueue.tsx`: moderation queue.
- `components/admin/EngagementExport.tsx`: CSV export controls.
- `components/admin/ScoringSettings.tsx`: scoring display/config form.
- `components/admin/BadgeSettings.tsx`: badge config form.
- `lib/site-config.ts`: brand, canonical, redirects, feature flags.
- `lib/supabase/browser.ts`: browser Supabase client.
- `lib/supabase/server.ts`: server Supabase client.
- `lib/supabase/admin.ts`: service-role client for route handlers only.
- `lib/auth/session.ts`: session/profile helpers.
- `lib/live/types.ts`: live-event TypeScript types.
- `lib/live/validation.ts`: Zod schemas and rate-limit helpers.
- `lib/live/scoring.ts`: leaderboard scoring helpers.
- `lib/live/data.ts`: Supabase data access functions.
- `lib/live/actions.ts`: server-side mutation helpers.
- `lib/live/realtime.ts`: realtime/polling state machine.
- `lib/live/fixtures.ts`: local seed fixture for no-event empty states and tests.
- `supabase/migrations/202606260001_live_engagement.sql`: schema, seed data, RLS, views, RPCs.
- `docs/setup/supabase.md`: Supabase project and migration setup.
- `docs/setup/auth-providers.md`: provider setup, including TikTok and Instagram custom OAuth notes.
- `docs/integrations/facebook-groups.md`: no-scraping integration modes.
- `.env.example`: required environment variables.
- `public/legacy/index.html`: moved current homepage.
- `public/legacy/show/index.html`: moved current show page.
- `public/robots.txt`: moved current robots file.
- `public/sitemap.xml`: moved current sitemap.
- `public/og-image.jpg`: moved current social image.
- `vercel.json`: preserve host redirects to canonical `protect30a.org`.

## Task 1: Scaffold Next.js And Preserve Existing Static Pages

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Move: `index.html` to `public/legacy/index.html`
- Move: `show/index.html` to `public/legacy/show/index.html`
- Move: `robots.txt` to `public/robots.txt`
- Move: `sitemap.xml` to `public/sitemap.xml`
- Move: `og-image.jpg` to `public/og-image.jpg`
- Modify: `README.md`

- [ ] **Step 1: Create the Next.js package manifest**

Create `package.json`:

```json
{
  "name": "protect-30a",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest",
    "clsx": "latest",
    "lucide-react": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "autoprefixer": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "jsdom": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and install exits with code `0`.

- [ ] **Step 3: Move legacy static assets**

Run:

```bash
mkdir -p public/legacy/show
git mv index.html public/legacy/index.html
git mv show/index.html public/legacy/show/index.html
rmdir show
git mv robots.txt public/robots.txt
git mv sitemap.xml public/sitemap.xml
git mv og-image.jpg public/og-image.jpg
```

Expected: `git status --short` shows the moved files as renames.

- [ ] **Step 4: Add Next rewrites for legacy pages**

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/", destination: "/legacy/index.html" },
      { source: "/show", destination: "/legacy/show/index.html" },
      { source: "/show/", destination: "/legacy/show/index.html" }
    ];
  }
};

export default nextConfig;
```

- [ ] **Step 5: Add TypeScript and Tailwind configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `postcss.config.mjs`:

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

export default config;
```

Create `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        protect: {
          teal: "#0e3b38",
          tealSoft: "#1d5f5a",
          aqua: "#8fcdc4",
          cream: "#fbf8f1",
          sand: "#ead9bd",
          terra: "#c56b4a",
          ink: "#22312f"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
```

- [ ] **Step 6: Add Vitest setup**

Create `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"]
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname
    }
  }
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 7: Add the root layout for React routes**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://protect30a.org"),
  title: {
    default: "Protect30A",
    template: "%s | Protect30A"
  },
  description:
    "Protect30A community engagement, live podcast participation, district leaderboards, and the South Walton stormwater plan."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: light;
  --protect-teal: #0e3b38;
  --protect-cream: #fbf8f1;
  --protect-ink: #22312f;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--protect-cream);
  color: var(--protect-ink);
}

button,
input,
select,
textarea {
  font: inherit;
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid #c56b4a;
  outline-offset: 2px;
}
```

- [ ] **Step 8: Update README**

Replace `README.md` with:

```md
# Protect30A

Community stormwater plan and live engagement platform for South Walton's 30A corridor.

**Live site:** https://protect30a.org/

## Development

```bash
npm install
npm run dev
```

The current homepage and `/show` page are preserved as legacy static HTML under `public/legacy/` and served through Next.js rewrites. New interactive routes live under `/live`, `/live/[slug]`, and `/admin`.
```

- [ ] **Step 9: Verify scaffold**

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Expected: all commands exit with code `0`. The build should include `/live` only after later tasks; at this checkpoint it should still build the app shell and serve legacy rewrites.

- [ ] **Step 10: Commit**

Run:

```bash
git add package.json package-lock.json next.config.mjs postcss.config.mjs tailwind.config.ts tsconfig.json vitest.config.ts tests/setup.ts app public README.md
git commit -m "chore: scaffold next app and preserve legacy pages"
```

## Task 2: Add Site Config, Feature Flags, And Environment Example

**Files:**
- Create: `lib/site-config.ts`
- Create: `.env.example`
- Create: `tests/site-config.test.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Write failing site config tests**

Create `tests/site-config.test.ts`:

```ts
import {
  getCanonicalUrl,
  getEnabledAuthProviders,
  siteConfig
} from "@/lib/site-config";

describe("site config", () => {
  it("keeps Protect30A canonical until Protect38 is configured", () => {
    expect(siteConfig.brandName).toBe("Protect30A");
    expect(siteConfig.siteUrl).toBe("https://protect30a.org");
    expect(getCanonicalUrl("/live")).toBe("https://protect30a.org/live");
  });

  it("normalizes canonical paths", () => {
    expect(getCanonicalUrl("live/test-event")).toBe(
      "https://protect30a.org/live/test-event"
    );
    expect(getCanonicalUrl("/")).toBe("https://protect30a.org/");
  });

  it("enables TikTok and Instagram from env defaults", () => {
    const providers = getEnabledAuthProviders({
      ENABLE_TIKTOK_LOGIN: "true",
      ENABLE_INSTAGRAM_LOGIN: "true"
    });
    expect(providers.map((provider) => provider.id)).toContain("custom:tiktok");
    expect(providers.map((provider) => provider.id)).toContain(
      "custom:instagram"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- tests/site-config.test.ts
```

Expected: FAIL because `lib/site-config.ts` does not exist.

- [ ] **Step 3: Implement site config**

Create `lib/site-config.ts`:

```ts
export type AuthProviderConfig = {
  id:
    | "google"
    | "apple"
    | "facebook"
    | "linkedin_oidc"
    | "email"
    | "custom:tiktok"
    | "custom:instagram";
  label: string;
  enabled: boolean;
  note?: string;
};

type EnvLike = Record<string, string | undefined>;

const defaultSiteUrl = "https://protect30a.org";

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || "Protect30A",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl,
  canonicalDomain:
    process.env.NEXT_PUBLIC_CANONICAL_DOMAIN || "protect30a.org",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "doug@goodsam.ai",
  defaultRealtimeMode: process.env.DEFAULT_REALTIME_MODE || "auto",
  pollingIntervalMs: Number(process.env.POLLING_INTERVAL_MS || 5000),
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || "doug@goodsam.ai"
} as const;

export function getCanonicalUrl(pathname: string) {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  if (pathname === "/") return `${base}/`;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${normalized}`;
}

export function getEnabledAuthProviders(env: EnvLike = process.env) {
  const providers: AuthProviderConfig[] = [
    { id: "email", label: "Email magic link", enabled: true },
    { id: "google", label: "Google", enabled: true },
    { id: "apple", label: "Apple", enabled: true },
    { id: "facebook", label: "Facebook", enabled: true },
    { id: "linkedin_oidc", label: "LinkedIn", enabled: true },
    {
      id: "custom:tiktok",
      label: "TikTok",
      enabled: readBoolean(env.ENABLE_TIKTOK_LOGIN, true),
      note: "Uses TikTok Login Kit through a Supabase custom OAuth provider."
    },
    {
      id: "custom:instagram",
      label: "Instagram",
      enabled: readBoolean(env.ENABLE_INSTAGRAM_LOGIN, true),
      note:
        "Instagram login is for eligible Business/Creator accounts through Meta's supported Instagram Login/API path."
    }
  ];

  return providers.filter((provider) => provider.enabled);
}
```

- [ ] **Step 4: Add `.env.example`**

Create `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=https://protect30a.org
NEXT_PUBLIC_BRAND_NAME=Protect30A
NEXT_PUBLIC_CANONICAL_DOMAIN=protect30a.org
NEXT_PUBLIC_SUPPORT_EMAIL=doug@goodsam.ai
BOOTSTRAP_ADMIN_EMAIL=doug@goodsam.ai

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

- [ ] **Step 5: Preserve Vercel redirects**

Keep `vercel.json` redirects for `protect30a.com`, `www.protect30a.com`, `www.protect30a.org`, `protect-30a.vercel.app`, `protect-30a-team-good-sam.vercel.app`, and `protect-30a-git-main-team-good-sam.vercel.app`. Do not add Protect38 redirects until those domains are configured in Vercel.

- [ ] **Step 6: Verify**

Run:

```bash
npm run test -- tests/site-config.test.ts
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add lib/site-config.ts .env.example tests/site-config.test.ts vercel.json
git commit -m "chore: add site config and environment template"
```

## Task 3: Add Supabase Schema, RLS, Seed Data, Views, And RPCs

**Files:**
- Create: `supabase/migrations/202606260001_live_engagement.sql`
- Create: `lib/live/scoring.ts`
- Create: `tests/leaderboards.test.ts`

- [ ] **Step 1: Write scoring tests**

Create `tests/leaderboards.test.ts`:

```ts
import { calculateEngagementScore, rankScores } from "@/lib/live/scoring";

describe("leaderboard scoring", () => {
  it("weights likes and featured comments more than raw volume", () => {
    expect(
      calculateEngagementScore({
        likesReceivedCount: 10,
        commentsCount: 2,
        sharesCount: 1,
        featuredCommentsCount: 1
      })
    ).toBe(44);
  });

  it("ranks highest score first with deterministic ties", () => {
    const ranked = rankScores([
      { userId: "b", displayName: "Beta", score: 10 },
      { userId: "a", displayName: "Alpha", score: 10 },
      { userId: "c", displayName: "Charlie", score: 5 }
    ]);

    expect(ranked).toEqual([
      { userId: "a", displayName: "Alpha", score: 10, rank: 1 },
      { userId: "b", displayName: "Beta", score: 10, rank: 2 },
      { userId: "c", displayName: "Charlie", score: 5, rank: 3 }
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -- tests/leaderboards.test.ts
```

Expected: FAIL because `lib/live/scoring.ts` does not exist.

- [ ] **Step 3: Implement scoring helpers**

Create `lib/live/scoring.ts`:

```ts
export type ScoreInput = {
  likesReceivedCount: number;
  commentsCount: number;
  sharesCount: number;
  featuredCommentsCount: number;
};

export type RankableScore = {
  userId: string;
  displayName: string;
  score: number;
};

export function calculateEngagementScore(input: ScoreInput) {
  return (
    input.likesReceivedCount * 3 +
    input.commentsCount * 1 +
    input.sharesCount * 2 +
    input.featuredCommentsCount * 10
  );
}

export function rankScores<T extends RankableScore>(scores: T[]) {
  return [...scores]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.displayName.localeCompare(right.displayName);
    })
    .map((score, index) => ({
      ...score,
      rank: index + 1
    }));
}
```

- [ ] **Step 4: Create the Supabase migration**

Create `supabase/migrations/202606260001_live_engagement.sql` with this structure:

```sql
create extension if not exists "pgcrypto";

create type public.profile_role as enum ('user', 'moderator', 'admin');
create type public.event_status as enum ('upcoming', 'live', 'replay', 'archived');
create type public.comment_source as enum ('site', 'facebook_manual', 'facebook_api', 'admin_import');
create type public.comment_moderation_status as enum ('visible', 'pending', 'hidden', 'removed');

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  primary_district_id uuid references public.districts(id),
  bio text,
  role public.profile_role not null default 'user',
  is_candidate boolean not null default false,
  is_potential_guest boolean not null default false,
  is_restricted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.podcast_events (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references public.districts(id),
  title text not null,
  slug text not null unique,
  description text,
  status public.event_status not null default 'upcoming',
  starts_at timestamptz,
  ends_at timestamptz,
  livestream_url text,
  replay_url text,
  host_name text not null default 'Doug Liles',
  cohost_name text,
  advocate_name text,
  guest_names text[] not null default '{}',
  entertainer_name text,
  entertainment_type text,
  entertainment_description text,
  disclaimer text not null default 'Let me make this crystal clear: this podcast is purely for community education and conversation. We''re not a government body, nor are we making any official decisions. We''re committed to full transparency, because we believe that open information builds community trust.',
  comments_enabled boolean not null default true,
  replies_enabled boolean not null default true,
  leaderboard_enabled boolean not null default true,
  forced_engagement_mode text not null default 'auto' check (forced_engagement_mode in ('auto', 'realtime', 'polling', 'low-bandwidth')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.podcast_events(id) on delete cascade,
  district_id uuid references public.districts(id),
  user_id uuid references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 5 and 500),
  topic text check (topic in ('Stormwater', 'Traffic', 'Beach access', 'Mosquito control', 'Public safety', 'Growth/development', 'Parking', 'Environment', 'Other')),
  source public.comment_source not null default 'site',
  external_source_url text,
  external_source_author text,
  is_hidden boolean not null default false,
  is_featured boolean not null default false,
  is_reported boolean not null default false,
  moderation_status public.comment_moderation_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_user_id)
);

create table public.event_shares (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.podcast_events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  platform text not null,
  created_at timestamptz not null default now()
);

create table public.district_influencer_scores (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id),
  user_id uuid not null references public.profiles(id),
  week_start date not null,
  comments_count int not null default 0,
  likes_received_count int not null default 0,
  shares_count int not null default 0,
  featured_comments_count int not null default 0,
  engagement_score numeric not null default 0,
  rank int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (district_id, user_id, week_start)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.districts (name, slug, description, sort_order) values
  ('Inlet Beach', 'inlet-beach', 'Inlet Beach district placeholder.', 1),
  ('Rosemary Beach', 'rosemary-beach', 'Rosemary Beach district placeholder.', 2),
  ('Alys Beach', 'alys-beach', 'Alys Beach district placeholder.', 3),
  ('Watersound', 'watersound', 'Watersound, Seacrest, Prominence, and Origins.', 4),
  ('Seagrove', 'seagrove', 'Seagrove, Seaside, and WaterColor.', 5),
  ('Grayton Beach', 'grayton-beach', 'Grayton Beach and Blue Mountain Beach.', 6),
  ('Santa Rosa Beach', 'santa-rosa-beach', 'Santa Rosa Beach, Gulf Place, and Dune Allen.', 7),
  ('Sandestin', 'sandestin', 'Sandestin, Miramar Beach, and Seascape.', 8);

insert into public.podcast_events (
  district_id,
  title,
  slug,
  description,
  status,
  starts_at,
  host_name,
  cohost_name,
  advocate_name,
  guest_names,
  entertainer_name,
  entertainment_type,
  entertainment_description,
  is_active
)
select
  id,
  'Protect30A Live: Community Conversation',
  'protect30a-live-community-conversation',
  'A district-based live podcast event for community education, comments, likes, sharing, and leaderboards.',
  'upcoming',
  now() + interval '7 days',
  'Doug Liles',
  'Jim Bagby',
  'Community advocate',
  array['Local resident voice'],
  'Local entertainer',
  'Music',
  'A short 3-5 minute local segment.',
  true
from public.districts
where slug = 'inlet-beach';

create index comments_event_created_idx on public.comments (event_id, created_at desc);
create index comments_event_featured_idx on public.comments (event_id, is_featured, created_at desc);
create index comment_likes_comment_idx on public.comment_likes (comment_id);
create index event_shares_event_idx on public.event_shares (event_id);
create index influencer_scores_week_idx on public.district_influencer_scores (week_start, district_id, rank);

create or replace function public.is_admin_or_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'moderator')
      and is_restricted = false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_restricted = false
  );
$$;

alter table public.districts enable row level security;
alter table public.profiles enable row level security;
alter table public.podcast_events enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.comment_reports enable row level security;
alter table public.event_shares enable row level security;
alter table public.district_influencer_scores enable row level security;
alter table public.audit_log enable row level security;

create policy "public read districts" on public.districts for select using (true);
create policy "admins manage districts" on public.districts for all using (public.is_admin()) with check (public.is_admin());

create policy "public read profiles" on public.profiles for select using (true);
create policy "users insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "users update own public profile fields" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "public read public events" on public.podcast_events for select using (status in ('upcoming', 'live', 'replay'));
create policy "admins manage events" on public.podcast_events for all using (public.is_admin()) with check (public.is_admin());

create policy "public read visible comments" on public.comments for select using (moderation_status = 'visible' and is_hidden = false);
create policy "logged in users create own comments" on public.comments for insert with check (
  auth.uid() = user_id
  and source = 'site'
  and moderation_status = 'visible'
  and is_hidden = false
  and is_featured = false
);
create policy "admins moderate comments" on public.comments for all using (public.is_admin_or_moderator()) with check (public.is_admin_or_moderator());

create policy "public read likes" on public.comment_likes for select using (true);
create policy "users like as themselves" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "users unlike as themselves" on public.comment_likes for delete using (auth.uid() = user_id);

create policy "users report as themselves" on public.comment_reports for insert with check (auth.uid() = reporter_user_id);
create policy "moderators read reports" on public.comment_reports for select using (public.is_admin_or_moderator());

create policy "users track own shares" on public.event_shares for insert with check (auth.uid() = user_id or user_id is null);
create policy "admins read shares" on public.event_shares for select using (public.is_admin_or_moderator());

create policy "public read influencer scores" on public.district_influencer_scores for select using (true);
create policy "admins manage influencer scores" on public.district_influencer_scores for all using (public.is_admin()) with check (public.is_admin());

create policy "admins read audit log" on public.audit_log for select using (public.is_admin());
create policy "moderators insert audit log" on public.audit_log for insert with check (public.is_admin_or_moderator());

create or replace view public.top_comments_for_event as
select
  c.id,
  c.event_id,
  c.body,
  c.topic,
  c.created_at,
  c.is_featured,
  p.display_name,
  p.avatar_url,
  d.name as district_name,
  count(cl.id)::int as like_count,
  count(replies.id)::int as reply_count
from public.comments c
left join public.profiles p on p.id = c.user_id
left join public.districts d on d.id = c.district_id
left join public.comment_likes cl on cl.comment_id = c.id
left join public.comments replies on replies.parent_comment_id = c.id and replies.moderation_status = 'visible' and replies.is_hidden = false
where c.moderation_status = 'visible' and c.is_hidden = false
group by c.id, p.display_name, p.avatar_url, d.name;

create or replace view public.top_commenters_for_event as
select
  c.event_id,
  c.user_id,
  p.display_name,
  p.avatar_url,
  count(distinct c.id)::int as comments_count,
  count(cl.id)::int as likes_received_count,
  count(distinct es.id)::int as shares_count,
  count(distinct c.id) filter (where c.is_featured)::int as featured_comments_count,
  (
    count(cl.id) * 3 +
    count(distinct c.id) * 1 +
    count(distinct es.id) * 2 +
    count(distinct c.id) filter (where c.is_featured) * 10
  )::numeric as engagement_score
from public.comments c
join public.profiles p on p.id = c.user_id
left join public.comment_likes cl on cl.comment_id = c.id
left join public.event_shares es on es.event_id = c.event_id and es.user_id = c.user_id
where c.moderation_status = 'visible' and c.is_hidden = false
group by c.event_id, c.user_id, p.display_name, p.avatar_url;

create or replace function public.refresh_weekly_district_influencer_scores(target_week date default date_trunc('week', now())::date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.district_influencer_scores where week_start = target_week;

  insert into public.district_influencer_scores (
    district_id,
    user_id,
    week_start,
    comments_count,
    likes_received_count,
    shares_count,
    featured_comments_count,
    engagement_score,
    rank
  )
  select
    ranked.district_id,
    ranked.user_id,
    target_week,
    ranked.comments_count,
    ranked.likes_received_count,
    ranked.shares_count,
    ranked.featured_comments_count,
    ranked.engagement_score,
    ranked.rank
  from (
    select
      base.*,
      row_number() over (partition by base.district_id order by base.engagement_score desc, base.display_name asc) as rank
    from (
      select
        c.district_id,
        c.user_id,
        coalesce(p.display_name, 'Community member') as display_name,
        count(distinct c.id)::int as comments_count,
        count(cl.id)::int as likes_received_count,
        count(distinct es.id)::int as shares_count,
        count(distinct c.id) filter (where c.is_featured)::int as featured_comments_count,
        (
          count(cl.id) * 3 +
          count(distinct c.id) * 1 +
          count(distinct es.id) * 2 +
          count(distinct c.id) filter (where c.is_featured) * 10
        )::numeric as engagement_score
      from public.comments c
      join public.profiles p on p.id = c.user_id
      left join public.comment_likes cl on cl.comment_id = c.id
      left join public.event_shares es on es.user_id = c.user_id and es.event_id = c.event_id
      where c.moderation_status = 'visible'
        and c.is_hidden = false
        and c.district_id is not null
        and c.created_at >= target_week
        and c.created_at < target_week + interval '7 days'
      group by c.district_id, c.user_id, p.display_name
    ) base
  ) ranked;
end;
$$;
```

- [ ] **Step 5: Verify migration syntax locally**

If Supabase CLI is available:

```bash
supabase db lint
```

Expected: no SQL syntax errors. If the CLI is not authenticated or not installed, run:

```bash
npx supabase --version
```

Expected: the CLI version prints. Document auth/linking in Task 12 if lint cannot run until the project is created.

- [ ] **Step 6: Verify scoring tests**

Run:

```bash
npm run test -- tests/leaderboards.test.ts
npm run typecheck
```

Expected: all commands pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add supabase/migrations/202606260001_live_engagement.sql lib/live/scoring.ts tests/leaderboards.test.ts
git commit -m "feat: add live engagement database schema"
```

## Task 4: Add Supabase Clients, Auth Callback, Session Helpers, And Sign-In UI

**Files:**
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/auth/session.ts`
- Create: `app/auth/callback/route.ts`
- Create: `components/auth/SignInPanel.tsx`

- [ ] **Step 1: Add browser Supabase client**

Create `lib/supabase/browser.ts`:

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase browser environment variables are missing.");
  }

  return createBrowserClient(url, anonKey);
}
```

- [ ] **Step 2: Add server Supabase clients**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}
```

Create `lib/supabase/admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

- [ ] **Step 3: Add session helper**

Create `lib/auth/session.ts`:

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRole = "user" | "moderator" | "admin";

export type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  primary_district_id: string | null;
  is_restricted: boolean;
};

export async function getCurrentUserAndProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, primary_district_id, is_restricted")
    .eq("id", user.id)
    .single<PublicProfile>();

  if (error) {
    return { user, profile: null };
  }

  return { user, profile };
}

export function canModerate(profile: PublicProfile | null) {
  return (
    profile !== null &&
    !profile.is_restricted &&
    (profile.role === "admin" || profile.role === "moderator")
  );
}
```

- [ ] **Step 4: Add auth callback route**

Create `app/auth/callback/route.ts`:

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/live";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
```

- [ ] **Step 5: Add sign-in panel**

Create `components/auth/SignInPanel.tsx`:

```tsx
"use client";

import { getEnabledAuthProviders } from "@/lib/site-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Mail } from "lucide-react";
import { useState } from "react";

export function SignInPanel({ redirectTo = "/live" }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const providers = getEnabledAuthProviders();

  async function signInWithProvider(provider: string) {
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as never,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });

    if (error) setMessage(error.message);
  }

  async function sendMagicLink() {
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });

    setMessage(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <section className="rounded border border-protect-sand bg-white p-4 shadow-sm">
      <h2 className="font-serif text-xl font-semibold text-protect-teal">
        Sign in to join the conversation
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {providers
          .filter((provider) => provider.id !== "email")
          .map((provider) => (
            <button
              key={provider.id}
              type="button"
              className="rounded border border-protect-sand px-3 py-2 text-left font-semibold hover:bg-protect-cream"
              onClick={() => signInWithProvider(provider.id)}
            >
              {provider.label}
            </button>
          ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="magic-email">
          Email address
        </label>
        <input
          id="magic-email"
          className="min-h-11 flex-1 rounded border border-protect-sand px-3"
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white"
          onClick={sendMagicLink}
        >
          <Mail size={18} aria-hidden="true" />
          Email link
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-protect-ink">{message}</p> : null}
    </section>
  );
}
```

- [ ] **Step 6: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add lib/supabase lib/auth app/auth components/auth
git commit -m "feat: add supabase auth foundation"
```

## Task 5: Add Live Data Types, Validation, Fixtures, And Data Access

**Files:**
- Create: `lib/live/types.ts`
- Create: `lib/live/validation.ts`
- Create: `lib/live/fixtures.ts`
- Create: `lib/live/data.ts`
- Create: `tests/comment-actions.test.ts`

- [ ] **Step 1: Write validation tests**

Create `tests/comment-actions.test.ts`:

```ts
import {
  commentInputSchema,
  isRapidDuplicateComment,
  reportInputSchema
} from "@/lib/live/validation";

describe("comment validation", () => {
  it("accepts valid comments with supported topics", () => {
    expect(
      commentInputSchema.parse({
        eventId: "11111111-1111-4111-8111-111111111111",
        districtId: "22222222-2222-4222-8222-222222222222",
        body: "Stormwater drains near our street need attention.",
        topic: "Stormwater"
      })
    ).toMatchObject({ topic: "Stormwater" });
  });

  it("rejects comments shorter than five characters", () => {
    expect(() =>
      commentInputSchema.parse({
        eventId: "11111111-1111-4111-8111-111111111111",
        body: "hey"
      })
    ).toThrow();
  });

  it("detects duplicate rapid posting", () => {
    expect(
      isRapidDuplicateComment({
        previousBody: "Same concern",
        nextBody: " same concern ",
        previousCreatedAt: new Date("2026-06-26T12:00:00Z"),
        now: new Date("2026-06-26T12:00:20Z")
      })
    ).toBe(true);
  });

  it("validates reports", () => {
    expect(
      reportInputSchema.parse({
        reason: "spam",
        details: "Repeated unrelated link."
      })
    ).toEqual({ reason: "spam", details: "Repeated unrelated link." });
  });
});
```

- [ ] **Step 2: Implement types and validation**

Create `lib/live/types.ts`:

```ts
export type EventStatus = "upcoming" | "live" | "replay" | "archived";
export type EngagementMode = "auto" | "realtime" | "polling" | "low-bandwidth";

export type District = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type PodcastEvent = {
  id: string;
  district_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  livestream_url: string | null;
  replay_url: string | null;
  host_name: string;
  cohost_name: string | null;
  advocate_name: string | null;
  guest_names: string[];
  entertainer_name: string | null;
  entertainment_type: string | null;
  entertainment_description: string | null;
  disclaimer: string;
  comments_enabled: boolean;
  replies_enabled: boolean;
  leaderboard_enabled: boolean;
  forced_engagement_mode: EngagementMode;
  is_active: boolean;
};

export type LiveComment = {
  id: string;
  event_id: string;
  district_id: string | null;
  user_id: string | null;
  parent_comment_id: string | null;
  body: string;
  topic: string | null;
  is_featured: boolean;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  author_display_name: string;
  author_avatar_url: string | null;
};

export type LiveMetrics = {
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  commentsPerMinute: number;
  topTopics: Array<{ topic: string; count: number }>;
};
```

Create `lib/live/validation.ts`:

```ts
import { z } from "zod";

export const topicSchema = z.enum([
  "Stormwater",
  "Traffic",
  "Beach access",
  "Mosquito control",
  "Public safety",
  "Growth/development",
  "Parking",
  "Environment",
  "Other"
]);

export const commentInputSchema = z.object({
  eventId: z.string().uuid(),
  districtId: z.string().uuid().optional(),
  parentCommentId: z.string().uuid().optional(),
  body: z.string().trim().min(5).max(500),
  topic: topicSchema.optional()
});

export const reportInputSchema = z.object({
  reason: z.string().trim().min(3).max(80),
  details: z.string().trim().max(500).optional()
});

export const shareInputSchema = z.object({
  eventId: z.string().uuid(),
  platform: z.string().trim().min(2).max(40)
});

export function normalizeCommentBody(body: string) {
  return body.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isRapidDuplicateComment(input: {
  previousBody: string;
  nextBody: string;
  previousCreatedAt: Date;
  now: Date;
}) {
  const sameBody =
    normalizeCommentBody(input.previousBody) ===
    normalizeCommentBody(input.nextBody);
  const seconds =
    (input.now.getTime() - input.previousCreatedAt.getTime()) / 1000;

  return sameBody && seconds <= 60;
}
```

- [ ] **Step 3: Add fixture data**

Create `lib/live/fixtures.ts`:

```ts
import type { District, LiveComment, LiveMetrics, PodcastEvent } from "./types";

export const fixtureDistricts: District[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Inlet Beach", slug: "inlet-beach", description: "Inlet Beach district placeholder.", sort_order: 1 },
  { id: "10000000-0000-4000-8000-000000000002", name: "Rosemary Beach", slug: "rosemary-beach", description: "Rosemary Beach district placeholder.", sort_order: 2 },
  { id: "10000000-0000-4000-8000-000000000003", name: "Alys Beach", slug: "alys-beach", description: "Alys Beach district placeholder.", sort_order: 3 },
  { id: "10000000-0000-4000-8000-000000000004", name: "Watersound", slug: "watersound", description: "Watersound, Seacrest, Prominence, and Origins.", sort_order: 4 },
  { id: "10000000-0000-4000-8000-000000000005", name: "Seagrove", slug: "seagrove", description: "Seagrove, Seaside, and WaterColor.", sort_order: 5 },
  { id: "10000000-0000-4000-8000-000000000006", name: "Grayton Beach", slug: "grayton-beach", description: "Grayton Beach and Blue Mountain Beach.", sort_order: 6 },
  { id: "10000000-0000-4000-8000-000000000007", name: "Santa Rosa Beach", slug: "santa-rosa-beach", description: "Santa Rosa Beach, Gulf Place, and Dune Allen.", sort_order: 7 },
  { id: "10000000-0000-4000-8000-000000000008", name: "Sandestin", slug: "sandestin", description: "Sandestin, Miramar Beach, and Seascape.", sort_order: 8 }
];

export const fixtureEvent: PodcastEvent = {
  id: "20000000-0000-4000-8000-000000000001",
  district_id: fixtureDistricts[0].id,
  title: "Protect30A Live: Community Conversation",
  slug: "protect30a-live-community-conversation",
  description: "A district-based live podcast event for community education and conversation.",
  status: "upcoming",
  starts_at: new Date("2026-07-03T18:00:00-05:00").toISOString(),
  ends_at: null,
  livestream_url: null,
  replay_url: null,
  host_name: "Doug Liles",
  cohost_name: "Jim Bagby",
  advocate_name: "Community advocate",
  guest_names: ["Local resident voice"],
  entertainer_name: "Local entertainer",
  entertainment_type: "Music",
  entertainment_description: "A short 3-5 minute local segment.",
  disclaimer: "Let me make this crystal clear: this podcast is purely for community education and conversation. We're not a government body, nor are we making any official decisions. We're committed to full transparency, because we believe that open information builds community trust.",
  comments_enabled: true,
  replies_enabled: true,
  leaderboard_enabled: true,
  forced_engagement_mode: "auto",
  is_active: true
};

export const fixtureComments: LiveComment[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    event_id: fixtureEvent.id,
    district_id: fixtureDistricts[0].id,
    user_id: null,
    parent_comment_id: null,
    body: "Stormwater near our neighborhood should be a top topic.",
    topic: "Stormwater",
    is_featured: true,
    created_at: new Date("2026-06-26T12:00:00Z").toISOString(),
    like_count: 8,
    liked_by_me: false,
    author_display_name: "Community member",
    author_avatar_url: null
  }
];

export const fixtureMetrics: LiveMetrics = {
  totalComments: 1,
  totalLikes: 8,
  totalShares: 0,
  commentsPerMinute: 0,
  topTopics: [{ topic: "Stormwater", count: 1 }]
};
```

- [ ] **Step 4: Add data access functions**

Create `lib/live/data.ts`:

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fixtureComments,
  fixtureDistricts,
  fixtureEvent,
  fixtureMetrics
} from "./fixtures";
import type { LiveComment } from "./types";

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getDistricts() {
  if (!hasSupabaseEnv()) return fixtureDistricts;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("districts")
    .select("id, name, slug, description, sort_order")
    .order("sort_order");

  if (error) throw error;
  return data;
}

export async function getActiveEvent() {
  if (!hasSupabaseEnv()) return fixtureEvent;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("podcast_events")
    .select("*")
    .eq("is_active", true)
    .order("starts_at", { ascending: true })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function getEventBySlug(slug: string) {
  if (!hasSupabaseEnv()) {
    return slug === fixtureEvent.slug ? fixtureEvent : null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("podcast_events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

export async function getVisibleComments(eventId: string): Promise<LiveComment[]> {
  if (!hasSupabaseEnv()) return fixtureComments;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, event_id, district_id, user_id, parent_comment_id, body, topic, is_featured, created_at")
    .eq("event_id", eventId)
    .eq("moderation_status", "visible")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((comment) => ({
    ...comment,
    like_count: 0,
    liked_by_me: false,
    author_display_name: "Community member",
    author_avatar_url: null
  }));
}

export async function getLiveMetrics(_eventId: string) {
  if (!hasSupabaseEnv()) return fixtureMetrics;
  const comments = await getVisibleComments(_eventId);
  return {
    totalComments: comments.length,
    totalLikes: comments.reduce((sum, comment) => sum + comment.like_count, 0),
    totalShares: 0,
    commentsPerMinute: 0,
    topTopics: Object.entries(
      comments.reduce<Record<string, number>>((acc, comment) => {
        if (comment.topic) acc[comment.topic] = (acc[comment.topic] || 0) + 1;
        return acc;
      }, {})
    ).map(([topic, count]) => ({ topic, count }))
  };
}
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -- tests/comment-actions.test.ts
npm run typecheck
```

Expected: both pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add lib/live tests/comment-actions.test.ts
git commit -m "feat: add live engagement data foundation"
```

## Task 6: Build The Public Live Experience

**Files:**
- Create: `components/live/LivePodcastPage.tsx`
- Create: `components/live/DistrictSelector.tsx`
- Create: `components/live/CommentComposer.tsx`
- Create: `components/live/LiveCommentFeed.tsx`
- Create: `components/live/LikeButton.tsx`
- Create: `components/live/EngagementDashboard.tsx`
- Create: `components/live/InfluencerLeaderboard.tsx`
- Create: `components/live/SharePanel.tsx`
- Create: `app/live/page.tsx`
- Create: `app/live/[slug]/page.tsx`

- [ ] **Step 1: Add the live page route files**

Create `app/live/page.tsx`:

```tsx
import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import {
  getActiveEvent,
  getDistricts,
  getLiveMetrics,
  getVisibleComments
} from "@/lib/live/data";

export default async function LivePage() {
  const [event, districts, session] = await Promise.all([
    getActiveEvent(),
    getDistricts(),
    getCurrentUserAndProfile()
  ]);
  const [comments, metrics] = await Promise.all([
    getVisibleComments(event.id),
    getLiveMetrics(event.id)
  ]);

  return (
    <LivePodcastPage
      event={event}
      districts={districts}
      comments={comments}
      metrics={metrics}
      profile={session.profile}
    />
  );
}
```

Create `app/live/[slug]/page.tsx`:

```tsx
import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import {
  getDistricts,
  getEventBySlug,
  getLiveMetrics,
  getVisibleComments
} from "@/lib/live/data";
import { notFound } from "next/navigation";

export default async function EventPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [districts, session, comments, metrics] = await Promise.all([
    getDistricts(),
    getCurrentUserAndProfile(),
    getVisibleComments(event.id),
    getLiveMetrics(event.id)
  ]);

  return (
    <LivePodcastPage
      event={event}
      districts={districts}
      comments={comments}
      metrics={metrics}
      profile={session.profile}
    />
  );
}
```

- [ ] **Step 2: Add the page composition component**

Create `components/live/LivePodcastPage.tsx`:

```tsx
import { SignInPanel } from "@/components/auth/SignInPanel";
import type { PublicProfile } from "@/lib/auth/session";
import type { District, LiveComment, LiveMetrics, PodcastEvent } from "@/lib/live/types";
import { CommentComposer } from "./CommentComposer";
import { DistrictSelector } from "./DistrictSelector";
import { EngagementDashboard } from "./EngagementDashboard";
import { InfluencerLeaderboard } from "./InfluencerLeaderboard";
import { LiveCommentFeed } from "./LiveCommentFeed";
import { SharePanel } from "./SharePanel";

export function LivePodcastPage({
  event,
  districts,
  comments,
  metrics,
  profile
}: {
  event: PodcastEvent;
  districts: District[];
  comments: LiveComment[];
  metrics: LiveMetrics;
  profile: PublicProfile | null;
}) {
  const district = districts.find((item) => item.id === event.district_id);

  return (
    <main className="min-h-screen bg-protect-cream">
      <section className="border-b border-protect-sand bg-protect-teal text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-protect-aqua">
            {event.status}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">{event.title}</h1>
          <p className="mt-3 max-w-3xl text-lg text-white/80">
            {district?.name || "District-wide"} · Hosted by {event.host_name}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div className="aspect-video rounded bg-black text-white">
            <div className="flex h-full items-center justify-center px-4 text-center">
              {event.livestream_url || event.replay_url
                ? "Podcast player loads here"
                : "Live podcast player placeholder"}
            </div>
          </div>
          <aside className="rounded border-l-4 border-protect-terra bg-white p-4">
            <h2 className="font-semibold text-protect-teal">Opening disclaimer</h2>
            <p className="mt-2 text-sm leading-6 text-protect-ink">{event.disclaimer}</p>
          </aside>
          {profile ? (
            <CommentComposer event={event} profile={profile} />
          ) : (
            <SignInPanel redirectTo={`/live/${event.slug}`} />
          )}
          <LiveCommentFeed comments={comments} viewerProfile={profile} />
        </section>

        <aside className="space-y-5">
          <SharePanel event={event} />
          <EngagementDashboard metrics={metrics} />
          <InfluencerLeaderboard comments={comments} />
          <DistrictSelector districts={districts} selectedDistrictId={event.district_id} />
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Add supporting live components**

Create `components/live/DistrictSelector.tsx`, `CommentComposer.tsx`, `LiveCommentFeed.tsx`, `LikeButton.tsx`, `EngagementDashboard.tsx`, `InfluencerLeaderboard.tsx`, and `SharePanel.tsx` with accessible labels, no nested cards, and mobile-stable sizing. Use the props in `LivePodcastPage.tsx` exactly.

Minimum required behavior:

```tsx
// components/live/LikeButton.tsx
"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

export function LikeButton({
  commentId,
  initialLiked,
  initialCount,
  disabled
}: {
  commentId: string;
  initialLiked: boolean;
  initialCount: number;
  disabled: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  async function toggleLike() {
    if (disabled) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((current) => current + (nextLiked ? 1 : -1));

    const response = await fetch(`/api/comments/${commentId}/like`, {
      method: nextLiked ? "POST" : "DELETE"
    });

    if (!response.ok) {
      setLiked(liked);
      setCount(initialCount);
    }
  }

  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center gap-2 rounded border border-protect-sand px-3"
      aria-pressed={liked}
      disabled={disabled}
      onClick={toggleLike}
    >
      <Heart size={17} aria-hidden="true" fill={liked ? "currentColor" : "none"} />
      <span>{count}</span>
    </button>
  );
}
```

- [ ] **Step 4: Verify live routes**

Run:

```bash
npm run typecheck
npm run build
```

Expected: `/live` and `/live/[slug]` compile. The page renders fixture data when Supabase env vars are absent.

- [ ] **Step 5: Commit**

Run:

```bash
git add app/live components/live
git commit -m "feat: build public live podcast experience"
```

## Task 7: Add Comment, Like, Report, And Share Route Handlers

**Files:**
- Create: `lib/live/actions.ts`
- Create: `app/api/comments/route.ts`
- Create: `app/api/comments/[commentId]/like/route.ts`
- Create: `app/api/comments/[commentId]/report/route.ts`
- Create: `app/api/shares/route.ts`
- Modify: `components/live/CommentComposer.tsx`
- Modify: `components/live/SharePanel.tsx`

- [ ] **Step 1: Add mutation helpers**

Create `lib/live/actions.ts` with `createComment`, `toggleCommentLike`, `reportComment`, and `trackShare`. Each helper must call `getCurrentUserAndProfile()`, reject anonymous mutation attempts, validate input with schemas from `lib/live/validation.ts`, and write through Supabase.

- [ ] **Step 2: Add create comment endpoint**

Create `app/api/comments/route.ts`:

```ts
import { createComment } from "@/lib/live/actions";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const comment = await createComment(body);
    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create comment" },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 3: Add like and unlike endpoint**

Create `app/api/comments/[commentId]/like/route.ts` with `POST` to like and `DELETE` to unlike. The route must pass `params.commentId` to `toggleCommentLike`.

- [ ] **Step 4: Add report endpoint**

Create `app/api/comments/[commentId]/report/route.ts` with `POST`. The route must validate `reason` and `details`, create a report, set `comments.is_reported = true`, and return `{ ok: true }`.

- [ ] **Step 5: Add share endpoint**

Create `app/api/shares/route.ts` with `POST`. The route must validate `eventId` and `platform`, insert `event_shares`, and return `{ ok: true }`.

- [ ] **Step 6: Wire UI to endpoints**

Update `CommentComposer.tsx` to submit to `/api/comments`, clear the textarea on success, and show server validation errors in an `aria-live="polite"` element. Update `SharePanel.tsx` to call `/api/shares` after a logged-in user clicks a share option.

- [ ] **Step 7: Verify**

Run:

```bash
npm run test -- tests/comment-actions.test.ts
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add lib/live/actions.ts app/api/comments app/api/shares components/live/CommentComposer.tsx components/live/SharePanel.tsx
git commit -m "feat: add engagement mutation endpoints"
```

## Task 8: Add Realtime And Polling Fallback

**Files:**
- Create: `lib/live/realtime.ts`
- Create: `components/live/useLiveEngagement.ts`
- Modify: `components/live/LivePodcastPage.tsx`
- Create: `tests/live-engagement-mode.test.ts`

- [ ] **Step 1: Write mode transition tests**

Create `tests/live-engagement-mode.test.ts`:

```ts
import { reduceEngagementMode } from "@/lib/live/realtime";

describe("live engagement mode reducer", () => {
  it("starts in realtime when auto mode connects", () => {
    expect(
      reduceEngagementMode({ requestedMode: "auto", activeMode: "polling", failures: 0 }, { type: "realtime_connected" })
    ).toEqual({ requestedMode: "auto", activeMode: "realtime", failures: 0 });
  });

  it("falls back after repeated realtime failures", () => {
    expect(
      reduceEngagementMode({ requestedMode: "auto", activeMode: "realtime", failures: 2 }, { type: "realtime_failed" })
    ).toEqual({ requestedMode: "auto", activeMode: "polling", failures: 3 });
  });
});
```

- [ ] **Step 2: Implement reducer**

Create `lib/live/realtime.ts`:

```ts
import type { EngagementMode } from "./types";

export type EngagementModeState = {
  requestedMode: EngagementMode;
  activeMode: Exclude<EngagementMode, "auto">;
  failures: number;
};

export type EngagementModeEvent =
  | { type: "realtime_connected" }
  | { type: "realtime_failed" }
  | { type: "manual_mode_selected"; mode: EngagementMode };

export function reduceEngagementMode(
  state: EngagementModeState,
  event: EngagementModeEvent
): EngagementModeState {
  if (event.type === "manual_mode_selected") {
    return {
      requestedMode: event.mode,
      activeMode: event.mode === "auto" ? "realtime" : event.mode,
      failures: 0
    };
  }

  if (event.type === "realtime_connected") {
    return { ...state, activeMode: "realtime", failures: 0 };
  }

  const failures = state.failures + 1;
  return {
    ...state,
    failures,
    activeMode: failures >= 3 ? "polling" : state.activeMode
  };
}
```

- [ ] **Step 3: Implement `useLiveEngagement`**

Create `components/live/useLiveEngagement.ts`. The hook must:

- initialize with server-rendered comments and metrics
- subscribe to Supabase Realtime in `auto` or `realtime`
- poll `/api/live/[eventId]` or a data endpoint every `POLLING_INTERVAL_MS` in `polling` and fallback mode
- deduplicate comments by `id`
- expose `{ comments, metrics, mode, setMode }`

- [ ] **Step 4: Wire the hook into `LivePodcastPage`**

Convert `LivePodcastPage.tsx` to a client component only if needed for the hook. Keep server data passed as initial props. Add a segmented control with accessible buttons for `Auto`, `Realtime`, `Polling`, and `Low bandwidth`.

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -- tests/live-engagement-mode.test.ts
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add lib/live/realtime.ts components/live/useLiveEngagement.ts components/live/LivePodcastPage.tsx tests/live-engagement-mode.test.ts
git commit -m "feat: add realtime engagement fallback"
```

## Task 9: Build Dashboard And Leaderboards Against Supabase Views

**Files:**
- Modify: `lib/live/data.ts`
- Modify: `components/live/EngagementDashboard.tsx`
- Modify: `components/live/InfluencerLeaderboard.tsx`

- [ ] **Step 1: Add view-backed queries**

Update `lib/live/data.ts` to read:

- `top_comments_for_event`
- `top_commenters_for_event`
- `district_influencer_scores`

Return fixture-derived values when Supabase env vars are absent.

- [ ] **Step 2: Add dashboard toggle UI**

Update `EngagementDashboard.tsx` with two tabs:

- `Simple Trend View`
- `Detailed Leaderboard View`

The simple view must render total comments, total likes, total shares, comments per minute, top topics, and engagement score by district. The detailed view must render top comments, event leaders, district leaders, weekly influencers, running district leaderboard, and topic leaderboard.

- [ ] **Step 3: Add influencer board**

Update `InfluencerLeaderboard.tsx` to show current event leaders, current week district leaders, all-time district leaders if available, top comment text, likes received, comments posted, engagement score, and podcast invitation eligibility.

- [ ] **Step 4: Verify**

Run:

```bash
npm run test -- tests/leaderboards.test.ts
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add lib/live/data.ts components/live/EngagementDashboard.tsx components/live/InfluencerLeaderboard.tsx
git commit -m "feat: add live engagement dashboards"
```

## Task 10: Build Admin Dashboard, Event Setup, Moderation, Import, Export, And Scoring

**Files:**
- Create: `app/admin/page.tsx`
- Create: `components/admin/AdminModerationPanel.tsx`
- Create: `components/admin/EventEditor.tsx`
- Create: `components/admin/ManualFacebookImport.tsx`
- Create: `components/admin/ReportedCommentsQueue.tsx`
- Create: `components/admin/EngagementExport.tsx`
- Create: `components/admin/ScoringSettings.tsx`
- Create: `components/admin/BadgeSettings.tsx`
- Create: `app/api/admin/facebook-import/route.ts`
- Create: `app/api/admin/export/comments/route.ts`

- [ ] **Step 1: Add admin route guard**

Create `app/admin/page.tsx`:

```tsx
import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { profile } = await getCurrentUserAndProfile();

  if (!canModerate(profile)) {
    redirect("/live");
  }

  return <AdminModerationPanel profile={profile} />;
}
```

- [ ] **Step 2: Add admin shell and forms**

Create the admin components listed above. The shell must include tabs for:

- Events
- Reported comments
- Featured comments
- Manual Facebook import
- Exports
- Scoring
- Badges

Each form must submit to a route handler and display success/errors in `aria-live="polite"` content.

- [ ] **Step 3: Add manual Facebook import endpoint**

Create `app/api/admin/facebook-import/route.ts`. It must:

- require an admin or moderator profile
- accept `eventId`, `districtId`, `body`, `externalSourceAuthor`, and `externalSourceUrl`
- insert into `comments` with `source = 'facebook_manual'`
- write an `audit_log` row with action `facebook_manual_import`

- [ ] **Step 4: Add CSV export endpoint**

Create `app/api/admin/export/comments/route.ts`. It must:

- require an admin or moderator profile
- accept `eventId`
- fetch comments and likes
- return `text/csv`
- include headers `created_at,author,topic,body,like_count,source,moderation_status`

- [ ] **Step 5: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add app/admin app/api/admin components/admin
git commit -m "feat: add admin moderation dashboard"
```

## Task 11: Add Setup, Auth Provider, Facebook Integration, And Release Docs

**Files:**
- Create: `docs/setup/supabase.md`
- Create: `docs/setup/auth-providers.md`
- Create: `docs/integrations/facebook-groups.md`
- Modify: `README.md`

- [ ] **Step 1: Add Supabase setup docs**

Create `docs/setup/supabase.md` with:

- create a new Supabase project under "PerpetualRoyalty's Org"
- copy project URL and anon key into Vercel and local `.env.local`
- store `SUPABASE_SERVICE_ROLE_KEY` only in server environments
- link the CLI with `supabase link --project-ref <project-ref>`
- run migrations with `supabase db push`
- bootstrap `doug@goodsam.ai` as admin after first login by updating `profiles.role = 'admin'`

- [ ] **Step 2: Add auth provider setup docs**

Create `docs/setup/auth-providers.md` with:

- callback URL format: `https://protect30a.org/auth/callback`
- preview callback URL format for Vercel previews
- Supabase built-in providers: Google, Apple, Facebook, LinkedIn
- email magic link setup
- TikTok custom provider identifier: `custom:tiktok`
- Instagram custom provider identifier: `custom:instagram`
- Instagram eligibility note: Business/Creator accounts only for the supported Meta Instagram Login/API path
- feature flags: `ENABLE_TIKTOK_LOGIN`, `ENABLE_INSTAGRAM_LOGIN`

Use citations to official docs in Markdown links:

- `https://supabase.com/docs/guides/auth/social-login`
- `https://supabase.com/docs/guides/auth/custom-oauth-providers`
- `https://developers.tiktok.com/doc/login-kit-web/`
- `https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/`

- [ ] **Step 3: Add Facebook Groups integration docs**

Create `docs/integrations/facebook-groups.md` with:

- no unauthorized scraping
- manual curation mode is included in v1
- share-back mode is included in v1
- official API/Webhook mode requires Meta app permissions, review, and supported objects
- note the April 22, 2024 Groups API permission/feature deprecations from Meta

- [ ] **Step 4: Update README**

Add links to:

- `docs/setup/supabase.md`
- `docs/setup/auth-providers.md`
- `docs/integrations/facebook-groups.md`
- `/live`, `/live/[slug]`, and `/admin` route summary

- [ ] **Step 5: Verify docs and build**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add docs/setup docs/integrations README.md
git commit -m "docs: add setup and integration guidance"
```

## Task 12: End-To-End Verification And Vercel Preview

**Files:**
- Modify only files required by failures found during this task.

- [ ] **Step 1: Run local verification**

Run:

```bash
npm run test
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run local app**

Run:

```bash
npm run dev
```

Expected: Next dev server starts. Check:

- `http://localhost:3000/` serves the preserved homepage.
- `http://localhost:3000/show` serves the preserved show page.
- `http://localhost:3000/live` renders the Resident Live Room fixture or Supabase event.
- `http://localhost:3000/live/protect30a-live-community-conversation` renders the event-specific route.
- `http://localhost:3000/admin` redirects anonymous users to `/live`.

- [ ] **Step 3: Verify mobile layout**

Use a browser at mobile width. Confirm no text overlaps, no sticky share button obscures the composer, the feed is readable, buttons are at least 44px tall, and reduced-motion preferences do not block access to content.

- [ ] **Step 4: Configure Vercel environment variables**

After the Supabase project exists, set Vercel project env vars for `protect-30a`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_BRAND_NAME
NEXT_PUBLIC_CANONICAL_DOMAIN
BOOTSTRAP_ADMIN_EMAIL
ENABLE_TIKTOK_LOGIN
ENABLE_INSTAGRAM_LOGIN
ENABLE_FACEBOOK_GROUP_API
DEFAULT_REALTIME_MODE
POLLING_INTERVAL_MS
```

Add OAuth client ids/secrets when provider apps are ready.

- [ ] **Step 5: Deploy preview**

Run the Vercel deployment workflow available in the environment. If using the connected Vercel tool, deploy the current project. If using CLI, run:

```bash
npx vercel deploy
```

Expected: preview deployment reaches `READY`.

- [ ] **Step 6: Verify preview**

Check:

- `/`
- `/show`
- `/live`
- `/admin`
- canonical redirects from configured Protect30A aliases
- build logs contain no missing env exceptions for legacy pages

- [ ] **Step 7: Commit fixes**

If verification required changes:

```bash
git add .
git commit -m "fix: stabilize live engagement preview"
```

If no changes were required, do not create an empty commit.

## Self-Review Checklist

- Spec coverage:
  - Existing `/` and `/show` are preserved through legacy rewrites.
  - `/live`, `/live/[slug]`, and `/admin` are planned.
  - Supabase schema, RLS, seed data, views, and influencer scoring are planned.
  - Auth includes email, Google, Apple, Facebook, LinkedIn, TikTok, and Instagram setup.
  - Public read-only comments/leaderboards are planned.
  - Logged-in comment, like, report, and share endpoints are planned.
  - Realtime/polling fallback is planned.
  - Manual Facebook Group import and no-scraping docs are planned.
  - Vercel env and preview verification are planned.
- Placeholder scan: no task uses TBD, TODO, or unspecified implementation language.
- Type consistency:
  - `PodcastEvent`, `District`, `LiveComment`, `LiveMetrics`, and `EngagementMode` are defined before use.
  - Route handlers use the validation schemas defined in `lib/live/validation.ts`.
  - UI props in `LivePodcastPage.tsx` match the route data functions.
