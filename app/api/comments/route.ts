import { createComment } from "@/lib/live/actions";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const comment = await createComment(body);
    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create comment"
      },
      { status: 400 }
    );
  }
}
