import {
  canModerate,
  getCurrentUserAndProfile,
  type PublicProfile
} from "@/lib/auth/session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: supabaseMocks.createSupabaseServerClient
}));

function profile(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    id: "user-1",
    display_name: "Resident",
    avatar_url: null,
    role: "user",
    primary_district_id: null,
    is_restricted: false,
    ...overrides
  };
}

describe("auth session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a logged-out session without Supabase environment variables", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    await expect(getCurrentUserAndProfile()).resolves.toEqual({
      user: null,
      profile: null
    });
    expect(supabaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("throws a configuration error when only the Supabase URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    await expect(getCurrentUserAndProfile()).rejects.toThrow(
      "Supabase environment variables are partially configured."
    );
    expect(supabaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("throws a configuration error when only the Supabase anon key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    await expect(getCurrentUserAndProfile()).rejects.toThrow(
      "Supabase environment variables are partially configured."
    );
    expect(supabaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("allows unrestricted moderators and admins to moderate", () => {
    expect(canModerate(profile({ role: "moderator" }))).toBe(true);
    expect(canModerate(profile({ role: "admin" }))).toBe(true);
  });

  it("blocks null, restricted, and regular user profiles from moderating", () => {
    expect(canModerate(null)).toBe(false);
    expect(
      canModerate(profile({ role: "admin", is_restricted: true }))
    ).toBe(false);
    expect(canModerate(profile({ role: "user" }))).toBe(false);
  });
});
