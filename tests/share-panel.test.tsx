import { SharePanel } from "@/components/live/SharePanel";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const canonicalShareUrl = "https://protect30a.org/live/protect30a-live";
const eventId = "20000000-0000-4000-8000-000000000001";
const writeTextMock = vi.fn();
const shareMock = vi.fn();

function renderSharePanel(canTrackShare = false) {
  return render(
    <SharePanel
      eventId={eventId}
      title="Protect30A Live"
      canonicalShareUrl={canonicalShareUrl}
      canTrackShare={canTrackShare}
    />
  );
}

describe("SharePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeTextMock.mockResolvedValue(undefined);
    shareMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: shareMock
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
  });

  it("renders share links from plain share props", () => {
    renderSharePanel();

    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      expect.stringContaining(
        "https%3A%2F%2Fprotect30a.org%2Flive%2Fprotect30a-live"
      )
    );
    expect(screen.getByRole("link", { name: "Post to X" })).toHaveAttribute(
      "href",
      expect.stringContaining(
        "https%3A%2F%2Fprotect30a.org%2Flive%2Fprotect30a-live"
      )
    );
  });

  it("uses the canonical URL for copy and native share", async () => {
    renderSharePanel();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(canonicalShareUrl)
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Copied canonical live room link."
    );

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() =>
      expect(shareMock).toHaveBeenCalledWith({
        title: "Protect30A Live",
        text: "Protect30A Live - join the Protect30A live room",
        url: canonicalShareUrl
      })
    );
  });

  it("offers TikTok and Instagram pathways using the canonical URL", async () => {
    renderSharePanel();

    expect(screen.getByRole("link", { name: "Open TikTok" })).toHaveAttribute(
      "href",
      "https://www.tiktok.com/"
    );
    expect(screen.getByRole("link", { name: "Open Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/"
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link for TikTok" }));
    await waitFor(() =>
      expect(writeTextMock).toHaveBeenLastCalledWith(canonicalShareUrl)
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Copied canonical live room link for TikTok."
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Copy link for Instagram" })
    );
    await waitFor(() =>
      expect(writeTextMock).toHaveBeenLastCalledWith(canonicalShareUrl)
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Copied canonical live room link for Instagram."
    );
  });

  it("tracks share options for signed-in users without blocking canonical behavior", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    renderSharePanel(true);

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(canonicalShareUrl)
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, platform: "copy_link" })
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link for TikTok" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, platform: "tiktok" })
      })
    );
  });

  it("does not track share options for anonymous users", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    renderSharePanel(false);

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(canonicalShareUrl)
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not import the mixed site config module into the client bundle", () => {
    const source = readFileSync(
      join(process.cwd(), "components/live/SharePanel.tsx"),
      "utf8"
    );

    expect(source).not.toContain("@/lib/site-config");
  });
});
