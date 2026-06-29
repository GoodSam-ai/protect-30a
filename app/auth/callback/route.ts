import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

function getSafeRedirectUrl(next: string | null, origin: string) {
  const fallbackUrl = new URL("/live", origin);

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallbackUrl;
  }

  try {
    const redirectUrl = new URL(next, origin);

    if (redirectUrl.origin !== origin) {
      return fallbackUrl;
    }

    return redirectUrl;
  } catch {
    return fallbackUrl;
  }
}

function getAuthErrorRedirectUrl(origin: string) {
  return new URL("/live?auth_error=exchange_failed", origin);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const safeRedirectUrl = getSafeRedirectUrl(
    requestUrl.searchParams.get("next"),
    requestUrl.origin
  );

  if (code) {
    const supabase = await createSupabaseServerClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl.origin));
      }
    } catch {
      return NextResponse.redirect(getAuthErrorRedirectUrl(requestUrl.origin));
    }
  }

  return NextResponse.redirect(safeRedirectUrl);
}
