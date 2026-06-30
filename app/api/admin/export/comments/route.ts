import { canModerate, getCurrentUserAndProfile } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const exportSchema = z.object({
  eventId: z.string().uuid()
});

type CommentExportRow = {
  id: string;
  created_at: string;
  body: string;
  topic: string | null;
  source: string;
  moderation_status: string;
  external_source_author: string | null;
  profiles?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function neutralizeSpreadsheetFormula(text: string) {
  return /^[=+\-@\t]/.test(text) ? `'${text}` : text;
}

function csvField(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText =
    typeof value === "number" ? text : neutralizeSpreadsheetFormula(text);

  if (/[",\n\r]/.test(safeText)) {
    return `"${safeText.replaceAll('"', '""')}"`;
  }

  return safeText;
}

function authorName(row: CommentExportRow) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const displayName = profile?.display_name?.trim();

  return (
    displayName ||
    row.external_source_author?.trim() ||
    "Community member"
  );
}

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getCurrentUserAndProfile();

    if (!user || !canModerate(profile)) {
      return NextResponse.json(
        { error: "Moderator access required." },
        { status: 403 }
      );
    }

    const parsed = exportSchema.parse({
      eventId: new URL(request.url).searchParams.get("eventId")
    });
    const admin = createSupabaseAdminClient();
    const { data: comments, error } = await admin
      .from("comments")
      .select(
        "id, created_at, body, topic, source, moderation_status, external_source_author, profiles(display_name)"
      )
      .eq("event_id", parsed.eventId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(errorMessage(error, "Unable to export comments."));
    }

    const rows = (comments ?? []) as CommentExportRow[];
    const commentIds = rows.map((comment) => comment.id);
    const likeCounts = new Map<string, number>();

    if (commentIds.length > 0) {
      const { data: likes, error: likesError } = await admin
        .from("comment_likes")
        .select("comment_id")
        .in("comment_id", commentIds);

      if (likesError) {
        throw new Error(errorMessage(likesError, "Unable to export comment likes."));
      }

      for (const like of (likes ?? []) as Array<{ comment_id: string }>) {
        likeCounts.set(like.comment_id, (likeCounts.get(like.comment_id) ?? 0) + 1);
      }
    }

    const header =
      "created_at,author,topic,body,like_count,source,moderation_status";
    const csv = [
      header,
      ...rows.map((comment) =>
        [
          comment.created_at,
          authorName(comment),
          comment.topic,
          comment.body,
          likeCounts.get(comment.id) ?? 0,
          comment.source,
          comment.moderation_status
        ]
          .map(csvField)
          .join(",")
      )
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="protect30a-comments-${parsed.eventId}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: errorMessage(error, "Unable to export comments.")
      },
      { status: 400 }
    );
  }
}
