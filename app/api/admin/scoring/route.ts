import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const scoringSchema = z.object({
  commentWeight: z.coerce.number().int().min(0).max(100),
  likeWeight: z.coerce.number().int().min(0).max(100),
  shareWeight: z.coerce.number().int().min(0).max(100),
  featuredWeight: z.coerce.number().int().min(0).max(100),
  podcastInviteThreshold: z.coerce.number().int().min(0).max(1000)
});

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getCurrentUserAndProfile();

    if (!user || !canModerate(profile)) {
      return NextResponse.json(
        { error: "Moderator access required." },
        { status: 403 }
      );
    }

    const parsed = scoringSchema.parse(await request.json());
    const metadata = {
      comment_weight: parsed.commentWeight,
      like_weight: parsed.likeWeight,
      share_weight: parsed.shareWeight,
      featured_weight: parsed.featuredWeight,
      podcast_invite_threshold: parsed.podcastInviteThreshold
    };
    const admin = createSupabaseAdminClient();
    const { error: settingsError } = await admin.from("admin_settings").upsert(
      {
        key: "engagement_scoring",
        value: metadata,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: "key" }
    );

    if (settingsError) {
      throw new Error(
        errorMessage(settingsError, "Unable to save scoring settings.")
      );
    }

    const { error } = await admin.from("audit_log").insert({
      actor_user_id: user.id,
      action: "admin_scoring_settings_update",
      entity_type: "scoring_settings",
      entity_id: null,
      metadata
    });

    if (error) {
      throw new Error(errorMessage(error, "Unable to save scoring settings."));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Unable to save scoring settings.") },
      { status: 400 }
    );
  }
}
