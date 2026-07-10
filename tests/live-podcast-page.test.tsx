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
  it("provides minimal Protect30A site navigation outside the live room main content", () => {
    render(
      <LivePodcastPage
        event={fixtureEvent}
        districts={fixtureDistricts}
        comments={fixtureComments}
        metrics={fixtureMetrics}
        profile={null}
      />
    );

    const navigation = screen.getByRole("navigation", {
      name: "Protect30A site"
    });

    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("main")).not.toContainElement(navigation);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("link", { name: "Skip to main content" })
    ).toHaveAttribute("href", "#main-content");
    expect(
      screen.getByRole("link", { name: "Protect30A home" })
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Districts" })).toHaveAttribute(
      "href",
      "/districts/"
    );
    expect(screen.getByRole("link", { name: "Resources" })).toHaveAttribute(
      "href",
      "/south-walton-resources"
    );
  });

  it("renders the public resident live room with logged-out engagement surfaces", () => {
    render(
      <LivePodcastPage
        event={{ ...fixtureEvent, status: "live" }}
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
    expect(screen.getAllByText(fixtureComments[0].body).length).toBeGreaterThan(
      0
    );
    expect(screen.getByText("Jun 26, 7:00 AM")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /district focus/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inlet Beach" })).toHaveAttribute(
      "href",
      "/districts/inlet-beach/"
    );
    expect(screen.getByRole("link", { name: "Inlet Beach" })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(screen.getByRole("link", { name: "Watersound" })).toHaveAttribute(
      "href",
      "/districts/watersound-seacrest-prominence-origins/"
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

  it("enables like and report controls for signed-in residents", () => {
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
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: /report comment from community member/i
      })
    ).toBeEnabled();
  });

  it("keeps the composer closed for replay events even when comments are enabled", () => {
    render(
      <LivePodcastPage
        event={{ ...fixtureEvent, status: "replay", comments_enabled: true }}
        districts={fixtureDistricts}
        comments={fixtureComments}
        metrics={fixtureMetrics}
        profile={unrestrictedProfile}
      />
    );

    expect(screen.getByLabelText("Comment")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Comments are closed for replay events."
    );
  });

  it("marks expired upcoming events as past and closes participation", () => {
    render(
      <LivePodcastPage
        event={{
          ...fixtureEvent,
          status: "upcoming",
          starts_at: "2020-01-01T18:00:00.000Z",
          ends_at: "2020-01-01T19:00:00.000Z",
          livestream_url: null,
          replay_url: null,
          comments_enabled: true
        }}
        districts={fixtureDistricts}
        comments={fixtureComments}
        metrics={fixtureMetrics}
        profile={unrestrictedProfile}
      />
    );

    expect(screen.getByText("Past event")).toBeInTheDocument();
    expect(
      screen.getByText("This event has ended. A replay has not been posted yet.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Comment")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Comments are closed for past events."
    );
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
