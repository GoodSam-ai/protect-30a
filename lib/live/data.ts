import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fixtureComments,
  fixtureDistricts,
  fixtureEvent
} from "./fixtures";
import { calculateEngagementScore, rankScores } from "./scoring";
import type {
  LiveComment,
  LiveDistrictEngagementScore,
  LiveDistrictInfluencerScore,
  LiveInfluencerScore,
  LiveMetrics,
  LiveTopComment
} from "./types";

const PODCAST_INVITATION_SCORE_THRESHOLD = 30;

type VisibleCommentRow = {
  id: string;
  event_id: string;
  district_id: string | null;
  parent_comment_id: string | null;
  body: string;
  topic: string | null;
  is_featured: boolean;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  like_count: number | null;
};

type TopCommentRow = {
  id: string;
  event_id: string;
  body: string;
  topic: string | null;
  created_at: string;
  is_featured: boolean;
  display_name: string | null;
  avatar_url: string | null;
  district_name: string | null;
  like_count: number | null;
  reply_count: number | null;
};

type TopCommenterRow = {
  event_id: string;
  display_name: string | null;
  avatar_url: string | null;
  comments_count: number | null;
  likes_received_count: number | null;
  shares_count: number | null;
  featured_comments_count: number | null;
  engagement_score: number | string | null;
};

type WeeklyDistrictInfluencerRow = {
  week_start: string | null;
  district_id: string | null;
  district_name: string | null;
  district_slug: string | null;
  display_name: string | null;
  avatar_url: string | null;
  comments_count: number | null;
  likes_received_count: number | null;
  shares_count: number | null;
  featured_comments_count: number | null;
  engagement_score: number | string | null;
  rank: number | null;
  updated_at: string | null;
};

