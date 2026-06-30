import type { District, LiveComment, LiveMetrics, PodcastEvent } from "./types";

export const fixtureDistricts: District[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Inlet Beach",
    slug: "inlet-beach",
    description: "Inlet Beach district placeholder.",
    sort_order: 1
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Rosemary Beach",
    slug: "rosemary-beach",
    description: "Rosemary Beach district placeholder.",
    sort_order: 2
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Alys Beach",
    slug: "alys-beach",
    description: "Alys Beach district placeholder.",
    sort_order: 3
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    name: "Watersound",
    slug: "watersound",
    description: "Watersound, Seacrest, Prominence, and Origins.",
    sort_order: 4
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    name: "Seagrove",
    slug: "seagrove",
    description: "Seagrove, Seaside, and WaterColor.",
    sort_order: 5
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    name: "Grayton Beach",
    slug: "grayton-beach",
    description: "Grayton Beach and Blue Mountain Beach.",
    sort_order: 6
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    name: "Santa Rosa Beach",
    slug: "santa-rosa-beach",
    description: "Santa Rosa Beach, Gulf Place, and Dune Allen.",
    sort_order: 7
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    name: "Sandestin",
    slug: "sandestin",
    description: "Sandestin, Miramar Beach, and Seascape.",
    sort_order: 8
  }
];

export const fixtureEvent: PodcastEvent = {
  id: "20000000-0000-4000-8000-000000000001",
  district_id: fixtureDistricts[0].id,
  title: "Protect30A Live: Community Conversation",
  slug: "protect30a-live-community-conversation",
  description:
    "A district-based live podcast event for community education and conversation.",
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
  disclaimer:
    "Let me make this crystal clear: this podcast is purely for community education and conversation. We're not a government body, nor are we making any official decisions. We're committed to full transparency, because we believe that open information builds community trust.",
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
  topTopics: [{ topic: "Stormwater", count: 1 }],
  topicLeaderboard: [{ topic: "Stormwater", count: 1 }],
  topComments: [
    {
      id: fixtureComments[0].id,
      eventId: fixtureEvent.id,
      body: fixtureComments[0].body,
      topic: fixtureComments[0].topic,
      createdAt: fixtureComments[0].created_at,
      isFeatured: fixtureComments[0].is_featured,
      displayName: fixtureComments[0].author_display_name,
      avatarUrl: fixtureComments[0].author_avatar_url,
      districtName: fixtureDistricts[0].name,
      likeCount: fixtureComments[0].like_count,
      replyCount: 0
    }
  ],
  eventLeaders: [
    {
      displayName: fixtureComments[0].author_display_name,
      avatarUrl: fixtureComments[0].author_avatar_url,
      commentsCount: 1,
      likesReceivedCount: 8,
      sharesCount: 0,
      featuredCommentsCount: 1,
      engagementScore: 35,
      rank: 1,
      topCommentText: fixtureComments[0].body,
      podcastInvitationEligible: true
    }
  ],
  weeklyDistrictLeaders: [
    {
      districtId: fixtureDistricts[0].id,
      districtName: fixtureDistricts[0].name,
      districtSlug: fixtureDistricts[0].slug,
      displayName: fixtureComments[0].author_display_name,
      avatarUrl: fixtureComments[0].author_avatar_url,
      commentsCount: 1,
      likesReceivedCount: 8,
      sharesCount: 0,
      featuredCommentsCount: 1,
      engagementScore: 35,
      rank: 1,
      topCommentText: fixtureComments[0].body,
      podcastInvitationEligible: true
    }
  ],
  allTimeDistrictLeaders: [
    {
      districtId: fixtureDistricts[0].id,
      districtName: fixtureDistricts[0].name,
      districtSlug: fixtureDistricts[0].slug,
      displayName: fixtureComments[0].author_display_name,
      avatarUrl: fixtureComments[0].author_avatar_url,
      commentsCount: 1,
      likesReceivedCount: 8,
      sharesCount: 0,
      featuredCommentsCount: 1,
      engagementScore: 35,
      rank: 1,
      topCommentText: fixtureComments[0].body,
      podcastInvitationEligible: true
    }
  ],
  districtEngagementScores: [
    {
      districtId: fixtureDistricts[0].id,
      districtName: fixtureDistricts[0].name,
      districtSlug: fixtureDistricts[0].slug,
      commentsCount: 1,
      likesReceivedCount: 8,
      sharesCount: 0,
      featuredCommentsCount: 1,
      engagementScore: 35,
      rank: 1
    }
  ]
};
