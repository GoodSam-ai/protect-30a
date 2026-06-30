import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const nullableUuidSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().uuid().optional()
);

const optionalTextSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(200).optional()
);

const importSchema = z.object({
  eventId: z.string().uuid(),
  districtId: nullableUuidSchema,
  body: z.string().trim().min(5).max(500),
  externalSourceAuthor: optionalTextSchema,
  externalSourceUrl: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().url().max(500).optional()
  )
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

    const parsed = importSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const { data: comment, error } = await admin
      .from("comments")
      .insert({
        event_id: parsed.eventId,
        district_id: parsed.districtId ?? null,
        user_id: null,
        parent_comment_id: null,
        body: parsed.body,
        topic: null,
        source: "facebook_manual",
        external_source_author: parsed.externalSourceAuthor ?? null,
        external_source_url: parsed.externalSourceUrl ?? null,
        moderation_status: "visible",
        is_hidden: false,
        is_reported: false
      })
      .select("id, event_id")
      .single();

    if (error) {
      throw new Error(errorMessage(error, "Unable to import Facebook comment."));
    }

    const { error: auditError } = await admin.from("audit_log").insert({
      actor_user_id: user.id,
      action: "facebook_manual_import",
      entity_type: "comment",
      entity_id: comment.id,
      metadata: {
        event_id: parsed.eventId,
        district_id: parsed.districtId ?? null,
        external_source_author: parsed.externalSourceAuthor ?? null,
        external_source_url: parsed.externalSourceUrl ?? null
      }
    });

    if (auditError) {
      throw new Error(errorMessage(auditError, "Unable to write audit log."));
    }

    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      {
        error: errorMessage(error, "Unable to import Facebook comment.")
      },
      { status: 400 }
    );
  }
}
