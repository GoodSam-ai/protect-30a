import { POST as updateBadges } from "@/app/api/admin/badges/route";
import { POST as moderateComment } from "@/app/api/admin/comments/moderate/route";
import { PATCH as updateEvent } from "@/app/api/admin/events/route";
import { GET as exportComments } from "@/app/api/admin/export/comments/route";
import { POST as importFacebookComment } from "@/app/api/admin/facebook-import/route";
import { POST as updateScoring } from "@/app/api/admin/scoring/route";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const adminMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  getCurrentUserAndProfile: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );

  return {
    ...actual,
    getCurrentUserAndProfile: adminMocks.getCurrentUserAndProfile
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: adminMocks.createSupabaseAdminClient
}));

const user = { id: "33333333-3333-4333-8333-333333333333" };
const eventId = "11111111-1111-4111-8111-111111111111";
const districtId = "22222222-2222-4222-8222-222222222222";
const commentId = "44444444-4444-4444-8444-444444444444";

function moderatorProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: user.id,
    display_name: "Moderator",
    avatar_url: null,
    role: "moderator",
    primary_district_id: null,
    is_restricted: false,
    ...overrides
  };
}

function signInAsModerator() {
  adminMocks.getCurrentUserAndProfile.mockResolvedValue({
    user,
    profile: moderatorProfile()
  });
}

function requestJson(body: unknown) {
  return new Request("https://protect30a.test/api/admin/facebook-import", {
    method: "POST",
    body: JSON.stringify(body)
  }) as unknown as NextRequest;
}

function requestJsonTo(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    body: JSON.stringify(body)
  }) as unknown as NextRequest;
}

function nextRequest(url: string) {
  return new Request(url) as unknown as NextRequest;
}

describe("admin API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["anonymous", { user: null, profile: null }],
    ["missing profile", { user, profile: null }],
    ["restricted moderator", { user, profile: moderatorProfile({ is_restricted: true }) }],
    ["ordinary user", { user, profile: moderatorProfile({ role: "user" }) }]
  ])("blocks %s from all admin mutations and exports", async (_label, session) => {
    adminMocks.getCurrentUserAndProfile.mockResolvedValue(session);

    const importResponse = await importFacebookComment(
      requestJson({
        eventId,
        body: "Imported community comment."
      })
    );
    const exportResponse = await exportComments(
      nextRequest(
        `https://protect30a.test/api/admin/export/comments?eventId=${eventId}`
      )
    );
    const eventResponse = await updateEvent(
      requestJsonTo(
        "https://protect30a.test/api/admin/events",
        { eventId, title: "Updated event", status: "live" },
        "PATCH"
      )
    );
    const moderateResponse = await moderateComment(
      requestJsonTo("https://protect30a.test/api/admin/comments/moderate", {
        commentId,
        moderationStatus: "hidden"
      })
    );
    const scoringResponse = await updateScoring(
      requestJsonTo("https://protect30a.test/api/admin/scoring", {
        commentWeight: 1,
        likeWeight: 3,
        shareWeight: 2,
        featuredWeight: 10
      })
    );
    const badgesResponse = await updateBadges(
      requestJsonTo("https://protect30a.test/api/admin/badges", {
        firstVoiceComments: 1,
        conversationStarterComments: 5,
        communitySignalScore: 25,
        podcastInviteScore: 25
      })
    );

    expect(importResponse.status).toBe(403);
    expect(exportResponse.status).toBe(403);
    expect(eventResponse.status).toBe(403);
    expect(moderateResponse.status).toBe(403);
    expect(scoringResponse.status).toBe(403);
    expect(badgesResponse.status).toBe(403);
    expect(adminMocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});

describe("event setup endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAsModerator();
  });

  it("updates podcast_events and writes audit metadata", async () => {
    const eventUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: eventId, title: "Updated live event" },
            error: null
          })
        }))
      }))
    }));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "podcast_events") return { update: eventUpdate };
        if (table === "audit_log") return { insert: auditInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await updateEvent(
      requestJsonTo(
        "https://protect30a.test/api/admin/events",
        {
          eventId,
          title: "Updated live event",
          status: "live",
          startsAt: "2026-07-03T18:00:00-05:00",
          livestreamUrl: "https://example.com/live",
          replayUrl: "",
          commentsEnabled: true,
          leaderboardEnabled: false,
          forcedEngagementMode: "realtime"
        },
        "PATCH"
      )
    );

    await expect(response.json()).resolves.toEqual({
      event: { id: eventId, title: "Updated live event" }
    });
    expect(response.status).toBe(200);
    expect(eventUpdate).toHaveBeenCalledWith({
      title: "Updated live event",
      status: "live",
      starts_at: "2026-07-03T23:00:00.000Z",
      livestream_url: "https://example.com/live",
      replay_url: null,
      comments_enabled: true,
      leaderboard_enabled: false,
      forced_engagement_mode: "realtime"
    });
    expect(auditInsert).toHaveBeenCalledWith({
      actor_user_id: user.id,
      action: "admin_event_update",
      entity_type: "podcast_event",
      entity_id: eventId,
      metadata: {
        title: "Updated live event",
        status: "live",
        starts_at: "2026-07-03T23:00:00.000Z",
        livestream_url: "https://example.com/live",
        replay_url: null,
        comments_enabled: true,
        leaderboard_enabled: false,
        forced_engagement_mode: "realtime"
      }
    });
  });
});

