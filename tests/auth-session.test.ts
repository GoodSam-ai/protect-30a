import { canModerate, type PublicProfile } from "@/lib/auth/session";
import { describe, expect, it } from "vitest";

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
