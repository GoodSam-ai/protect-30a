import { LivePodcastPage } from "@/components/live/LivePodcastPage";
import {
  fixtureComments,
  fixtureDistricts,
  fixtureEvent,
  fixtureMetrics
} from "@/lib/live/fixtures";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
});
