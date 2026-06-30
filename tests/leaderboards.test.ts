import { calculateEngagementScore, rankScores } from "@/lib/live/scoring";
import {
  buildLiveMetricsFromComments,
  getLiveMetrics
} from "@/lib/live/data";
import { fixtureComments, fixtureEvent } from "@/lib/live/fixtures";
import type { LiveMetrics } from "@/lib/live/types";
import { EngagementDashboard } from "@/components/live/EngagementDashboard";
import { InfluencerLeaderboard } from "@/components/live/InfluencerLeaderboard";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: supabaseMocks.createSupabaseServerClient
}));

function useSupabaseEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
}

function useFixtureEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
}

function makeQueryClient(dataByTable: Record<string, unknown[]>) {
  const calls = {
    from: [] as string[],
    eq: [] as Array<{ table: string; column: string; value: unknown }>,
    order: [] as Array<{
      table: string;
      column: string;
      options?: { ascending?: boolean };
    }>,
    limit: [] as Array<{ table: string; count: number }>
  };

  const makeBuilder = (table: string) => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        calls.eq.push({ table, column, value });
        return builder;
      }),
      order: vi.fn((column: string, options?: { ascending?: boolean }) => {
        calls.order.push({ table, column, options });
        return builder;
      }),
      limit: vi.fn((count: number) => {
        calls.limit.push({ table, count });
        return Promise.resolve({
          data: (dataByTable[table] ?? []).slice(0, count),
          error: null
        });
      }),
      then: (
        resolve: (result: { data: unknown[]; error: null }) => unknown,
        reject?: (reason: unknown) => unknown
      ) =>
        Promise.resolve({
          data: dataByTable[table] ?? [],
          error: null
        }).then(resolve, reject)
    };

    return builder;
  };

  return {
    calls,
    client: {
      from: vi.fn((table: string) => {
        calls.from.push(table);
        return makeBuilder(table);
      })
    }
  };
}

function makeDashboardMetrics(): LiveMetrics {
  return {
    totalComments: 3,
    totalLikes: 18,
    totalShares: 2,
    commentsPerMinute: 1.5,
    topTopics: [
      { topic: "Stormwater", count: 2 },
      { topic: "Traffic", count: 1 }
    ],
    topicLeaderboard: [
      { topic: "Stormwater", count: 2 },
      { topic: "Traffic", count: 1 }
    ],
    topComments: [
      {
        id: "top-comment-1",
        eventId: fixtureEvent.id,
        body: "Keep the stormwater maps visible for every neighborhood.",
        topic: "Stormwater",
        createdAt: "2026-06-26T13:00:00.000Z",
        isFeatured: true,
        displayName: "Avery Resident",
        avatarUrl: null,
        districtName: "Inlet Beach",
        likeCount: 14,
        replyCount: 3
      }
    ],
    eventLeaders: [
      {
        displayName: "Avery Resident",
        avatarUrl: null,
        commentsCount: 3,
        likesReceivedCount: 14,
        sharesCount: 2,
        featuredCommentsCount: 1,
        engagementScore: 59,
        rank: 1,
        topCommentText: "Keep the stormwater maps visible for every neighborhood.",
        podcastInvitationEligible: true
      }
    ],
    weeklyDistrictLeaders: [
      {
        weekStart: "2026-06-22",
        districtId: "district-1",
        districtName: "Inlet Beach",
        districtSlug: "inlet-beach",
        displayName: "Avery Resident",
        avatarUrl: null,
        commentsCount: 3,
        likesReceivedCount: 14,
        sharesCount: 2,
        featuredCommentsCount: 1,
        engagementScore: 59,
        rank: 1,
        updatedAt: "2026-06-26T13:10:00.000Z",
        topCommentText: "Keep the stormwater maps visible for every neighborhood.",
        podcastInvitationEligible: true
      }
    ],
    allTimeDistrictLeaders: [
      {
        districtId: "district-1",
        districtName: "Inlet Beach",
        districtSlug: "inlet-beach",
        displayName: "Avery Resident",
        avatarUrl: null,
        commentsCount: 3,
        likesReceivedCount: 14,
        sharesCount: 2,
        featuredCommentsCount: 1,
        engagementScore: 59,
        rank: 1,
        topCommentText: "Keep the stormwater maps visible for every neighborhood.",
        podcastInvitationEligible: true
      }
    ],
    districtEngagementScores: [
      {
        districtId: "district-1",
        districtName: "Inlet Beach",
        districtSlug: "inlet-beach",
        commentsCount: 3,
        likesReceivedCount: 14,
        sharesCount: 2,
        featuredCommentsCount: 1,
        engagementScore: 59,
        rank: 1
      }
    ]
  };
}

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

  it("uses user id as a final deterministic tie-breaker", () => {
    const ranked = rankScores([
      { userId: "user-2", displayName: "Resident", score: 20 },
      { userId: "user-1", displayName: "Resident", score: 20 }
    ]);

    expect(ranked).toEqual([
      { userId: "user-1", displayName: "Resident", score: 20, rank: 1 },
      { userId: "user-2", displayName: "Resident", score: 20, rank: 2 }
    ]);
  });
});

