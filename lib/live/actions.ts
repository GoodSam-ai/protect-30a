import "server-only";

import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  commentInputSchema,
  reportInputSchema,
  shareInputSchema
} from "./validation";
import { z } from "zod";

const idSchema = z.string().uuid();

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function requireCurrentUser(message: string) {
  const { user } = await getCurrentUserAndProfile();

  if (!user) {
    throw new Error(message);
  }

  return user;
}

export async function createComment(input: unknown) {
  const user = await requireCurrentUser("Sign in required to comment.");
  const parsed = commentInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({
      event_id: parsed.eventId,
      district_id: parsed.districtId ?? null,
      parent_comment_id: parsed.parentCommentId ?? null,
      body: parsed.body,
      topic: parsed.topic ?? null,
      source: "web",
      user_id: user.id
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(errorMessage(error, "Unable to create comment."));
  }

  return data;
}

export async function toggleCommentLike(commentId: string, liked: boolean) {
  const user = await requireCurrentUser("Sign in required to like comments.");
  const parsedCommentId = idSchema.parse(commentId);
  const supabase = await createSupabaseServerClient();

  if (liked) {
    const { error } = await supabase.from("comment_likes").insert({
      comment_id: parsedCommentId,
      user_id: user.id
    });

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
  const user = await requireCurrentUser("Sign in required to report comments.");
  const parsedCommentId = idSchema.parse(commentId);
  const parsed = reportInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("comment_reports").insert({
    comment_id: parsedCommentId,
    reporter_user_id: user.id,
    reason: parsed.reason,
    details: parsed.details ?? null
  });

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
  const user = await requireCurrentUser("Sign in required to track shares.");
  const parsed = shareInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("event_shares").insert({
    event_id: parsed.eventId,
    user_id: user.id,
    platform: parsed.platform
  });

  if (error) {
    throw new Error(errorMessage(error, "Unable to track share."));
  }

  return { ok: true };
}
