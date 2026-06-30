import "server-only";

import type { ReportedCommentQueueItem } from "@/lib/admin/types";
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

export async function getReportedCommentsQueue(): Promise<
  ReportedCommentQueueItem[]
> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("comments")
    .select(
      "id, created_at, body, topic, moderation_status, is_hidden, is_featured, is_reported, external_source_author, profiles(display_name), comment_reports(reason, details, created_at)"
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