describe("comment moderation endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAsModerator();
  });

  it("updates moderation and featured state, then writes audit metadata", async () => {
    const commentUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: commentId },
            error: null
          })
        }))
      }))
    }));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "comments") return { update: commentUpdate };
        if (table === "audit_log") return { insert: auditInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await moderateComment(
      requestJsonTo("https://protect30a.test/api/admin/comments/moderate", {
        commentId,
        moderationStatus: "hidden",
        isFeatured: true
      })
    );

    await expect(response.json()).resolves.toEqual({
      comment: { id: commentId }
    });
    expect(response.status).toBe(200);
    expect(commentUpdate).toHaveBeenCalledWith({
      moderation_status: "hidden",
      is_hidden: true,
      is_featured: true,
      is_reported: false
    });
    expect(auditInsert).toHaveBeenCalledWith({
      actor_user_id: user.id,
      action: "admin_comment_moderation",
      entity_type: "comment",
      entity_id: commentId,
      metadata: {
        moderation_status: "hidden",
        is_hidden: true,
        is_featured: true,
        is_reported: false
      }
    });
  });

  it("keeps reports open when moderation is non-terminal unless explicitly resolved", async () => {
    const commentUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: commentId },
            error: null
          })
        }))
      }))
    }));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "comments") return { update: commentUpdate };
        if (table === "audit_log") return { insert: auditInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await moderateComment(
      requestJsonTo("https://protect30a.test/api/admin/comments/moderate", {
        commentId,
        moderationStatus: "pending"
      })
    );

    expect(response.status).toBe(200);
    expect(commentUpdate).toHaveBeenCalledWith({
      moderation_status: "pending",
      is_hidden: false
    });
  });
});

describe("scoring settings endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAsModerator();
  });

  it("upserts scoring settings and writes audit metadata", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "admin_settings") return { upsert };
        if (table === "audit_log") return { insert: auditInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await updateScoring(
      requestJsonTo("https://protect30a.test/api/admin/scoring", {
        commentWeight: 1,
        likeWeight: 4,
        shareWeight: 2,
        featuredWeight: 12
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      {
        key: "engagement_scoring",
        value: {
          comment_weight: 1,
          like_weight: 4,
          share_weight: 2,
          featured_weight: 12
        },
        updated_by: user.id,
        updated_at: expect.any(String)
      },
      { onConflict: "key" }
    );
    expect(auditInsert).toHaveBeenCalledWith({
      actor_user_id: user.id,
      action: "admin_scoring_settings_update",
      entity_type: "scoring_settings",
      entity_id: null,
      metadata: {
        comment_weight: 1,
        like_weight: 4,
        share_weight: 2,
        featured_weight: 12
      }
    });
  });

  it("rejects invalid scoring settings before writes", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "admin_settings") return { upsert };
        if (table === "audit_log") return { insert: auditInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await updateScoring(
      requestJsonTo("https://protect30a.test/api/admin/scoring", {
        commentWeight: -1,
        likeWeight: 3,
        shareWeight: 2,
        featuredWeight: 10
      })
    );

    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });
});

