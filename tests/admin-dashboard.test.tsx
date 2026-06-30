import AdminPage from "@/app/admin/page";
import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const dashboardMocks = vi.hoisted(() => ({
  getCurrentUserAndProfile: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  })
}));

vi.mock("next/navigation", () => ({
  redirect: dashboardMocks.redirect
}));

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );

  return {
    ...actual,
    getCurrentUserAndProfile: dashboardMocks.getCurrentUserAndProfile
  };
});

const moderatorProfile = {
  id: "33333333-3333-4333-8333-333333333333",
  display_name: "Moderator",
  avatar_url: null,
  role: "moderator" as const,
  primary_district_id: null,
  is_restricted: false
};

describe("admin dashboard route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects non-moderators to the live room", async () => {
    dashboardMocks.getCurrentUserAndProfile.mockResolvedValue({
      user: { id: "33333333-3333-4333-8333-333333333333" },
      profile: {
        ...moderatorProfile,
        role: "user"
      }
    });

    await expect(AdminPage()).rejects.toThrow("redirect:/live");
    expect(dashboardMocks.redirect).toHaveBeenCalledWith("/live");
  });

  it("renders the operational admin shell for moderators", async () => {
    dashboardMocks.getCurrentUserAndProfile.mockResolvedValue({
      user: { id: moderatorProfile.id },
      profile: moderatorProfile
    });

    render(await AdminPage());

    expect(
      screen.getByRole("heading", { name: "Live engagement admin" })
    ).toBeInTheDocument();
    for (const tab of [
      "Events",
      "Reported comments",
      "Featured comments",
      "Manual Facebook import",
      "Exports",
      "Scoring",
      "Badges"
    ]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });
});

describe("AdminModerationPanel", () => {
  it.each([
    ["Events", "Event setup", "/api/admin/events"],
    ["Reported comments", "Moderate comment", "/api/admin/comments/moderate"],
    ["Featured comments", "Feature comment", "/api/admin/comments/moderate"],
    ["Manual Facebook import", "Manual Facebook import", "/api/admin/facebook-import"],
    ["Exports", "Export comments", "/api/admin/export/comments"],
    ["Scoring", "Scoring settings", "/api/admin/scoring"],
    ["Badges", "Badge settings", "/api/admin/badges"]
  ])(
    "renders a route-backed form and polite status region for %s",
    (tabName, formName, action) => {
    render(<AdminModerationPanel profile={moderatorProfile} />);

    fireEvent.click(screen.getByRole("tab", { name: tabName }));

    const form = screen.getByRole("form", { name: formName });
    expect(form).toHaveAttribute("action", action);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    }
  );
});