describe("live dashboard data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("reads public Supabase leaderboard views with event filters and stable sorts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
    useSupabaseEnv();
    const query = makeQueryClient({
      top_comments_for_event: [
        {
          id: "comment-1",
          event_id: fixtureEvent.id,
          body: "Stormwater maps should stay visible.",
          topic: "Stormwater",
          created_at: "2026-06-26T13:00:00.000Z",
          is_featured: true,
          display_name: "Avery Resident",
          avatar_url: null,
          district_name: "Inlet Beach",
          like_count: 12,
          reply_count: 2
        }
      ],
      top_commenters_for_event: [
        {
          event_id: fixtureEvent.id,
          display_name: "Avery Resident",
          avatar_url: null,
          comments_count: 3,
          likes_received_count: 12,
          shares_count: 2,
          featured_comments_count: 1,
          engagement_score: 53,
          top_comment_text: "Direct event leader comment from the view."
        },
        {
          event_id: fixtureEvent.id,
          display_name: "Blake Resident",
          avatar_url: null,
          comments_count: 1,
          likes_received_count: 3,
          shares_count: 1,
          featured_comments_count: 0,
          engagement_score: 14,
          top_comment_text: "Blake view-backed comment."
        },
        {
          event_id: fixtureEvent.id,
          display_name: "Casey Resident",
          avatar_url: null,
          comments_count: 1,
          likes_received_count: 2,
          shares_count: 1,
          featured_comments_count: 0,
          engagement_score: 9,
          top_comment_text: "Casey view-backed comment."
        },
        {
          event_id: fixtureEvent.id,
          display_name: "Devon Resident",
          avatar_url: null,
          comments_count: 1,
          likes_received_count: 1,
          shares_count: 1,
          featured_comments_count: 0,
          engagement_score: 6,
          top_comment_text: "Devon view-backed comment."
        },
        {
          event_id: fixtureEvent.id,
          display_name: "Emery Resident",
          avatar_url: null,
          comments_count: 1,
          likes_received_count: 0,
          shares_count: 1,
          featured_comments_count: 0,
          engagement_score: 3,
          top_comment_text: "Emery view-backed comment."
        },
        {
          event_id: fixtureEvent.id,
          display_name: "Finley Resident",
          avatar_url: null,
          comments_count: 1,
          likes_received_count: 0,
          shares_count: 7,
          featured_comments_count: 0,
          engagement_score: 2,
          top_comment_text: "Hidden display leader share-heavy comment."
        }
      ],
      weekly_district_influencers: [
        {
          week_start: "2026-06-22",
          district_id: "district-1",
          district_name: "Inlet Beach",
          district_slug: "inlet-beach",
          display_name: "Avery Resident",
          avatar_url: null,
          comments_count: 3,
          likes_received_count: 12,
          shares_count: 2,
          featured_comments_count: 1,
          engagement_score: 53,
          rank: 1,
          updated_at: "2026-06-26T13:10:00.000Z",
          top_comment_text: "Weekly influencer text from the view."
        }
      ],
      live_event_metrics: [
        {
          event_id: fixtureEvent.id,
          total_comments: 2,
          total_likes: 16,
          total_shares: 15
        }
      ],
      event_district_engagement_scores: [
        {
          event_id: fixtureEvent.id,
          district_id: "district-1",
          district_name: "Inlet Beach",
          district_slug: "inlet-beach",
          comments_count: 4,
          likes_received_count: 20,
          shares_count: 3,
          featured_comments_count: 1,
          engagement_score: 80,
          rank: 1
        },
        {
          event_id: fixtureEvent.id,
          district_id: "district-2",
          district_name: "Grayton Beach",
          district_slug: "grayton-beach",
          comments_count: 2,
          likes_received_count: 7,
          shares_count: 1,
          featured_comments_count: 0,
          engagement_score: 25,
          rank: 2
        }
      ]
    });
    const comments = [
      {
        ...fixtureComments[0],
        id: "comment-older",
        created_at: "2026-06-26T12:00:00.000Z"
      },
      {
        ...fixtureComments[0],
        id: "comment-newer",
        created_at: "2026-06-26T12:10:00.000Z"
      }
    ];
    supabaseMocks.createSupabaseServerClient.mockResolvedValue(query.client);

    const metrics = await getLiveMetrics(fixtureEvent.id, comments);

    expect(query.calls.from).toEqual([
      "top_comments_for_event",
      "top_commenters_for_event",
      "weekly_district_influencers",
      "live_event_metrics",
      "event_district_engagement_scores"
    ]);
    expect(query.calls.eq).toEqual([
      {
        table: "top_comments_for_event",
        column: "event_id",
        value: fixtureEvent.id
      },
      {
        table: "top_commenters_for_event",
        column: "event_id",
        value: fixtureEvent.id
      },
      {
        table: "weekly_district_influencers",
        column: "week_start",
        value: "2026-06-29"
      },
      {
        table: "live_event_metrics",
        column: "event_id",
        value: fixtureEvent.id
      },
      {
        table: "event_district_engagement_scores",
        column: "event_id",
        value: fixtureEvent.id
      }
    ]);
    expect(query.calls.order).toEqual([
      {
        table: "top_comments_for_event",
        column: "like_count",
        options: { ascending: false }
      },
      {
        table: "top_comments_for_event",
        column: "reply_count",
        options: { ascending: false }
      },
      {
        table: "top_comments_for_event",
        column: "created_at",
        options: { ascending: false }
      },
      {
        table: "top_commenters_for_event",
        column: "engagement_score",
        options: { ascending: false }
      },
      {
        table: "weekly_district_influencers",
        column: "week_start",
        options: { ascending: false }
      },
      {
        table: "weekly_district_influencers",
        column: "rank",
        options: { ascending: true }
      },
      {
        table: "event_district_engagement_scores",
        column: "rank",
        options: { ascending: true }
      }
    ]);
    expect(query.calls.limit).toEqual([
      { table: "top_comments_for_event", count: 5 },
      { table: "top_commenters_for_event", count: 5 },
      { table: "weekly_district_influencers", count: 8 },
      { table: "event_district_engagement_scores", count: 8 }
    ]);
    expect(metrics.totalComments).toBe(2);
    expect(metrics.totalLikes).toBe(16);
    expect(metrics.totalShares).toBe(15);
    expect(metrics.commentsPerMinute).toBe(0.2);
    expect(metrics.topComments[0]).toMatchObject({
      body: "Stormwater maps should stay visible.",
      displayName: "Avery Resident",
      likeCount: 12
    });
    expect(metrics.eventLeaders[0]).toMatchObject({
      displayName: "Avery Resident",
      engagementScore: 53,
      topCommentText: "Direct event leader comment from the view."
    });
    expect(metrics.eventLeaders).toHaveLength(5);
    expect(metrics.eventLeaders.map((leader) => leader.displayName)).not.toContain(
      "Finley Resident"
    );
    expect(metrics.weeklyDistrictLeaders[0]).toMatchObject({
      districtName: "Inlet Beach",
      displayName: "Avery Resident",
      engagementScore: 53,
      topCommentText: "Weekly influencer text from the view."
    });
    expect(metrics.districtEngagementScores).toEqual([
      {
        districtId: "district-1",
        districtName: "Inlet Beach",
        districtSlug: "inlet-beach",
        commentsCount: 4,
        likesReceivedCount: 20,
        sharesCount: 3,
        featuredCommentsCount: 1,
        engagementScore: 80,
        rank: 1
      },
      {
        districtId: "district-2",
        districtName: "Grayton Beach",
        districtSlug: "grayton-beach",
        commentsCount: 2,
        likesReceivedCount: 7,
        sharesCount: 1,
        featuredCommentsCount: 0,
        engagementScore: 25,
        rank: 2
      }
    ]);
  });

  it("derives leaderboard metrics from fixtures when Supabase is not configured", async () => {
    useFixtureEnv();

    const metrics = await getLiveMetrics(fixtureEvent.id);

    expect(supabaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(metrics.topComments[0]).toMatchObject({
      body: fixtureComments[0].body,
      districtName: "Inlet Beach",
      likeCount: 8
    });
    expect(metrics.eventLeaders[0]).toMatchObject({
      displayName: "Community member",
      commentsCount: 1,
      likesReceivedCount: 8,
      engagementScore: 35,
      topCommentText: fixtureComments[0].body,
      podcastInvitationEligible: true
    });
    expect(metrics.commentsPerMinute).toBe(1);
    expect(metrics.districtEngagementScores[0]).toMatchObject({
      districtName: "Inlet Beach",
      engagementScore: 35
    });
    expect(metrics.topicLeaderboard).toEqual([
      { topic: "Stormwater", count: 1 }
    ]);
  });

  it("keeps comment-derived metric building compatible with polling responses", () => {
    const metrics = buildLiveMetricsFromComments(fixtureComments, 3);

    expect(metrics).toMatchObject({
      totalComments: 1,
      totalLikes: 8,
      totalShares: 3,
      commentsPerMinute: 1,
      topTopics: [{ topic: "Stormwater", count: 1 }],
      topicLeaderboard: [{ topic: "Stormwater", count: 1 }]
    });
    expect(metrics.eventLeaders[0].topCommentText).toBe(fixtureComments[0].body);
  });
});

