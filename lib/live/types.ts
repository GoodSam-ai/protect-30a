export type EventStatus = "upcoming" | "live" | "replay" | "archived";
export type EngagementMode = "auto" | "realtime" | "polling" | "low-bandwidth";

export type District = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
};

export type PodcastEvent = {
  id: string;
  district_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  livestream_url: string | null;
  replay_url: string | null;
  host_name: string;
  cohost_name: string | null;
  advocate_name: string | null;
  guest_names: string[];
  entertainer_name: string | null;
  entertainment_type: string | null;
  entertainment_description: string | null;
  disclaimer: string;
  comments_enabled: boolean;
  replies_enabled: boolean;
  leaderboard_enabled: boolean;
  forced_engagement_mode: EngagementMode;
  is_active: boolean;
};

export type LiveComment = {
  id: string;
  event_id: string;
  district_id: string | null;
  user_id: string | null;
  parent_comment_id: string | null;
  body: string;
  topic: string | null;
  is_featured: boolean;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  author_display_name: string;
  author_avatar_url: string | null;
};

export type LiveMetrics = {
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  commentsPerMinute: number;
  topTopics: Array<{ topic: string; count: number }>;
};
