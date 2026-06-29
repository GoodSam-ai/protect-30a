import { GET } from "@/app/auth/callback/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: supabaseMocks.createSupabaseServerClient
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: supabaseMocks.exchangeCodeForSession
      }
    });
  });

  it("redirects to the requested same-origin path when no auth code is present", async () => {
    const response = await GET(
      new NextRequest("https://example.test/auth/callback?next=%2Flive%3Ftab%3Dchat")
    );

    expect(response.headers.get("location")).toBe(
      "https://example.test/live?tab=chat"
    );
    expect(supabaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("falls back to /live when next points off origin", async () => {
    const response = await GET(
      new NextRequest(
        "https://example.test/auth/callback?next=https%3A%2F%2Fevil.test%2Flogin"
      )
    );

    expect(response.headers.get("location")).toBe("https://example.test/live");
  });

  it("falls back to /live when next is malformed", async () => {
    const response = await GET(
      new NextRequest(
        "https://example.test/auth/callback?next=http%3A%2F%2F%5B%3A%3A1"
      )
    );

    expect(response.headers.get("location")).toBe("https://example.test/live");
  });

  it("exchanges an auth code before redirecting", async () => {
    const response = await GET(
      new NextRequest(
        "https://example.test/auth/callback?code=auth-code&next=%2Flive%3Ftab%3Dchat"
      )
    );

    expect(supabaseMocks.createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(supabaseMocks.exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
    expect(response.headers.get("location")).toBe(
      "https://example.test/live?tab=chat"
    );
  });

  it("redirects to a safe auth error URL when code exchange fails", async () => {
    supabaseMocks.exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: new Error("provider secret leaked in error")
    });

    const response = await GET(
      new NextRequest(
        "https://example.test/auth/callback?code=bad-code&next=%2Fadmin"
      )
    );

    expect(supabaseMocks.exchangeCodeForSession).toHaveBeenCalledWith("bad-code");
    expect(response.headers.get("location")).toBe(
      "https://example.test/live?auth_error=exchange_failed"
    );
  });

  it("redirects to a safe auth error URL when code exchange throws", async () => {
    supabaseMocks.exchangeCodeForSession.mockRejectedValue(
      new Error("provider secret leaked in thrown error")
    );

    const response = await GET(
      new NextRequest(
        "https://example.test/auth/callback?code=bad-code&next=%2Fadmin"
      )
    );

    expect(supabaseMocks.exchangeCodeForSession).toHaveBeenCalledWith("bad-code");
    expect(response.headers.get("location")).toBe(
      "https://example.test/live?auth_error=exchange_failed"
    );
  });
});
