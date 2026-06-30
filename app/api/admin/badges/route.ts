import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const badgesSchema = z.object({
  firstVoiceComments: z.coerce.number().int().min(0).max(1000),
  conversationStarterComments: z.coerce.number().int().min(0).max(1000),
  communitySignalScore: z.coerce.number().int().min(0).max(10000),
  podcastInviteScore: z.coerce.number().int().min(0).max(10000)
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

    const parsed = badgesSchema.parse(await request.json());
    const metadata = {
      first_voice_comments: parsed.firstVoiceComments,
      conversation_starter_comments: parsed.conversationStarterComments,
      community_signal_score: parsed.communitySignalScore,
      podcast_invite_score: parsed.podcastInviteScore
    };
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_user_id: user.id,
      action: "admin_badge_settings_update",
      entity_type: "badge_settings",
      entity_id: null,
      metadata
    });

    if (error) {
      throw new Error(errorMessage(error, "Unable to save badge settings."));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Unable to save badge settings.") },
      { status: 400 }
    );
  }
}
