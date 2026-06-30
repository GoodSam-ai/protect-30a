import AdminPage from "@/app/admin/page";
import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const dashboardMocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  getAdminDashboardData: vi.fn(),
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
  getAdminDashboardData: dashboardMocks.getAdminDashboardData
}));

const moderatorProfile = {
  id: "33333333-3333-4333-8333-333333333333",
  display_name: "Moderator",
  avatar_url: null,
  role: "moderator" as const,
  primary_district_id: null,
  is_restricted: false
};

const adminProfile = {
  ...moderatorProfile,
  display_name: "Admin",
  role: "admin" as const
};

const loadedEvent = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "Loaded admin event",
  slug: "loaded-admin-event",
  status: "live",
  startsAt: "2026-07-03T18:00:00.000Z",
  livestreamUrl: "https://example.com/live",
  replayUrl: null,
  commentsEnabled: true,
  leaderboardEnabled: false,
  forcedEngagementMode: "realtime",
  districtId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
};

const secondLoadedEvent = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  title: "Second loaded event",
  slug: "second-loaded-event",
  status: "replay",
  startsAt: "2026-07-10T20:30:00.000Z",
  livestreamUrl: "https://example.com/second-live",
  replayUrl: "https://example.com/second-replay",
  commentsEnabled: false,
  leaderboardEnabled: true,
  forcedEngagementMode: "polling",
  districtId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
};

const loadedDashboardData = {
  events: [loadedEvent],
  activeEvent: loadedEvent,
  districts: [
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Loaded District",
      slug: "loaded-district"
    }
  ],
  reportedComments: [],
  scoringSettings: {
    commentWeight: 2,
    likeWeight: 4,
    shareWeight: 3,
    featuredWeight: 12
  },
  badgeSettings: {
    firstVoiceComments: 2,
    conversationStarterComments: 6,
    communitySignalScore: 30,
    podcastInviteScore: 40
  }
};

describe("admin dashboard route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardMocks.getAdminDashboardData.mockResolvedValue(loadedDashboardData);
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
      "Reported comments",
      "Featured comments",
      "Manual Facebook import",
      "Exports",
      "Scoring",
      "Badges"
    ]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
    expect(screen.queryByRole("tab", { name: "Events" })).not.toBeInTheDocument();
  });

  it("renders event setup for admins", async () => {
    dashboardMocks.getCurrentUserAndProfile.mockResolvedValue({
      user: { id: adminProfile.id },
      profile: adminProfile
    });

    render(await AdminPage());

    expect(screen.getByRole("tab", { name: "Events" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Event setup" })).toHaveAttribute(
      "action",
      "/api/admin/events"
    );
  });

  it("loads reported comments for the queue after the admin guard", async () => {
    dashboardMocks.getCurrentUserAndProfile.mockResolvedValue({
      user: { id: moderatorProfile.id },
      profile: moderatorProfile
    });
    dashboardMocks.getAdminDashboardData.mockResolvedValue({
      ...loadedDashboardData,
      reportedComments: [
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
      ]
    });

    render(await AdminPage());
    fireEvent.click(screen.getByRole("tab", { name: "Reported comments" }));

    expect(dashboardMocks.getAdminDashboardData).toHaveBeenCalled();
    expect(screen.getByText("Reported queue comment body.")).toBeInTheDocument();
    expect(screen.getByText("Careful Resident")).toBeInTheDocument();
    expect(screen.getByText("spam")).toBeInTheDocument();
    expect(screen.queryByText("do-not-render")).not.toBeInTheDocument();
  });

  it("hydrates admin forms from loaded server data instead of fixture ids", async () => {
    dashboardMocks.getCurrentUserAndProfile.mockResolvedValue({
      user: { id: adminProfile.id },
      profile: adminProfile
    });

    render(await AdminPage());

    expect(screen.getByLabelText("Event ID")).toHaveValue(loadedEvent.id);
    expect(screen.getByLabelText("Title")).toHaveValue(loadedEvent.title);

    fireEvent.click(screen.getByRole("tab", { name: "Manual Facebook import" }));
    expect(screen.getByLabelText("Event ID")).toHaveValue(loadedEvent.id);
    expect(screen.getByRole("option", { name: "Loaded District" })).toHaveValue(
      loadedDashboardData.districts[0].id
    );

    fireEvent.click(screen.getByRole("tab", { name: "Exports" }));
    expect(screen.getByLabelText("Event ID")).toHaveValue(loadedEvent.id);

    fireEvent.click(screen.getByRole("tab", { name: "Scoring" }));
    expect(screen.getByLabelText("Like")).toHaveValue(4);
    expect(screen.queryByLabelText("Invite threshold")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Badges" }));
    expect(screen.getByLabelText("Podcast invite score")).toHaveValue(40);
  });

  it("updates event setup fields when selecting a different event", async () => {
    dashboardMocks.getCurrentUserAndProfile.mockResolvedValue({
      user: { id: adminProfile.id },
      profile: adminProfile
    });
    dashboardMocks.getAdminDashboardData.mockResolvedValue({
      ...loadedDashboardData,
      events: [loadedEvent, secondLoadedEvent]
    });

    render(await AdminPage());

    expect(screen.getByLabelText("Title")).toHaveValue(loadedEvent.title);

    fireEvent.change(screen.getByLabelText("Event ID"), {
      target: { value: secondLoadedEvent.id }
    });

    expect(screen.getByLabelText("Event ID")).toHaveValue(secondLoadedEvent.id);
    expect(screen.getByLabelText("Title")).toHaveValue(secondLoadedEvent.title);
    expect(screen.getByLabelText("Status")).toHaveValue(secondLoadedEvent.status);
    expect(screen.getByLabelText("Starts at")).toHaveValue(
      secondLoadedEvent.startsAt
    );
    expect(screen.getByLabelText("Livestream URL")).toHaveValue(
      secondLoadedEvent.livestreamUrl
    );
    expect(screen.getByLabelText("Replay URL")).toHaveValue(
      secondLoadedEvent.replayUrl
    );
    expect(screen.getByLabelText("Engagement mode")).toHaveValue(
      secondLoadedEvent.forcedEngagementMode
    );
    expect(screen.getByLabelText("Comments enabled")).not.toBeChecked();
    expect(screen.getByLabelText("Leaderboard enabled")).toBeChecked();
  });
});

describe("AdminModerationPanel", () => {
  it.each([
    ["Events", "Event setup", "/api/admin/events", adminProfile],
    ["Reported comments", "Moderate comment", "/api/admin/comments/moderate", moderatorProfile],
    ["Featured comments", "Feature comment", "/api/admin/comments/moderate", moderatorProfile],
    ["Manual Facebook import", "Manual Facebook import", "/api/admin/facebook-import", moderatorProfile],
    ["Exports", "Export comments", "/api/admin/export/comments", moderatorProfile],
    ["Scoring", "Scoring settings", "/api/admin/scoring", moderatorProfile],
    ["Badges", "Badge settings", "/api/admin/badges", moderatorProfile]
  ])(
    "renders a route-backed form and polite status region for %s",
    (tabName, formName, action, profile) => {
      render(
        <AdminModerationPanel
          profile={profile}
          dashboardData={loadedDashboardData}
        />
      );

      fireEvent.click(screen.getByRole("tab", { name: tabName }));

      const form = screen.getByRole("form", { name: formName });
      expect(form).toHaveAttribute("action", action);
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    }
  );
});
