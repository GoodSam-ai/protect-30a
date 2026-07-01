import { LiveCommentFeed } from "@/components/live/LiveCommentFeed";
import type { PublicProfile } from "@/lib/auth/session";
import { fixtureComments, fixtureDistricts } from "@/lib/live/fixtures";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const viewerProfile: PublicProfile = {
  id: "40000000-0000-4000-8000-000000000001",
  display_name: "Resident Voice",
  avatar_url: null,
  role: "user",
  primary_district_id: fixtureDistricts[0].id,
  is_restricted: false
};

describe("LiveCommentFeed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits resident reports from visible comments", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    render(
      <LiveCommentFeed comments={fixtureComments} viewerProfile={viewerProfile} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /report comment from community member/i
      })
    );
    fireEvent.change(screen.getByLabelText("Report reason"), {
      target: { value: "misinformation" }
    });
    fireEvent.change(screen.getByLabelText("Report details (optional)"), {
      target: { value: "Needs a fact check." }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/comments/${fixtureComments[0].id}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "misinformation",
            details: "Needs a fact check."
          })
        }
      )
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Report submitted for moderation."
    );
  });
});
