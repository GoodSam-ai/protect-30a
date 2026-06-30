export type ReportedCommentQueueItem = {
  id: string;
  createdAt: string;
  body: string;
  topic: string | null;
  moderationStatus: string;
  isHidden: boolean;
  isFeatured: boolean;
  isReported: boolean;
  authorDisplayName: string;
  reportCount: number;
  reportReasons: string[];
  reportDetails: string[];
};

export type AdminEventOption = {
  id: string;
  title: string;
  slug: string;
  status: string;
  startsAt: string | null;
  livestreamUrl: string | null;
  replayUrl: string | null;
  commentsEnabled: boolean;
  leaderboardEnabled: boolean;
  forcedEngagementMode: string;
  districtId: string | null;
};

export type AdminDistrictOption = {
  id: string;
  name: string;
  slug: string;
};

export type AdminScoringSettings = {
  commentWeight: number;
  likeWeight: number;
  shareWeight: number;
  featuredWeight: number;
};

export type AdminBadgeSettings = {
  firstVoiceComments: number;
  conversationStarterComments: number;
  communitySignalScore: number;
  podcastInviteScore: number;
};

export type AdminDashboardData = {
  events: AdminEventOption[];
  activeEvent: AdminEventOption | null;
  districts: AdminDistrictOption[];
  reportedComments: ReportedCommentQueueItem[];
  scoringSettings: AdminScoringSettings;
  badgeSettings: AdminBadgeSettings;
};
