import {
  dedupeCommentsById,
  reduceEngagementMode
} from "@/lib/live/realtime";
import type { LiveComment } from "@/lib/live/types";
import { describe, expect, it } from "vitest";

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