describe("badge settings endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAsModerator();
  });

  it("upserts badge settings and writes audit metadata", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "admin_settings") return { upsert };
        if (table === "audit_log") return { insert: auditInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await updateBadges(
      requestJsonTo("https://protect30a.test/api/admin/badges", {
        firstVoiceComments: 1,
        conversationStarterComments: 5,
        communitySignalScore: 25,
        podcastInviteScore: 35
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      {
        key: "engagement_badges",
        value: {
          first_voice_comments: 1,
          conversation_starter_comments: 5,
          community_signal_score: 25,
          podcast_invite_score: 35
        },
        updated_by: user.id,
        updated_at: expect.any(String)
      },
      { onConflict: "key" }
    );
    expect(auditInsert).toHaveBeenCalledWith({
      actor_user_id: user.id,
      action: "admin_badge_settings_update",
      entity_type: "badge_settings",
      entity_id: null,
      metadata: {
        first_voice_comments: 1,
        conversation_starter_comments: 5,
        community_signal_score: 25,
        podcast_invite_score: 35
      }
    });
  });

  it("rejects invalid badge settings before writes", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "admin_settings") return { upsert };
        if (table === "audit_log") return { insert: auditInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await updateBadges(
      requestJsonTo("https://protect30a.test/api/admin/badges", {
        firstVoiceComments: 1,
        conversationStarterComments: 5,
        communitySignalScore: 25,
        podcastInviteScore: -1
      })
    );

    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });
});

describe("manual Facebook import endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAsModerator();
  });

  it("validates required fields before writing", async () => {
    const response = await importFacebookComment(
      requestJson({ eventId: "not-a-uuid", body: "bad" })
    );

    await expect(response.json()).resolves.toEqual({
      error: expect.any(String)
    });
    expect(response.status).toBe(400);
    expect(adminMocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("inserts a visible facebook_manual comment and writes audit metadata", async () => {
    const commentInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: commentId, event_id: eventId },
          error: null
        })
      }))
    }));
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "comments") return { insert: commentInsert };
        if (table === "audit_log") return { insert: auditInsert };
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await importFacebookComment(
      requestJson({
        eventId,
        districtId,
        body: "A quoted Facebook concern about parking near the beach.",
        externalSourceAuthor: "Facebook Neighbor",
        externalSourceUrl: "https://facebook.com/groups/example/posts/1"
      })
    );

    await expect(response.json()).resolves.toEqual({
      comment: { id: commentId, event_id: eventId }
    });
    expect(response.status).toBe(200);
    expect(commentInsert).toHaveBeenCalledWith({
      event_id: eventId,
      district_id: districtId,
      user_id: null,
      parent_comment_id: null,
      body: "A quoted Facebook concern about parking near the beach.",
      topic: null,
      source: "facebook_manual",
      external_source_author: "Facebook Neighbor",
      external_source_url: "https://facebook.com/groups/example/posts/1",
      moderation_status: "visible",
      is_hidden: false,
      is_reported: false
    });
    expect(auditInsert).toHaveBeenCalledWith({
      actor_user_id: user.id,
      action: "facebook_manual_import",
      entity_type: "comment",
      entity_id: commentId,
      metadata: {
        event_id: eventId,
        district_id: districtId,
        external_source_author: "Facebook Neighbor",
        external_source_url: "https://facebook.com/groups/example/posts/1"
      }
    });
  });
});