describe("dashboard and leaderboard components", () => {
  it("renders simple and detailed dashboard tabs with leaderboard content", () => {
    const metrics = makeDashboardMetrics();

    render(React.createElement(EngagementDashboard, { metrics }));

    expect(
      screen.getByRole("button", { name: "Simple Trend View" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Detailed Leaderboard View" })
    ).toBeInTheDocument();
    expect(screen.getByText("Comments")).toBeInTheDocument();
    expect(screen.getByText("Engagement score by district")).toBeInTheDocument();
    expect(screen.getByText("Inlet Beach")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Detailed Leaderboard View" })
    );

    expect(screen.getByText("Top comments")).toBeInTheDocument();
    expect(screen.getByText("Event leaders")).toBeInTheDocument();
    expect(screen.getByText("District leaders")).toBeInTheDocument();
    expect(screen.getByText("Weekly influencers")).toBeInTheDocument();
    expect(screen.getByText("Running district leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Topic leaderboard")).toBeInTheDocument();
    expect(
      screen.getByText("Keep the stormwater maps visible for every neighborhood.")
    ).toBeInTheDocument();
  });

  it("renders influencer board details and podcast eligibility", () => {
    const metrics = makeDashboardMetrics();

    render(React.createElement(InfluencerLeaderboard, { metrics }));

    expect(screen.getByText("Current event leaders")).toBeInTheDocument();
    expect(screen.getByText("Current week district leaders")).toBeInTheDocument();
    expect(screen.getByText("All-time district leaders")).toBeInTheDocument();
    expect(screen.getAllByText("Avery Resident").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/14 likes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 comments/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/59 pts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Podcast invite eligible/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Keep the stormwater maps visible for every neighborhood.")
        .length
    ).toBeGreaterThan(0);
  });
});
