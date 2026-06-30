import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const moderationSchema = z
  .object({
    commentId: z.string().uuid(),
    moderationStatus: z
      .enum(["visible", "pending", "hidden", "removed"])
      .optional(),
    isFeatured: z.boolean().optional()
  })
  .refine(
    (value) =>
      value.moderationStatus !== undefined || value.isFeatured !== undefined,
    "Provide a moderation status or featured state."
  );

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function requireModerator() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user || !canModerate(profile)) {
    return null;
  }

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireModerator();

    if (!user) {
      return NextResponse.json(
        { error: "Moderator access required." },
        { status: 403 }
      );
    }

    const parsed = moderationSchema.parse(await request.json());
    const update: {
      moderation_status?: "visible" | "pending" | "hidden" | "removed";
      is_hidden?: boolean;
      is_featured?: boolean;
    } = {};

    if (parsed.moderationStatus) {
      update.moderation_status = parsed.moderationStatus;
      update.is_hidden =
        parsed.moderationStatus === "hidden" ||
        parsed.moderationStatus === "removed";
    }

    if (parsed.isFeatured !== undefined) {
      update.is_featured = parsed.isFeatured;
    }

    const admin = createSupabaseAdminClient();
    const { data: comment, error } = await admin
      .from("comments")
      .update(update)
      .eq("id", parsed.commentId)
      .select("id")
      .single();

    if (error) {
      throw new Error(errorMessage(error, "Unable to moderate comment."));
    }

    const { error: auditError } = await admin.from("audit_log").insert({
      actor_user_id: user.id,
      action: "admin_comment_moderation",
      entity_type: "comment",
      entity_id: parsed.commentId,
      metadata: update
    });

    if (auditError) {
      throw new Error(errorMessage(auditError, "Unable to write audit log."));
    }

    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Unable to moderate comment.") },
      { status: 400 }
    );
  }
}
