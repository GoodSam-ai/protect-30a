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

function profileTable({
  existingProfile,
  existingError,
  createdProfile,
  createdError
}: {
  existingProfile: PublicProfile | null;
  existingError: { code?: string; message?: string } | null;
  createdProfile?: PublicProfile | null;
  createdError?: { code?: string; message?: string } | null;
}) {
  const selectSingle = vi.fn().mockResolvedValue({
    data: existingProfile,
    error: existingError
  });
  const selectEq = vi.fn(() => ({ single: selectSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const upsertSingle = vi.fn().mockResolvedValue({
    data: createdProfile,
    error: createdError ?? null
  });
  const upsertSelect = vi.fn(() => ({ single: upsertSingle }));
  const upsert = vi.fn(() => ({ select: upsertSelect }));

  return {
    table: { select, upsert },
    select,
    selectEq,
    selectSingle,
    upsert,
    upsertSelect,
    upsertSingle
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

  it("creates and returns a default resident profile when a signed-in user has none", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    const createdProfile = profile({
      id: "user-1",
      display_name: "Resident Voice",
      avatar_url: "https://example.com/avatar.png"
    });
    const profiles = profileTable({
      existingProfile: null,
      existingError: { code: "PGRST116", message: "No rows found" },
      createdProfile
    });
    supabaseMocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "resident@example.com",
              user_metadata: {
                full_name: " Resident Voice ",
                avatar_url: "https://example.com/avatar.png"
              }
            }
          }
        })
      },
      from: vi.fn((tableName: string) => {
        expect(tableName).toBe("profiles");
        return profiles.table;
      })
    });

    await expect(getCurrentUserAndProfile()).resolves.toEqual({
      user: expect.objectContaining({ id: "user-1" }),
      profile: createdProfile
    });
    expect(profiles.upsert).toHaveBeenCalledWith(
      {
        id: "user-1",
        display_name: "Resident Voice",
        avatar_url: "https://example.com/avatar.png",
        role: "user",
        is_candidate: false,
        is_potential_guest: false,
        is_restricted: false
      },
      { onConflict: "id" }
    );
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
