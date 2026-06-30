import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/202606260001_live_engagement.sql"),
  "utf8"
);

function extractViewSelectList(
  viewName: string,
  selectMarker: string,
  fromClause: string
): string {
  const viewStart = migration.indexOf(`create or replace view public.${viewName} as`);
  expect(viewStart).toBeGreaterThanOrEqual(0);

  const selectStart = migration.indexOf(selectMarker, viewStart);
  const fromStart = migration.indexOf(fromClause, selectStart);
  expect(selectStart).toBeGreaterThanOrEqual(0);
  expect(fromStart).toBeGreaterThan(selectStart);

  return migration.slice(selectStart, fromStart);
}

function extractFunctionBody(functionName: string): string {
  const functionStart = migration.indexOf(
    `create or replace function public.${functionName}()`
  );
  expect(functionStart).toBeGreaterThanOrEqual(0);

  const bodyStart = migration.indexOf("as $$", functionStart);
  const bodyEnd = migration.indexOf("$$;", bodyStart);
  expect(bodyStart).toBeGreaterThan(functionStart);
  expect(bodyEnd).toBeGreaterThan(bodyStart);

  return migration.slice(bodyStart, bodyEnd);
}

describe("live engagement migration contracts", () => {
  it("does not expose stable auth user ids in public engagement view select lists", () => {
    expect(
      extractViewSelectList(
        "visible_comments",
        "select\n  c.id",
        "from public.comments c"
      )
    ).not.toMatch(/\buser_id\b/);

    expect(
      extractViewSelectList(
        "top_commenters_for_event",
        "select\n  cs.event_id",
        "from comment_stats cs"
      )
    ).not.toMatch(/\buser_id\b/);

    expect(
      extractViewSelectList(
        "weekly_district_influencers",
        "select\n  scores.week_start",
        "from public.district_influencer_scores scores"
      )
    ).not.toMatch(/\buser_id\b/);

    expect(
      extractViewSelectList(
        "live_event_metrics",
        "select\n  pe.id as event_id",
        "from public.podcast_events pe"
      )
    ).not.toMatch(/\b(user_id|profile_id)\b/);

    expect(
      extractViewSelectList(
        "event_district_engagement_scores",
        "select\n  ranked.event_id",
        "from ranked"
      )
    ).not.toMatch(/\b(user_id|profile_id)\b/);
  });

  it("exposes public event metrics and district aggregate views without raw ids", () => {
    expect(migration).toContain(
      "create or replace view public.live_event_metrics as"
    );
    expect(migration).toContain(
      "create or replace view public.event_district_engagement_scores as"
    );
    expect(migration).toContain("count(es.id)::int as total_shares");
    expect(migration).toContain(
      "row_number() over (partition by district_base.event_id order by district_base.engagement_score desc, district_base.district_name asc)"
    );
    expect(migration).toContain(
      "grant select on public.visible_comments, public.top_comments_for_event, public.top_commenters_for_event, public.weekly_district_influencers, public.live_event_metrics, public.event_district_engagement_scores to anon, authenticated"
    );
  });

  it("exposes sanitized top comment text on public leaderboard views", () => {
    expect(
      extractViewSelectList(
        "top_commenters_for_event",
        "select\n  cs.event_id",
        "from comment_stats cs"
      )
    ).toContain("top_comment_text");
    expect(
      extractViewSelectList(
        "weekly_district_influencers",
        "select\n  scores.week_start",
        "from public.district_influencer_scores scores"
      )
    ).toContain("top_comment_text");
  });

  it("does not grant direct public access to raw profile or influencer score rows", () => {
    expect(migration).toContain(
      "revoke all on table public.public_profiles from public, anon, authenticated"
    );
    expect(migration).not.toContain(
      'create policy "public read influencer scores"'
    );
    expect(migration).toContain(
      "revoke all on table public.district_influencer_scores from anon, authenticated"
    );
  });

  it("allows owned non-restricted profiles to update public fields without candidate flags blocking them", () => {
    const policyStart = migration.indexOf(
      'create policy "users update own profile"'
    );
    const policyEnd = migration.indexOf(
      'create policy "admins manage profiles"',
      policyStart
    );
    const policy = migration.slice(policyStart, policyEnd);

    expect(policy).toContain("id = auth.uid()");
    expect(policy).toContain("is_restricted = false");
    expect(policy).not.toContain("is_candidate = false");
    expect(policy).not.toContain("is_potential_guest = false");
    expect(policy).not.toContain("role = 'user'");
  });

  it("validates direct report reasons/details and share platforms at the database layer", () => {
    expect(migration).toContain("constraint comment_reports_reason_check");
    expect(migration).toContain("constraint comment_reports_details_length_check");
    expect(migration).toContain("constraint event_shares_platform_check");
    expect(migration).toContain("'spam', 'harassment', 'misinformation', 'off_topic', 'other'");
    expect(migration).toContain("'facebook', 'instagram', 'tiktok', 'x', 'email', 'copy_link', 'other'");
  });

  it("attaches engagement insert triggers to the matching field normalization bodies", () => {
    const likeBody = extractFunctionBody("prepare_comment_like_insert");
    expect(likeBody).toContain("new.created_at = now()");
    expect(likeBody).not.toMatch(/new\.(reason|details|platform)\b/);
    expect(migration).toContain(
      "before insert on public.comment_likes\nfor each row\nexecute function public.prepare_comment_like_insert()"
    );

    const reportBody = extractFunctionBody("prepare_comment_report_insert");
    expect(reportBody).toContain("new.created_at = now()");
    expect(reportBody).toContain("new.reason = lower(trim(new.reason))");
    expect(reportBody).toContain("new.details = nullif(trim(new.details), '')");
    expect(reportBody).not.toMatch(/new\.platform\b/);
    expect(migration).toContain(
      "before insert on public.comment_reports\nfor each row\nexecute function public.prepare_comment_report_insert()"
    );

    const shareBody = extractFunctionBody("prepare_event_share_insert");
    expect(shareBody).toContain("new.created_at = now()");
    expect(shareBody).toContain("new.platform = lower(trim(new.platform))");
    expect(shareBody).not.toMatch(/new\.(reason|details)\b/);
    expect(migration).toContain(
      "before insert on public.event_shares\nfor each row\nexecute function public.prepare_event_share_insert()"
    );
  });
});
