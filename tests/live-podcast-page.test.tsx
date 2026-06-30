import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import type { PublicProfile } from "@/lib/auth/session";
import {
  fixtureComments,
  fixtureDistricts,
  fixtureEvent,
  fixtureMetrics
} from "@/lib/live/fixtures";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const unrestrictedProfile: PublicProfile = {
  id: "40000000-0000-4000-8000-000000000001",
  display_name: "Resident Voice",
  avatar_url: null,
  role: "user",
  primary_district_id: fixtureDistricts[0].id,
  is_restricted: false
};

describe("LivePodcastPage", () => {
  it("renders the public resident live room with logged-out engagement surfaces", () => {
    render(
      <LivePodcastPage
        event={fixtureEvent}
        districts={fixtureDistricts}
        comments={fixtureComments}
        metrics={fixtureMetrics}
        profile={null}
      />
    );

    expect(
      screen.getByRole("heading", { name: /resident live room/i })
    ).toBeInTheDocument();
    expect(screen.getByText(fixtureEvent.title)).toBeInTheDocument();
    expect(screen.getByText("Fri, Jul 3, 6:00 PM CDT")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /podcast player/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/livestream or replay will appear here/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /sign in to join the conversation/i })
    ).toBeInTheDocument();
    expect(screen.getByText(fixtureComments[0].body)).toBeInTheDocument();
    expect(screen.getByText("Jun 26, 7:00 AM")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /district focus/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(fixtureDistricts[0].name).length).toBeGreaterThan(
      0
    );
    expect(
      screen.getByRole("heading", { name: /community pulse/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /influencer leaderboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /share this live room/i })
    ).toBeInTheDocument();
  });

  it("renders a neutral leaderboard state when the event disables leaderboards", () => {
    render(
      <LivePodcastPage
        event={{ ...fixtureEvent, leaderboard_enabled: false }}
        districts={fixtureDistricts}
        comments={fixtureComments}
        metrics={fixtureMetrics}
        profile={null}
      />
    );

    expect(
      screen.getByRole("heading", { name: /influencer leaderboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/leaderboard is paused for this event/i)
    ).toBeInTheDocument();
  });

  it("keeps like controls disabled for signed-in residents until mutations exist", () => {
    render(
      <LivePodcastPage
        event={fixtureEvent}
        districts={fixtureDistricts}
        comments={fixtureComments}
        metrics={fixtureMetrics}
        profile={unrestrictedProfile}
      />
    );

    expect(
      screen.getByRole("button", {
        name: /like comment from community member\. 8 likes/i
      })
    ).toBeDisabled();
  });

  it("renders accessible live engagement mode controls", () => {
    render(
      <LivePodcastPage
        event={fixtureEvent}
        districts={fixtureDistricts}
        comments={fixtureComments}
        metrics={fixtureMetrics}
        profile={null}
      />
    );

    expect(
      screen.getByRole("group", { name: /live engagement update mode/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auto" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Realtime" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Polling" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(
      screen.getByRole("button", { name: "Low bandwidth" })
    ).toHaveAttribute("aria-pressed", "false");
  });
});
