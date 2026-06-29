import {
  commentInputSchema,
  isRapidDuplicateComment,
  reportInputSchema,
  shareInputSchema
} from "@/lib/live/validation";
import {
  createComment,
  reportComment,
  toggleCommentLike,
  trackShare
} from "@/lib/live/actions";
import { DELETE as unlikeComment } from "@/app/api/comments/[commentId]/like/route";
import { POST as createCommentRoute } from "@/app/api/comments/route";
import { POST as likeComment } from "@/app/api/comments/[commentId]/like/route";
import { POST as reportCommentRoute } from "@/app/api/comments/[commentId]/report/route";
import { POST as trackShareRoute } from "@/app/api/shares/route";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getCurrentUserAndProfile: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserAndProfile: actionMocks.getCurrentUserAndProfile
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: actionMocks.createSupabaseServerClient
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: actionMocks.createSupabaseAdminClient
}));

const user = { id: "33333333-3333-4333-8333-333333333333" };
const eventId = "11111111-1111-4111-8111-111111111111";
const districtId = "22222222-2222-4222-8222-222222222222";
const commentId = "44444444-4444-4444-8444-444444444444";

function signIn() {
  actionMocks.getCurrentUserAndProfile.mockResolvedValue({
    user,
    profile: {
      id: user.id,
      display_name: "Resident",
      avatar_url: null,
      role: "user",
      primary_district_id: districtId,
      is_restricted: false
    }
  });
}

function signOut() {
  actionMocks.getCurrentUserAndProfile.mockResolvedValue({
    user: null,
    profile: null
  });
}

function requestJson(body: unknown) {
  return new Request("https://protect30a.test/api", {
    method: "POST",
    body: JSON.stringify(body)
  }) as unknown as NextRequest;
}

function nextRequest() {
  return new Request("https://protect30a.test/api") as unknown as NextRequest;
}

function insertReturningSingle(data: unknown) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data, error: null })
      }))
    }))
  };
}

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

  it("does not treat matching comments outside sixty seconds as rapid duplicates", () => {
    expect(
      isRapidDuplicateComment({
        previousBody: "Same concern",
        nextBody: " same concern ",
        previousCreatedAt: new Date("2026-06-26T12:00:00Z"),
        now: new Date("2026-06-26T12:01:01Z")
      })
    ).toBe(false);
  });

  it("does not treat future previous timestamps as rapid duplicates", () => {
    expect(
      isRapidDuplicateComment({
        previousBody: "Same concern",
        nextBody: " same concern ",
        previousCreatedAt: new Date("2026-06-26T12:01:00Z"),
        now: new Date("2026-06-26T12:00:20Z")
      })
    ).toBe(false);
  });

  it("validates reports", () => {
    expect(
      reportInputSchema.parse({
        reason: "spam",
        details: "Repeated unrelated link."
      })
    ).toEqual({ reason: "spam", details: "Repeated unrelated link." });
  });

  it("normalizes report reasons before validation", () => {
    expect(
      reportInputSchema.parse({
        reason: " Spam ",
        details: "Repeated unrelated link."
      })
    ).toEqual({ reason: "spam", details: "Repeated unrelated link." });
  });

  it("rejects unsupported report reasons", () => {
    expect(() =>
      reportInputSchema.parse({
        reason: "copyright",
        details: "This reason is not in the database constraint."
      })
    ).toThrow();
  });

  it("accepts report details at the database length boundary", () => {
    expect(
      reportInputSchema.parse({
        reason: "other",
        details: "x".repeat(1000)
      }).details
    ).toHaveLength(1000);
  });

  it("rejects report details beyond the database length boundary", () => {
    expect(() =>
      reportInputSchema.parse({
        reason: "other",
        details: "x".repeat(1001)
      })
    ).toThrow();
  });

  it("normalizes share platforms before validation", () => {
    expect(
      shareInputSchema.parse({
        eventId: "11111111-1111-4111-8111-111111111111",
        platform: " TikTok "
      })
    ).toEqual({
      eventId: "11111111-1111-4111-8111-111111111111",
      platform: "tiktok"
    });
  });

  it("rejects unsupported share platforms", () => {
    expect(() =>
      shareInputSchema.parse({
        eventId: "11111111-1111-4111-8111-111111111111",
        platform: "linkedin"
      })
    ).toThrow();
  });
});

