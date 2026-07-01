import "server-only";

import { getCurrentUserAndProfile, type PublicProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LiveComment } from "@/lib/live/types";
import {
  commentInputSchema,
  isRapidDuplicateComment,
  reportInputSchema,
  shareInputSchema
} from "./validation";
import { z } from "zod";

const idSchema = z.string().uuid();

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type CreatedCommentRow = {
  id: string;
  event_id: string;
  district_id: string | null;
  user_id: string | null;
  parent_comment_id: string | null;
  body: string;
  topic: string | null;
  is_featured: boolean | null;
  created_at: string;
};

type PreviousCommentRow = {
  body: string;
  created_at: string;
};

function displayName(profile: PublicProfile) {
  return profile.display_name?.trim() || "Community member";
}

function toLiveComment(
  comment: CreatedCommentRow,
  profile: PublicProfile
): LiveComment {
  return {
    id: comment.id,
    event_id: comment.event_id,
    district_id: comment.district_id,
    user_id: comment.user_id,
    parent_comment_id: comment.parent_comment_id,
    body: comment.body,
    topic: comment.topic,
    is_featured: comment.is_featured ?? false,
    created_at: comment.created_at,
    like_count: 0,
    liked_by_me: false,
    author_display_name: displayName(profile),
    author_avatar_url: profile.avatar_url
  };
}

async function requireEngagementUser(
  signInMessage: string,
  restrictedProfileMessage: string
) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    throw new Error(signInMessage);
  }

  if (!profile || profile.is_restricted) {
    throw new Error(restrictedProfileMessage);
  }

  return { user, profile };
}

function isMissingRowError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PGRST116"
  );
}

async function assertNotRapidDuplicateComment({
  supabase,
  userId,
  eventId,
  body
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  eventId: string;
  body: string;
}) {
  const { data, error } = await supabase
    .from("comments")
    .select("body, created_at")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PreviousCommentRow>();

  if (error && !isMissingRowError(error)) {
    throw new Error(errorMessage(error, "Unable to check recent comments."));
  }

  if (
    data &&
    isRapidDuplicateComment({
      previousBody: data.body,
      nextBody: body,
      previousCreatedAt: new Date(data.created_at),
      now: new Date()
    })
  ) {
    throw new Error("Please wait before posting the same comment again.");
  }
}

export async function createComment(input: unknown) {
  const { user, profile } = await requireEngagementUser(
    "Sign in required to comment.",
    "Your profile cannot post comments right now."
  );
  const parsed = commentInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  await assertNotRapidDuplicateComment({
    supabase,
    userId: user.id,
    eventId: parsed.eventId,
    body: parsed.body
  });
  const { data, error } = await supabase
    .from("comments")
    .insert({
      event_id: parsed.eventId,
      district_id: parsed.districtId ?? null,
      parent_comment_id: parsed.parentCommentId ?? null,
      body: parsed.body,
      topic: parsed.topic ?? null,
      source: "site",
      user_id: user.id
    })
    .select(
      "id, event_id, district_id, user_id, parent_comment_id, body, topic, is_featured, created_at"
    )
    .single<CreatedCommentRow>();

  if (error) {
    throw new Error(errorMessage(error, "Unable to create comment."));
  }

  return toLiveComment(data, profile);
}

export async function toggleCommentLike(commentId: string, liked: boolean) {
  const { user } = await requireEngagementUser(
    "Sign in required to like comments.",
    "Your profile cannot like comments right now."
  );
  const parsedCommentId = idSchema.parse(commentId);
  const supabase = await createSupabaseServerClient();

  if (liked) {
    const { error } = await supabase.from("comment_likes").upsert(
      {
        comment_id: parsedCommentId,
        user_id: user.id
      },
      {
        onConflict: "comment_id,user_id",
        ignoreDuplicates: true
      }
    );

    if (error) {
      throw new Error(errorMessage(error, "Unable to like comment."));
    }

    return { liked: true };
  }

  const { error } = await supabase
    .from("comment_likes")
    .delete()
    .eq("comment_id", parsedCommentId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(errorMessage(error, "Unable to unlike comment."));
  }

  return { liked: false };
}

export async function reportComment(commentId: string, input: unknown) {
  const { user } = await requireEngagementUser(
    "Sign in required to report comments.",
    "Your profile cannot report comments right now."
  );
  const parsedCommentId = idSchema.parse(commentId);
  const parsed = reportInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("comment_reports").upsert(
    {
      comment_id: parsedCommentId,
      reporter_user_id: user.id,
      reason: parsed.reason,
      details: parsed.details ?? null
    },
    {
      onConflict: "comment_id,reporter_user_id",
      ignoreDuplicates: true
    }
  );

  if (error) {
    throw new Error(errorMessage(error, "Unable to report comment."));
  }

  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin
    .from("comments")
    .update({ is_reported: true })
    .eq("id", parsedCommentId);

  if (updateError) {
    throw new Error(
      errorMessage(updateError, "Unable to mark comment as reported.")
    );
  }

  return { ok: true };
}

export async function trackShare(input: unknown) {
  const { user } = await requireEngagementUser(
    "Sign in required to track shares.",
    "Your profile cannot track shares right now."
  );
  const parsed = shareInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("event_shares").upsert(
    {
      event_id: parsed.eventId,
      user_id: user.id,
      platform: parsed.platform
    },
    {
      onConflict: "event_id,user_id,platform",
      ignoreDuplicates: true
    }
  );

  if (error) {
    throw new Error(errorMessage(error, "Unable to track share."));
  }

  return { ok: true };
}
