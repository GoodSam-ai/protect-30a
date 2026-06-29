import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/live";
  const redirectUrl = new URL(next, requestUrl.origin);
  const safeRedirectUrl =
    redirectUrl.origin === requestUrl.origin
      ? redirectUrl
      : new URL("/live", requestUrl.origin);

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(safeRedirectUrl);
}
