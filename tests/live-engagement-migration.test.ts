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
});
