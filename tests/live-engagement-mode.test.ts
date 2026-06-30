import {
  dedupeCommentsById,
  reduceEngagementMode
} from "@/lib/live/realtime";
import type { LiveComment } from "@/lib/live/types";
import { GET } from "@/app/api/live/[eventId]/route";
import { beforeEach, describe, expect, it, vi } from "vitest";

const liveDataMocks = vi.hoisted(() => ({
  buildLiveMetricsFromComments: vi.fn(),
  getLiveMetrics: vi.fn(),
  getVisibleComments: vi.fn()
}));

vi.mock("@/lib/live/data", () => ({
  buildLiveMetricsFromComments: liveDataMocks.buildLiveMetricsFromComments,
  getLiveMetrics: liveDataMocks.getLiveMetrics,
  getVisibleComments: liveDataMocks.getVisibleComments
}));

const baseComment: LiveComment = {
  id: "comment-1",
  event_id: "event-1",
  district_id: null,
  user_id: null,
  parent_comment_id: null,
  body: "Protect public access.",
  topic: "access",
  is_featured: false,
  created_at: "2026-06-26T12:00:00.000Z",
  like_count: 1,
  liked_by_me: false,
  author_display_name: "Community member",
  author_avatar_url: null
};

describe("live engagement mode reducer", () => {
  it("starts in realtime when auto mode connects", () => {
    expect(
      reduceEngagementMode(
        { requestedMode: "auto", activeMode: "polling", failures: 0 },
        { type: "realtime_connected" }
      )
    ).toEqual({ requestedMode: "auto", activeMode: "realtime", failures: 0 });
  });

  it("falls back after repeated realtime failures", () => {
    expect(
      reduceEngagementMode(
        { requestedMode: "auto", activeMode: "realtime", failures: 2 },
        { type: "realtime_failed" }
      )
    ).toEqual({ requestedMode: "auto", activeMode: "polling", failures: 3 });
  });

  it("selects manual polling mode without carrying realtime failures", () => {
    expect(
      reduceEngagementMode(
        { requestedMode: "auto", activeMode: "realtime", failures: 2 },
        { type: "manual_mode_selected", mode: "polling" }
      )
    ).toEqual({
      requestedMode: "polling",
      activeMode: "polling",
      failures: 0
    });
  });
});

describe("dedupeCommentsById", () => {
  it("keeps the latest comment payload in first-seen order", () => {
    const updatedComment = {
      ...baseComment,
      body: "Protect public access and dunes.",
      like_count: 4
    };
    const secondComment = {
      ...baseComment,
      id: "comment-2",
      body: "Keep the beach safe."
    };

    expect(
      dedupeCommentsById([baseComment, secondComment], [updatedComment])
    ).toEqual([updatedComment, secondComment]);
  });
});

describe("GET /api/live/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveDataMocks.getLiveMetrics.mockResolvedValue({
      totalComments: 0,
      totalLikes: 0,
      totalShares: 0,
      commentsPerMinute: 0,
      topTopics: [],
      topicLeaderboard: [],
      topComments: [],
      eventLeaders: [],
      weeklyDistrictLeaders: [],
      allTimeDistrictLeaders: [],
      districtEngagementScores: []
    });
  });

  it("returns a controlled 400 JSON error for invalid event ids", async () => {
    const response = await GET(new Request("http://localhost/api/live/nope"), {
      params: Promise.resolve({ eventId: "nope" })
    });

    await expect(response.json()).resolves.toEqual({
      error: "Invalid event id."
    });
    expect(response.status).toBe(400);
    expect(liveDataMocks.getVisibleComments).not.toHaveBeenCalled();
  });

  it("returns refreshed dashboard metrics from the view-backed live metrics loader", async () => {
    const eventId = "10000000-0000-4000-8000-000000000001";
    const comments = [{ ...baseComment, event_id: eventId }];
    const metrics = {
      totalComments: 1,
      totalLikes: 1,
      totalShares: 4,
      commentsPerMinute: 1,
      topTopics: [{ topic: "access", count: 1 }],
      topicLeaderboard: [{ topic: "access", count: 1 }],
      topComments: [
        {
          id: "comment-1",
          eventId,
          body: "Protect public access.",
          topic: "access",
          createdAt: "2026-06-26T12:00:00.000Z",
          isFeatured: false,
          displayName: "Community member",
          avatarUrl: null,
          districtName: null,
          likeCount: 1,
          replyCount: 0
        }
      ],
      eventLeaders: [],
      weeklyDistrictLeaders: [],
      allTimeDistrictLeaders: [],
      districtEngagementScores: []
    };
    liveDataMocks.getVisibleComments.mockResolvedValue(comments);
    liveDataMocks.getLiveMetrics.mockResolvedValue(metrics);

    const response = await GET(new Request(`http://localhost/api/live/${eventId}`), {
      params: Promise.resolve({ eventId })
    });

    await expect(response.json()).resolves.toEqual({ comments, metrics });
    expect(liveDataMocks.getLiveMetrics).toHaveBeenCalledWith(eventId, comments);
    expect(liveDataMocks.buildLiveMetricsFromComments).not.toHaveBeenCalled();
  });

  it("returns a controlled 500 JSON error when live data loading fails", async () => {
    liveDataMocks.getVisibleComments.mockRejectedValue(
      new Error("database unavailable")
    );

    const response = await GET(new Request("http://localhost/api/live/event"), {
      params: Promise.resolve({
        eventId: "10000000-0000-4000-8000-000000000001"
      })
    });

    await expect(response.json()).resolves.toEqual({
      error: "Unable to load live engagement data."
    });
    expect(response.status).toBe(500);
  });
});
