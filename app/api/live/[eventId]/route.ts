import {
  getLiveMetrics,
  getVisibleComments
} from "@/lib/live/data";
import { NextResponse } from "next/server";
import { z } from "zod";

const eventIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  if (!eventIdSchema.safeParse(eventId).success) {
    return NextResponse.json({ error: "Invalid event id." }, { status: 400 });
  }

  try {
    const comments = await getVisibleComments(eventId);
    const metrics = await getLiveMetrics(eventId, comments);

    return NextResponse.json({
      comments,
      metrics
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load live engagement data." },
      { status: 500 }
    );
  }
}
