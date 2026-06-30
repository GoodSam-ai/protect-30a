import AdminPage from "@/app/admin/page";
import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const dashboardMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  getReportedCommentsQueue: vi.fn(),
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

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: dashboardMocks.createSupabaseAdminClient
}));

vi.mock("@/lib/admin/data", () => ({
  getReportedCommentsQueue: dashboardMocks.getReportedCommentsQueue
}));

const moderatorProfile = {
  id: "33333333-3333-4333-8333-333333333333",
  display_name: "Moderator",
  avatar_url: null,
  role: "moderator" as const,
  primary_district_id: null,
  is_restricted: false
};

function reportedCommentsTable() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: "44444444-4444-4444-8444-444444444444",
                created_at: "2026-06-30T12:00:00Z",
                body: "Reported queue comment body.",
                topic: "Traffic",
                moderation_status: "pending",
                is_hidden: false,
                is_featured: false,
                is_reported: true,
                external_source_author: null,
                profiles: { display_name: "Careful Resident" },
                comment_reports: [
                  {
                    reason: "spam",
                    details: "Repeated link",
                    reporter_user_id: "do-not-render"
                  }
                ]
              }
            ],
            error: null
          })
        }))
      }))
    }))
  };
}

describe("admin dashboard route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardMocks.getReportedCommentsQueue.mockResolvedValue([]);
    dashboardMocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => reportedCommentsTable())
    });
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

  it("loads reported comments for the queue after the admin guard", async () => {
    dashboardMocks.getCurrentUserAndProfile.mockResolvedValue({
      user: { id: moderatorProfile.id },
      profile: moderatorProfile
    });
    dashboardMocks.getReportedCommentsQueue.mockResolvedValue([
      {
        id: "44444444-4444-4444-8444-444444444444",
        createdAt: "2026-06-30T12:00:00Z",
        body: "Reported queue comment body.",
        topic: "Traffic",
        moderationStatus: "pending",
        isHidden: false,
        isFeatured: false,
        isReported: true,
        authorDisplayName: "Careful Resident",
        reportCount: 1,
        reportReasons: ["spam"],
        reportDetails: ["Repeated link"]
      }
    ]);

    render(await AdminPage());
    fireEvent.click(screen.getByRole("tab", { name: "Reported comments" }));

    expect(screen.getByText("Reported queue comment body.")).toBeInTheDocument();
    expect(screen.getByText("Careful Resident")).toBeInTheDocument();
    expect(screen.getByText("spam")).toBeInTheDocument();
    expect(screen.queryByText("do-not-render")).not.toBeInTheDocument();
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
    render(<AdminModerationPanel profile={moderatorProfile} reportedComments={[]} />);

    fireEvent.click(screen.getByRole("tab", { name: tabName }));

    const form = screen.getByRole("form", { name: formName });
    expect(form).toHaveAttribute("action", action);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    }
  );
});