describe("comment export endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAsModerator();
  });

  it("returns escaped CSV with exact headers and public-safe authors", async () => {
    const commentsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "comment-1",
                created_at: "2026-06-30T12:00:00Z",
                body: "Line one,\n\"quoted\" line",
                topic: "Parking",
                source: "site",
                moderation_status: "visible",
                external_source_author: null,
                profiles: { display_name: "Resident, One" }
              },
              {
                id: "comment-2",
                created_at: "2026-06-30T12:05:00Z",
                body: "Facebook body",
                topic: null,
                source: "facebook_manual",
                moderation_status: "visible",
                external_source_author: "FB Neighbor",
                profiles: null
              }
            ],
            error: null
          })
        }))
      }))
    };
    const likesQuery = {
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: [
            { comment_id: "comment-1" },
            { comment_id: "comment-1" },
            { comment_id: "comment-2" }
          ],
          error: null
        })
      }))
    };
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "comments") return commentsQuery;
        if (table === "comment_likes") return likesQuery;
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await exportComments(
      nextRequest(
        `https://protect30a.test/api/admin/export/comments?eventId=${eventId}`
      )
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv.split("\n")[0]).toBe(
      "created_at,author,topic,body,like_count,source,moderation_status"
    );
    expect(csv).toContain(
      '2026-06-30T12:00:00Z,"Resident, One",Parking,"Line one,\n""quoted"" line",2,site,visible'
    );
    expect(csv).toContain(
      "2026-06-30T12:05:00Z,FB Neighbor,,Facebook body,1,facebook_manual,visible"
    );
  });

  it("neutralizes spreadsheet formula injection in exported text fields", async () => {
    const commentsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "comment-1",
                created_at: "2026-06-30T12:00:00Z",
                body: "=IMPORTXML(\"https://example.com\")",
                topic: "+Topic",
                source: "site",
                moderation_status: "visible",
                external_source_author: "@Attacker",
                profiles: null
              }
            ],
            error: null
          })
        }))
      }))
    };
    const likesQuery = {
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ data: [], error: null })
      }))
    };
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "comments") return commentsQuery;
        if (table === "comment_likes") return likesQuery;
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await exportComments(
      nextRequest(
        `https://protect30a.test/api/admin/export/comments?eventId=${eventId}`
      )
    );
    const csv = await response.text();

    expect(csv).toContain(
      '2026-06-30T12:00:00Z,\'@Attacker,\'+Topic,"\'=IMPORTXML(""https://example.com"")",0,site,visible'
    );
  });

  it("neutralizes control and whitespace-prefixed spreadsheet formulas", async () => {
    const commentsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "comment-1",
                created_at: "2026-06-30T12:00:00Z",
                body: "\r=WEBSERVICE(\"https://example.com\")",
                topic: "  +Topic",
                source: "site",
                moderation_status: "visible",
                external_source_author: "\n=Author",
                profiles: null
              },
              {
                id: "comment-2",
                created_at: "2026-06-30T12:05:00Z",
                body: "\n=HYPERLINK(\"https://example.com\")",
                topic: " \t@Injected",
                source: "site",
                moderation_status: "visible",
                external_source_author: " Safe Author",
                profiles: null
              }
            ],
            error: null
          })
        }))
      }))
    };
    const likesQuery = {
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: [{ comment_id: "comment-1" }],
          error: null
        })
      }))
    };
    adminMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "comments") return commentsQuery;
        if (table === "comment_likes") return likesQuery;
        throw new Error(`Unexpected table ${table}`);
      })
    });

    const response = await exportComments(
      nextRequest(
        `https://protect30a.test/api/admin/export/comments?eventId=${eventId}`
      )
    );
    const csv = await response.text();

    expect(csv).toContain(
      '2026-06-30T12:00:00Z,\'=Author,\'  +Topic,"\'\r=WEBSERVICE(""https://example.com"")",1,site,visible'
    );
    expect(csv).toContain(
      '2026-06-30T12:05:00Z,Safe Author,\' \t@Injected,"\'\n=HYPERLINK(""https://example.com"")",0,site,visible'
    );
  });
});
