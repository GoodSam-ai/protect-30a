import {
  getEventById,
  getLiveMetrics,
  getVisibleComments
} from "@/lib/live/data";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { z } from "zod";

const eventIdSchema = z.string().uuid();
const privateNoStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  if (!eventIdSchema.safeParse(eventId).success) {
    return NextResponse.json(
      { error: "Invalid event id." },
      { status: 400, headers: privateNoStoreHeaders }
    );
  }

  try {
    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404, headers: privateNoStoreHeaders }
      );
    }

    const { user } = await getCurrentUserAndProfile();
    const comments = await getVisibleComments(eventId, user?.id ?? null);
    const metrics = await getLiveMetrics(eventId, comments);

    return NextResponse.json(
      {
        comments,
        metrics
      },
      { headers: privateNoStoreHeaders }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load live engagement data." },
      { status: 500, headers: privateNoStoreHeaders }
    );
  }
}
