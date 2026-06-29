import { SharePanel } from "@/components/live/SharePanel";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SharePanel", () => {
  it("renders share links from plain share props", () => {
    render(
      <SharePanel
        title="Protect30A Live"
        slug="protect30a-live"
        canonicalShareUrl="https://protect30a.org/live/protect30a-live"
      />
    );

    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      expect.stringContaining(
        "https%3A%2F%2Fprotect30a.org%2Flive%2Fprotect30a-live"
      )
    );
    expect(screen.getByRole("link", { name: "Post to X" })).toBeInTheDocument();
  });

  it("does not import the mixed site config module into the client bundle", () => {
    const source = readFileSync(
      join(process.cwd(), "components/live/SharePanel.tsx"),
      "utf8"
    );

    expect(source).not.toContain("@/lib/site-config");
  });
});
