import { reportComment } from "@/lib/live/actions";
import { NextResponse, type NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ commentId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { commentId } = await context.params;
    const body = await request.json();
    const result = await reportComment(commentId, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to report comment"
      },
      { status: 400 }
    );
  }
}
