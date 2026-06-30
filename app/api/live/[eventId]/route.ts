import {
  buildLiveMetricsFromComments,
  getVisibleComments
} from "@/lib/live/data";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const comments = await getVisibleComments(eventId);

  return NextResponse.json({
    comments,
    metrics: buildLiveMetricsFromComments(comments)
  });
}
