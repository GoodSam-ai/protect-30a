import { SouthWaltonResourcesPage } from "@/components/south-walton/SouthWaltonResourcesPage";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("SouthWaltonResourcesPage", () => {
  it("keeps Protect30A site navigation at the top of the resource hub", () => {
    render(<SouthWaltonResourcesPage />);

    const nav = screen.getByRole("navigation", { name: /protect30a site/i });

    expect(nav).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Protect 30A home" })
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/"
    );
    expect(screen.getByRole("link", { name: "The Show" })).toHaveAttribute(
      "href",
      "/show"
    );
    expect(screen.getByRole("link", { name: "Districts" })).toHaveAttribute(
      "href",
      "/districts/"
    );
    expect(screen.getByRole("link", { name: "Live Room" })).toHaveAttribute(
      "href",
      "/live"
    );
    expect(screen.getByRole("link", { name: "Resources" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders a permission-aware official resource hub", () => {
    render(<SouthWaltonResourcesPage />);

    expect(
      screen.getByRole("heading", {
        name: /official south walton resources/i
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/protect30a links to official tourism resources/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /visit south walton events/i })
    ).toHaveAttribute("href", "https://www.visitsouthwalton.com/events/");
    expect(
      screen.getByRole("link", { name: /beach access info/i })
    ).toHaveAttribute(
      "href",
      "https://www.visitsouthwalton.com/beach-bay-access-locations/"
    );
  });

  it("maps Protect30A districts to official Visit South Walton neighborhood pages", () => {
    render(<SouthWaltonResourcesPage />);

    expect(
      screen.getByRole("heading", { name: /district resource links/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /inlet beach official guide/i })
    ).toHaveAttribute(
      "href",
      "https://www.visitsouthwalton.com/neighborhoods/inlet-beach/"
    );
    expect(
      screen.getByRole("link", { name: /grayton beach official guide/i })
    ).toHaveAttribute(
      "href",
      "https://www.visitsouthwalton.com/neighborhoods/grayton-beach/"
    );
    expect(
      screen.getByRole("link", { name: /blue mountain beach official guide/i })
    ).toHaveAttribute(
      "href",
      "https://www.visitsouthwalton.com/neighborhoods/blue-mountain/"
    );
  });

  it("surfaces a curated integration workflow without republishing third-party content", () => {
    render(<SouthWaltonResourcesPage />);

    expect(screen.getByText(/source label/i)).toBeInTheDocument();
    expect(screen.getByText(/last checked/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no Visit South Walton photos, maps, or descriptions are republished/i)
    ).toBeInTheDocument();
  });
});
