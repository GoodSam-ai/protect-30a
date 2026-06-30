import { canAdmin, getCurrentUserAndProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().url().max(500).nullable()
);

const eventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  status: z.enum(["upcoming", "live", "replay", "archived"]),
  startsAt: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().datetime({ offset: true }).nullable()
  ),
  livestreamUrl: optionalUrlSchema,
  replayUrl: optionalUrlSchema,
  commentsEnabled: z.boolean(),
  leaderboardEnabled: z.boolean(),
  forcedEngagementMode: z.enum(["auto", "realtime", "polling", "low-bandwidth"])
});

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function requireAdmin() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user || !canAdmin(profile)) {
    return null;
  }

  return user;
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin();

    if (!user) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const parsed = eventSchema.parse(await request.json());
    const update = {
      title: parsed.title,
      status: parsed.status,
      starts_at: parsed.startsAt ? new Date(parsed.startsAt).toISOString() : null,
      livestream_url: parsed.livestreamUrl,
      replay_url: parsed.replayUrl,
      comments_enabled: parsed.commentsEnabled,
      leaderboard_enabled: parsed.leaderboardEnabled,
      forced_engagement_mode: parsed.forcedEngagementMode
    };
    const admin = createSupabaseAdminClient();
    const { data: event, error } = await admin
      .from("podcast_events")
      .update(update)
      .eq("id", parsed.eventId)
      .select("id, title")
      .single();

    if (error) {
      throw new Error(errorMessage(error, "Unable to update event."));
    }

    const { error: auditError } = await admin.from("audit_log").insert({
      actor_user_id: user.id,
      action: "admin_event_update",
      entity_type: "podcast_event",
      entity_id: parsed.eventId,
      metadata: update
    });

    if (auditError) {
      throw new Error(errorMessage(auditError, "Unable to write audit log."));
    }

    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: errorMessage(error, "Unable to update event.") },
      { status: 400 }
    );
  }
}

export const POST = PATCH;