function hasSupabaseEnv() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (hasUrl !== hasAnonKey) {
    throw new Error(
      "Supabase environment variables are partially configured."
    );
  }

  return hasUrl && hasAnonKey;
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
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getVisibleComments(
  eventId: string
): Promise<LiveComment[]> {
  if (!hasSupabaseEnv()) {
    return fixtureComments.filter((comment) => comment.event_id === eventId);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("visible_comments")
    .select(
      "id, event_id, district_id, parent_comment_id, body, topic, is_featured, created_at, display_name, avatar_url, like_count"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as VisibleCommentRow[]).map((comment) => ({
    id: comment.id,
    event_id: comment.event_id,
    district_id: comment.district_id,
    user_id: null,
    parent_comment_id: comment.parent_comment_id,
    body: comment.body,
    topic: comment.topic,
    is_featured: comment.is_featured,
    created_at: comment.created_at,
    like_count: comment.like_count ?? 0,
    liked_by_me: false,
    author_display_name: comment.display_name || "Community member",
    author_avatar_url: comment.avatar_url
  }));
}

export function buildLiveMetricsFromComments(
  comments: LiveComment[],
  totalShares = 0
): LiveMetrics {
  const topTopics = buildTopicLeaderboard(comments);
  const topComments = buildTopCommentsFromComments(comments);
  const eventLeaders = buildEventLeadersFromComments(comments, totalShares);
  const districtEngagementScores = buildDistrictScoresFromComments(
    comments,
    totalShares
  );
  const districtLeaders = buildDistrictLeadersFromComments(comments, totalShares);

  return {
    totalComments: comments.length,
    totalLikes: comments.reduce((sum, comment) => sum + comment.like_count, 0),
    totalShares,
    commentsPerMinute: 0,
    topTopics,
    topicLeaderboard: topTopics,
    topComments,
    eventLeaders,
    weeklyDistrictLeaders: districtLeaders,
    allTimeDistrictLeaders: districtLeaders,
    districtEngagementScores
  };
}

export async function getLiveMetrics(
  eventId: string,
  comments?: LiveComment[]
): Promise<LiveMetrics> {
  const loadedComments = comments ?? (await getVisibleComments(eventId));
  const commentMetrics = buildLiveMetricsFromComments(loadedComments);

  if (!hasSupabaseEnv()) return commentMetrics;

  const supabase = await createSupabaseServerClient();
  const [topCommentsResult, eventLeadersResult, weeklyLeadersResult] =
    await Promise.all([
      supabase
        .from("top_comments_for_event")
        .select(
          "id, event_id, body, topic, created_at, is_featured, display_name, avatar_url, district_name, like_count, reply_count"
        )
        .eq("event_id", eventId)
        .order("like_count", { ascending: false })
        .order("reply_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("top_commenters_for_event")
        .select(
          "event_id, display_name, avatar_url, comments_count, likes_received_count, shares_count, featured_comments_count, engagement_score"
        )
        .eq("event_id", eventId)
        .order("engagement_score", { ascending: false })
        .limit(5),
      supabase
        .from("weekly_district_influencers")
        .select(
          "week_start, district_id, district_name, district_slug, display_name, avatar_url, comments_count, likes_received_count, shares_count, featured_comments_count, engagement_score, rank, updated_at"
        )
        .eq("week_start", getCurrentWeekStartDate())
        .order("week_start", { ascending: false })
        .order("rank", { ascending: true })
        .limit(8)
    ]);

  if (topCommentsResult.error) throw topCommentsResult.error;
  if (eventLeadersResult.error) throw eventLeadersResult.error;
  if (weeklyLeadersResult.error) throw weeklyLeadersResult.error;

  const topComments = ((topCommentsResult.data ?? []) as TopCommentRow[]).map(
    mapTopCommentRow
  );
  const eventLeaders = ((eventLeadersResult.data ?? []) as TopCommenterRow[]).map(
    (leader, index) => mapTopCommenterRow(leader, index, topComments)
  );
  const weeklyDistrictLeaders = (
    (weeklyLeadersResult.data ?? []) as WeeklyDistrictInfluencerRow[]
  ).map((leader) => mapWeeklyDistrictInfluencerRow(leader, topComments));

  return {
    ...commentMetrics,
    topComments,
    eventLeaders,
    weeklyDistrictLeaders,
    allTimeDistrictLeaders: [],
    districtEngagementScores:
      weeklyDistrictLeaders.length > 0
        ? buildDistrictScoresFromWeeklyLeaders(weeklyDistrictLeaders)
        : commentMetrics.districtEngagementScores
  };
}

function buildTopicLeaderboard(comments: LiveComment[]) {
  return Object.entries(
    comments.reduce<Record<string, number>>((acc, comment) => {
      if (comment.topic) acc[comment.topic] = (acc[comment.topic] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([topic, count]) => ({ topic, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.topic.localeCompare(right.topic);
    });
}

function buildTopCommentsFromComments(comments: LiveComment[]): LiveTopComment[] {
  return [...comments]
    .sort((left, right) => {
      if (right.like_count !== left.like_count) {
        return right.like_count - left.like_count;
      }
      return (
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
      );
    })
    .slice(0, 5)
    .map((comment) => {
      const district = fixtureDistricts.find(
        (item) => item.id === comment.district_id
      );

      return {
        id: comment.id,
        eventId: comment.event_id,
        body: comment.body,
        topic: comment.topic,
        createdAt: comment.created_at,
        isFeatured: comment.is_featured,
        displayName: comment.author_display_name || "Community member",
        avatarUrl: comment.author_avatar_url,
        districtName: district?.name ?? null,
        likeCount: comment.like_count,
        replyCount: 0
      };
    });
}

function buildEventLeadersFromComments(
  comments: LiveComment[],
  totalShares: number
): LiveInfluencerScore[] {
  const authors = new Map<
    string,
    {
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      commentsCount: number;
      likesReceivedCount: number;
      sharesCount: number;
      featuredCommentsCount: number;
      topCommentText: string | null;
      topCommentLikes: number;
    }
  >();

  for (const comment of comments) {
    const displayName = comment.author_display_name || "Community member";
    const userId = comment.user_id ?? `public:${displayName.toLowerCase()}`;
    const existing =
      authors.get(userId) ??
      {
        userId,
        displayName,
        avatarUrl: comment.author_avatar_url,
        commentsCount: 0,
        likesReceivedCount: 0,
        sharesCount: 0,
        featuredCommentsCount: 0,
        topCommentText: null,
        topCommentLikes: -1
      };

    existing.commentsCount += 1;
    existing.likesReceivedCount += comment.like_count;
    existing.sharesCount += 0;
    existing.featuredCommentsCount += comment.is_featured ? 1 : 0;
    if (comment.like_count > existing.topCommentLikes) {
      existing.topCommentText = comment.body;
      existing.topCommentLikes = comment.like_count;
    }
    authors.set(userId, existing);
  }

  return rankScores(
    Array.from(authors.values()).map((author) => ({
      ...author,
      score: calculateEngagementScore(author)
    }))
  )
    .slice(0, 5)
    .map(({ score, rank, ...author }) => ({
      displayName: author.displayName,
      avatarUrl: author.avatarUrl,
      commentsCount: author.commentsCount,
      likesReceivedCount: author.likesReceivedCount,
      sharesCount: author.sharesCount,
      featuredCommentsCount: author.featuredCommentsCount,
      engagementScore: score,
      rank,
      topCommentText: author.topCommentText,
      podcastInvitationEligible: isPodcastInvitationEligible(score)
    }));
}

function buildDistrictScoresFromComments(
  comments: LiveComment[],
  totalShares: number
): LiveDistrictEngagementScore[] {
  const districts = new Map<
    string,
    Omit<LiveDistrictEngagementScore, "rank" | "engagementScore">
  >();

  for (const comment of comments) {
    const district = fixtureDistricts.find(
      (item) => item.id === comment.district_id
    );
    const key = comment.district_id ?? "unknown";
    const existing =
      districts.get(key) ??
      {
        districtId: comment.district_id,
        districtName: district?.name ?? "District pending",
        districtSlug: district?.slug ?? null,
        commentsCount: 0,
        likesReceivedCount: 0,
        sharesCount: 0,
        featuredCommentsCount: 0
      };

    existing.commentsCount += 1;
    existing.likesReceivedCount += comment.like_count;
    existing.sharesCount += 0;
    existing.featuredCommentsCount += comment.is_featured ? 1 : 0;
    districts.set(key, existing);
  }

  return Array.from(districts.values())
    .map((district) => ({
      ...district,
      engagementScore: calculateEngagementScore(district)
    }))
    .sort((left, right) => {
      if (right.engagementScore !== left.engagementScore) {
        return right.engagementScore - left.engagementScore;
      }
      return left.districtName.localeCompare(right.districtName);
    })
    .map((district, index) => ({ ...district, rank: index + 1 }));
}

function buildDistrictLeadersFromComments(
  comments: LiveComment[],
  totalShares: number
): LiveDistrictInfluencerScore[] {
  const eventLeaders = buildEventLeadersFromComments(comments, totalShares);

  return eventLeaders.map((leader) => {
    const comment = comments.find(
      (item) =>
        (item.author_display_name || "Community member") === leader.displayName
    );
    const district = fixtureDistricts.find(
      (item) => item.id === comment?.district_id
    );

    return {
      ...leader,
      districtId: comment?.district_id ?? null,
      districtName: district?.name ?? "District pending",
      districtSlug: district?.slug ?? null
    };
  });
}

function buildDistrictScoresFromWeeklyLeaders(
  weeklyLeaders: LiveDistrictInfluencerScore[]
): LiveDistrictEngagementScore[] {
  const latestByDistrict = new Map<string, LiveDistrictEngagementScore>();

  for (const leader of weeklyLeaders) {
    const key = leader.districtId ?? leader.districtName;
    if (latestByDistrict.has(key)) continue;

    latestByDistrict.set(key, {
      districtId: leader.districtId,
      districtName: leader.districtName,
      districtSlug: leader.districtSlug,
      commentsCount: leader.commentsCount,
      likesReceivedCount: leader.likesReceivedCount,
      sharesCount: leader.sharesCount,
      featuredCommentsCount: leader.featuredCommentsCount,
      engagementScore: leader.engagementScore,
      rank: leader.rank
    });
  }

  return Array.from(latestByDistrict.values()).sort((left, right) => {
    if (right.engagementScore !== left.engagementScore) {
      return right.engagementScore - left.engagementScore;
    }
    return left.districtName.localeCompare(right.districtName);
  });
}

function mapTopCommentRow(row: TopCommentRow): LiveTopComment {
  return {
    id: row.id,
    eventId: row.event_id,
    body: row.body,
    topic: row.topic,
    createdAt: row.created_at,
    isFeatured: row.is_featured,
    displayName: row.display_name || "Community member",
    avatarUrl: row.avatar_url,
    districtName: row.district_name,
    likeCount: row.like_count ?? 0,
    replyCount: row.reply_count ?? 0
  };
}

function mapTopCommenterRow(
  row: TopCommenterRow,
  index: number,
  topComments: LiveTopComment[]
): LiveInfluencerScore {
  const engagementScore = Number(row.engagement_score ?? 0);
  const displayName = row.display_name || "Community member";

  return {
    displayName,
    avatarUrl: row.avatar_url,
    commentsCount: row.comments_count ?? 0,
    likesReceivedCount: row.likes_received_count ?? 0,
    sharesCount: row.shares_count ?? 0,
    featuredCommentsCount: row.featured_comments_count ?? 0,
    engagementScore,
    rank: index + 1,
    topCommentText:
      topComments.find((comment) => comment.displayName === displayName)?.body ??
      null,
    podcastInvitationEligible: isPodcastInvitationEligible(engagementScore)
  };
}

function mapWeeklyDistrictInfluencerRow(
  row: WeeklyDistrictInfluencerRow,
  topComments: LiveTopComment[]
): LiveDistrictInfluencerScore {
  const engagementScore = Number(row.engagement_score ?? 0);
  const displayName = row.display_name || "Community member";

  return {
    weekStart: row.week_start ?? undefined,
    districtId: row.district_id,
    districtName: row.district_name || "District pending",
    districtSlug: row.district_slug,
    displayName,
    avatarUrl: row.avatar_url,
    commentsCount: row.comments_count ?? 0,
    likesReceivedCount: row.likes_received_count ?? 0,
    sharesCount: row.shares_count ?? 0,
    featuredCommentsCount: row.featured_comments_count ?? 0,
    engagementScore,
    rank: row.rank ?? 0,
    updatedAt: row.updated_at ?? undefined,
    topCommentText:
      topComments.find((comment) => comment.displayName === displayName)?.body ??
      null,
    podcastInvitationEligible: isPodcastInvitationEligible(engagementScore)
  };
}

function isPodcastInvitationEligible(score: number) {
  return score >= PODCAST_INVITATION_SCORE_THRESHOLD;
}

function getCurrentWeekStartDate(now = new Date()) {
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  return weekStart.toISOString().slice(0, 10);
}
