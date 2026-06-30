import "server-only";

import type {
  AdminBadgeSettings,
  AdminDashboardData,
  AdminDistrictOption,
  AdminEventOption,
  AdminScoringSettings,
  ReportedCommentQueueItem
} from "@/lib/admin/types";
import { fixtureDistricts, fixtureEvent } from "@/lib/live/fixtures";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ReportedCommentRow = {
  id: string;
  created_at: string;
  body: string;
  topic: string | null;
  moderation_status: string;
  is_hidden: boolean;
  is_featured: boolean;
  is_reported: boolean;
  external_source_author: string | null;
  profiles?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null;
  comment_reports?: Array<{
    reason?: string | null;
    details?: string | null;
  }> | null;
};

type AdminEventRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  starts_at: string | null;
  livestream_url: string | null;
  replay_url: string | null;
  comments_enabled: boolean;
  leaderboard_enabled: boolean;
  forced_engagement_mode: string;
  district_id: string | null;
  is_active?: boolean | null;
};

type AdminDistrictRow = {
  id: string;
  name: string;
  slug: string;
};

type AdminSettingsRow = {
  key: string;
  value: Record<string, unknown> | null;
};

const DEFAULT_SCORING_SETTINGS: AdminScoringSettings = {
  commentWeight: 1,
  likeWeight: 3,
  shareWeight: 2,
  featuredWeight: 10
};

const DEFAULT_BADGE_SETTINGS: AdminBadgeSettings = {
  firstVoiceComments: 1,
  conversationStarterComments: 5,
  communitySignalScore: 25,
  podcastInviteScore: 30
};

function fixtureAdminEvent(): AdminEventOption {
  return {
    id: fixtureEvent.id,
    title: fixtureEvent.title,
    slug: fixtureEvent.slug,
    status: fixtureEvent.status,
    startsAt: fixtureEvent.starts_at,
    livestreamUrl: fixtureEvent.livestream_url,
    replayUrl: fixtureEvent.replay_url,
    commentsEnabled: fixtureEvent.comments_enabled,
    leaderboardEnabled: fixtureEvent.leaderboard_enabled,
    forcedEngagementMode: fixtureEvent.forced_engagement_mode,
    districtId: fixtureEvent.district_id
  };
}

function fixtureAdminDistricts(): AdminDistrictOption[] {
  return fixtureDistricts.map((district) => ({
    id: district.id,
    name: district.name,
    slug: district.slug
  }));
}

function numericSetting(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mapEvent(row: AdminEventRow): AdminEventOption {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    startsAt: row.starts_at,
    livestreamUrl: row.livestream_url,
    replayUrl: row.replay_url,
    commentsEnabled: row.comments_enabled,
    leaderboardEnabled: row.leaderboard_enabled,
    forcedEngagementMode: row.forced_engagement_mode,
    districtId: row.district_id
  };
}

function parseScoringSettings(
  value: Record<string, unknown> | null | undefined
): AdminScoringSettings {
  return {
    commentWeight: numericSetting(
      value?.comment_weight,
      DEFAULT_SCORING_SETTINGS.commentWeight
    ),
    likeWeight: numericSetting(
      value?.like_weight,
      DEFAULT_SCORING_SETTINGS.likeWeight
    ),
    shareWeight: numericSetting(
      value?.share_weight,
      DEFAULT_SCORING_SETTINGS.shareWeight
    ),
    featuredWeight: numericSetting(
      value?.featured_weight,
      DEFAULT_SCORING_SETTINGS.featuredWeight
    )
  };
}

function parseBadgeSettings(
  value: Record<string, unknown> | null | undefined
): AdminBadgeSettings {
  return {
    firstVoiceComments: numericSetting(
      value?.first_voice_comments,
      DEFAULT_BADGE_SETTINGS.firstVoiceComments
    ),
    conversationStarterComments: numericSetting(
      value?.conversation_starter_comments,
      DEFAULT_BADGE_SETTINGS.conversationStarterComments
    ),
    communitySignalScore: numericSetting(
      value?.community_signal_score,
      DEFAULT_BADGE_SETTINGS.communitySignalScore
    ),
    podcastInviteScore: numericSetting(
      value?.podcast_invite_score,
      DEFAULT_BADGE_SETTINGS.podcastInviteScore
    )
  };
}

async function getReportedCommentsQueueFromClient(
  admin: ReturnType<typeof createSupabaseAdminClient>
): Promise<ReportedCommentQueueItem[]> {
  const { data, error } = await admin
    .from("comments")
    .select(
      "id, created_at, body, topic, moderation_status, is_hidden, is_featured, is_reported, external_source_author, profiles(display_name), comment_reports(reason, details)"
    )
    .eq("is_reported", true)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ReportedCommentRow[]).map((comment) => {
    const profile = Array.isArray(comment.profiles)
      ? comment.profiles[0]
      : comment.profiles;
    const reports = comment.comment_reports ?? [];

    return {
      id: comment.id,
      createdAt: comment.created_at,
      body: comment.body,
      topic: comment.topic,
      moderationStatus: comment.moderation_status,
      isHidden: comment.is_hidden,
      isFeatured: comment.is_featured,
      isReported: comment.is_reported,
      authorDisplayName:
        profile?.display_name?.trim() ||
        comment.external_source_author?.trim() ||
        "Community member",
      reportCount: reports.length,
      reportReasons: Array.from(
        new Set(reports.map((report) => report.reason).filter(Boolean))
      ) as string[],
      reportDetails: reports
        .map((report) => report.details?.trim())
        .filter(Boolean) as string[]
    };
  });
}

export async function getReportedCommentsQueue(): Promise<
  ReportedCommentQueueItem[]
> {
  return getReportedCommentsQueueFromClient(createSupabaseAdminClient());
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createSupabaseAdminClient();
  const [
    reportedComments,
    eventsResult,
    districtsResult,
    settingsResult
  ] = await Promise.all([
    getReportedCommentsQueueFromClient(admin),
    admin
      .from("podcast_events")
      .select(
        "id, title, slug, status, starts_at, livestream_url, replay_url, comments_enabled, leaderboard_enabled, forced_engagement_mode, district_id, is_active"
      )
      .order("starts_at", { ascending: false })
      .limit(25),
    admin
      .from("districts")
      .select("id, name, slug")
      .order("sort_order", { ascending: true }),
    admin.from("admin_settings").select("key, value")
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (districtsResult.error) throw districtsResult.error;
  if (settingsResult.error) throw settingsResult.error;

  const events = ((eventsResult.data ?? []) as AdminEventRow[]).map(mapEvent);
  const fallbackEvent = fixtureAdminEvent();
  const safeEvents = events.length > 0 ? events : [fallbackEvent];
  const activeEvent =
    safeEvents.find((event, index) => {
      const row = (eventsResult.data ?? [])[index] as AdminEventRow | undefined;
      return row?.is_active === true;
    }) ??
    safeEvents[0] ??
    null;
  const districts = ((districtsResult.data ?? []) as AdminDistrictRow[]).map(
    (district) => ({
      id: district.id,
      name: district.name,
      slug: district.slug
    })
  );
  const settingsRows = ((settingsResult.data ?? []) as AdminSettingsRow[]).reduce<
    Record<string, Record<string, unknown> | null>
  >((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return {
    events: safeEvents,
    activeEvent,
    districts: districts.length > 0 ? districts : fixtureAdminDistricts(),
    reportedComments,
    scoringSettings: parseScoringSettings(settingsRows.engagement_scoring),
    badgeSettings: parseBadgeSettings(settingsRows.engagement_badges)
  };
}
