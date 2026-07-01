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
    `create or replace function public.${functionName}`
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
        "select\n  active_users.event_id",
        "from active_users"
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
        "select\n  active_users.event_id",
        "from active_users"
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

  it("defines persisted admin engagement settings with scoring and badge defaults", () => {
    expect(migration).toContain("create table public.admin_settings");
    expect(migration).toContain("key text primary key");
    expect(migration).toContain("value jsonb not null");
    expect(migration).toContain("'engagement_scoring'");
    expect(migration).toContain("'engagement_badges'");
    expect(migration).toContain('"comment_weight": 1');
    expect(migration).toContain('"like_weight": 3');
    expect(migration).toContain('"share_weight": 2');
    expect(migration).toContain('"featured_weight": 10');
    expect(migration).not.toContain('"podcast_invite_threshold"');
    expect(migration).toContain('"podcast_invite_score": 30');
    expect(migration).toContain("alter table public.admin_settings enable row level security");
    expect(migration).toContain(
      'create policy "public read admin settings" on public.admin_settings'
    );
  });

  it("uses persisted scoring settings in SQL leaderboard scoring", () => {
    const topCommentersStart = migration.indexOf(
      "create or replace view public.top_commenters_for_event as"
    );
    const weeklyRefreshStart = migration.indexOf(
      "create or replace function public.refresh_weekly_district_influencer_scores",
      topCommentersStart
    );
    const scoringSql = migration.slice(topCommentersStart, weeklyRefreshStart);
    const refreshSql = migration.slice(weeklyRefreshStart);

    expect(scoringSql).toContain("from public.admin_settings");
    expect(scoringSql).toContain("weights.like_weight");
    expect(scoringSql).toContain("weights.comment_weight");
    expect(scoringSql).toContain("weights.share_weight");
    expect(scoringSql).toContain("weights.featured_weight");
    expect(scoringSql).not.toContain("likes_received_count, 0) * 3 +");
    expect(scoringSql).not.toContain("comments_count, 0) * 1 +");
    expect(refreshSql).toContain("from public.admin_settings");
    expect(refreshSql).toContain("weights.like_weight");
  });

  it("selects persisted scoring settings over defaults deterministically", () => {
    expect(migration.match(/scoring_settings as \(/g)).toHaveLength(3);
    expect(migration.match(/0 as priority/g)).toHaveLength(3);
    expect(migration.match(/1 as priority/g)).toHaveLength(3);
    expect(migration.match(/order by priority\s+limit 1/g)).toHaveLength(3);
    expect(migration).not.toContain(
      "union all\n  select 1::numeric, 3::numeric, 2::numeric, 10::numeric\n  limit 1"
    );
  });

  it("includes share-only users in public event leaders without exposing ids", () => {
    const viewStart = migration.indexOf(
      "create or replace view public.top_commenters_for_event as"
    );
    const viewEnd = migration.indexOf(
      "create or replace view public.weekly_district_influencers as",
      viewStart
    );
    const viewSql = migration.slice(viewStart, viewEnd);
    const finalSelect = extractViewSelectList(
      "top_commenters_for_event",
      "select\n  active_users.event_id",
      "from active_users"
    );

    expect(viewSql).toContain("active_users as (");
    expect(viewSql).toContain("select event_id, user_id from comment_stats");
    expect(viewSql).toContain("select event_id, user_id from like_stats");
    expect(viewSql).toContain("select event_id, user_id from share_stats");
    expect(finalSelect).toContain("active_users.event_id");
    expect(finalSelect).not.toMatch(/\b(user_id|profile_id)\b/);
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

  it("creates a normal resident profile when Supabase auth creates a user", () => {
    const body = extractFunctionBody("create_profile_for_auth_user");

    expect(body).toContain("insert into public.profiles");
    expect(body).toContain("new.id");
    expect(body).toContain("new.raw_user_meta_data->>'full_name'");
    expect(body).toContain("'user'");
    expect(body).toContain("on conflict (id) do nothing");
    expect(migration).toContain(
      "after insert on auth.users\nfor each row\nexecute function public.create_profile_for_auth_user()"
    );
  });

  it("validates direct report reasons/details and share platforms at the database layer", () => {
    expect(migration).toContain("constraint comment_reports_reason_check");
    expect(migration).toContain("constraint comment_reports_details_length_check");
    expect(migration).toContain("constraint event_shares_platform_check");
    expect(migration).toContain("unique (event_id, user_id, platform)");
    expect(migration).toContain("'spam', 'harassment', 'misinformation', 'off_topic', 'other'");
    expect(migration).toContain("'facebook', 'instagram', 'tiktok', 'x', 'email', 'copy_link', 'other'");
  });

  it("prevents self-likes from engagement and scoring", () => {
    const engageBody = extractFunctionBody("can_engage_with_comment");

    expect(engageBody).toContain("c.user_id is distinct from auth.uid()");
    expect(migration).toContain(
      "left join public.comment_likes cl on cl.comment_id = c.id\n    and cl.user_id is distinct from c.user_id"
    );
    expect(migration).toContain(
      "join public.comment_likes cl on cl.comment_id = c.id\n      and cl.user_id is distinct from c.user_id"
    );
  });

  it("preserves external-source author names in public visible comments", () => {
    const viewStart = migration.indexOf(
      "create or replace view public.visible_comments as"
    );
    const viewEnd = migration.indexOf(
      "create or replace view public.top_comments_for_event as",
      viewStart
    );
    const viewSql = migration.slice(viewStart, viewEnd);

    expect(viewSql).toContain(
      "coalesce(p.display_name, c.external_source_author) as display_name"
    );
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
