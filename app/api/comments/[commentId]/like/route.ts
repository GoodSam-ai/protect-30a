import { toggleCommentLike } from "@/lib/live/actions";
import { NextResponse, type NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ commentId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { commentId } = await context.params;
    const result = await toggleCommentLike(commentId, true);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to like comment"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { commentId } = await context.params;
    const result = await toggleCommentLike(commentId, false);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to unlike comment"
      },
      { status: 400 }
    );
  }
}
