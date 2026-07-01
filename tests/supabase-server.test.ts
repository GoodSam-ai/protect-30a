import { createSupabaseServerClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseServerMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  cookies: vi.fn(),
  cookieGetAll: vi.fn(),
  cookieSet: vi.fn()
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: supabaseServerMocks.createServerClient
}));

vi.mock("next/headers", () => ({
  cookies: supabaseServerMocks.cookies
}));

type CookieBridge = {
  getAll(): Array<{ name: string; value: string }>;
  setAll(cookiesToSet: Array<{ name: string; value: string; options?: object }>): void;
};

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    supabaseServerMocks.cookieGetAll.mockReturnValue([
      { name: "sb-test", value: "cookie" }
    ]);
    supabaseServerMocks.cookieSet.mockImplementation(() => undefined);
    supabaseServerMocks.cookies.mockResolvedValue({
      getAll: supabaseServerMocks.cookieGetAll,
      set: supabaseServerMocks.cookieSet
    });
    supabaseServerMocks.createServerClient.mockImplementation(
      (_url: string, _anonKey: string, options: { cookies: CookieBridge }) => ({
        cookieBridge: options.cookies
      })
    );
  });

  it("keeps cookie reads wired to Next cookies", async () => {
    const client = (await createSupabaseServerClient()) as unknown as {
      cookieBridge: CookieBridge;
    };

    expect(client.cookieBridge.getAll()).toEqual([
      { name: "sb-test", value: "cookie" }
    ]);
    expect(supabaseServerMocks.cookieGetAll).toHaveBeenCalledOnce();
  });

  it("swallows read-only Server Component cookie mutation failures", async () => {
    supabaseServerMocks.cookieSet.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });

    const client = (await createSupabaseServerClient()) as unknown as {
      cookieBridge: CookieBridge;
    };

    expect(() =>
      client.cookieBridge.setAll([
        {
          name: "sb-test",
          value: "updated-cookie",
          options: { path: "/" }
        }
      ])
    ).not.toThrow();
    expect(supabaseServerMocks.cookieSet).toHaveBeenCalledWith(
      "sb-test",
      "updated-cookie",
      { path: "/" }
    );
  });
});