describe("live engagement mutation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
  });

  it("rejects anonymous mutation attempts", async () => {
    signOut();

    await expect(
      createComment({ eventId, body: "Please discuss stormwater." })
    ).rejects.toThrow("Sign in required to comment.");
    await expect(toggleCommentLike(commentId, true)).rejects.toThrow(
      "Sign in required to like comments."
    );
    await expect(
      reportComment(commentId, { reason: "spam" })
    ).rejects.toThrow("Sign in required to report comments.");
    await expect(trackShare({ eventId, platform: "instagram" })).rejects.toThrow(
      "Sign in required to track shares."
    );
  });

  it("validates and inserts a comment for the current user", async () => {
    const insertedComment = {
      id: commentId,
      event_id: eventId,
      district_id: districtId,
      parent_comment_id: null,
      body: "Please discuss stormwater planning.",
      topic: "Stormwater",
      user_id: user.id,
      source: "site"
    };
    const commentsTable = insertReturningSingle(insertedComment);
    actionMocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        expect(table).toBe("comments");
        return commentsTable;
      })
    });

    await expect(
      createComment({
        eventId,
        districtId,
        body: "  Please discuss stormwater planning.  ",
        topic: "Stormwater"
      })
    ).resolves.toEqual(insertedComment);

    expect(commentsTable.insert).toHaveBeenCalledWith({
      event_id: eventId,
      district_id: districtId,
      parent_comment_id: null,
      body: "Please discuss stormwater planning.",
      topic: "Stormwater",
      source: "site",
      user_id: user.id
    });
  });

  it("inserts and deletes comment likes for the current user", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const deleteLike = vi.fn(() => ({ eq: firstEq }));
    actionMocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => ({
        insert,
        delete: deleteLike
      }))
    });

    await expect(toggleCommentLike(commentId, true)).resolves.toEqual({
      liked: true
    });
    expect(insert).toHaveBeenCalledWith({
      comment_id: commentId,
      user_id: user.id
    });

    await expect(toggleCommentLike(commentId, false)).resolves.toEqual({
      liked: false
    });
    expect(deleteLike).toHaveBeenCalledOnce();
    expect(firstEq).toHaveBeenCalledWith("comment_id", commentId);
    expect(secondEq).toHaveBeenCalledWith("user_id", user.id);
  });

  it("creates a report and marks the comment reported through the admin client", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: secondEq }));
    actionMocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        expect(table).toBe("comment_reports");
        return { insert };
      })
    });
    actionMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        expect(table).toBe("comments");
        return { update };
      })
    });

    await expect(
      reportComment(commentId, {
        reason: " spam ",
        details: "Repeated unrelated link."
      })
    ).resolves.toEqual({ ok: true });

    expect(insert).toHaveBeenCalledWith({
      comment_id: commentId,
      reporter_user_id: user.id,
      reason: "spam",
      details: "Repeated unrelated link."
    });
    expect(update).toHaveBeenCalledWith({ is_reported: true });
    expect(secondEq).toHaveBeenCalledWith("id", commentId);
  });

  it("tracks supported share platforms for the current user", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    actionMocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        expect(table).toBe("event_shares");
        return { insert };
      })
    });

    await expect(
      trackShare({ eventId, platform: " Instagram " })
    ).resolves.toEqual({ ok: true });
    await expect(trackShare({ eventId, platform: "TikTok" })).resolves.toEqual({
      ok: true
    });

    expect(insert).toHaveBeenNthCalledWith(1, {
      event_id: eventId,
      user_id: user.id,
      platform: "instagram"
    });
    expect(insert).toHaveBeenNthCalledWith(2, {
      event_id: eventId,
      user_id: user.id,
      platform: "tiktok"
    });
  });
});

describe("live engagement route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
  });

  it("returns JSON success shapes from mutation routes", async () => {
    const commentsTable = insertReturningSingle({ id: commentId, event_id: eventId });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const deleteLike = vi.fn(() => ({ eq: firstEq }));
    actionMocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "comments") return commentsTable;
        return {
          insert,
          delete: deleteLike
        };
      })
    });
    actionMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
      }))
    });

    await expect(
      (await createCommentRoute(requestJson({ eventId, body: "Route comment" }))).json()
    ).resolves.toEqual({ comment: { id: commentId, event_id: eventId } });
    await expect(
      (await likeComment(nextRequest(), {
        params: Promise.resolve({ commentId })
      })).json()
    ).resolves.toEqual({ liked: true });
    await expect(
      (await unlikeComment(nextRequest(), {
        params: Promise.resolve({ commentId })
      })).json()
    ).resolves.toEqual({ liked: false });
    await expect(
      (
        await reportCommentRoute(requestJson({ reason: "other" }), {
          params: Promise.resolve({ commentId })
        })
      ).json()
    ).resolves.toEqual({ ok: true });
    await expect(
      (
        await trackShareRoute(requestJson({ eventId, platform: "tiktok" }))
      ).json()
    ).resolves.toEqual({ ok: true });
  });

  it("returns stable JSON errors for invalid route input", async () => {
    const response = await createCommentRoute(
      requestJson({ eventId, body: "bad" })
    );

    await expect(response.json()).resolves.toEqual({
      error: expect.any(String)
    });
    expect(response.status).toBe(400);
  });
});
