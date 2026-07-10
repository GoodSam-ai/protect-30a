import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const root = process.cwd();
const approvedAgendaUrl = "https://www.mywaltonfl.gov/AgendaCenter";
const retiredAgendaRoute = "mywaltonfl.gov/162/Meetings-Agendas";

async function readPublicFile(path: string) {
  return readFile(join(root, "public", path), "utf8");
}

describe("public content discovery repairs", () => {
  it("uses the approved Walton County agenda center in every meeting record", async () => {
    const content = JSON.parse(
      await readPublicFile("content/meetings.json")
    ) as { meetings: Array<{ agendaUrl: string }> };

    expect(content.meetings).not.toHaveLength(0);
    expect(content.meetings.map(({ agendaUrl }) => agendaUrl)).toEqual(
      content.meetings.map(() => approvedAgendaUrl)
    );
  });

  it("uses the approved Walton County agenda center in the records manifest", async () => {
    const content = JSON.parse(
      await readPublicFile("content/records-manifest.json")
    ) as { records: Array<{ id: string; sourceUrl: string }> };
    const agendaPortal = content.records.find(
      ({ id }) => id === "walton-meetings-agendas-portal"
    );

    expect(agendaPortal?.sourceUrl).toBe(approvedAgendaUrl);
  });

  it("removes the retired meeting route from the Grayton district record", async () => {
    const districtRecord = await readPublicFile(
      "content/district-data/grayton-blue-mountain.json"
    );

    expect(districtRecord).not.toContain(retiredAgendaRoute);
    expect(districtRecord).toContain(approvedAgendaUrl);
  });

  it("lists every approved public route in the sitemap", async () => {
    const sitemap = await readPublicFile("sitemap.xml");
    const routes = [
      "/act",
      "/impact",
      "/records",
      "/records-privacy",
      "/live",
      "/live/protect30a-live-community-conversation"
    ];

    for (const route of routes) {
      expect(sitemap).toContain(
        `<loc>https://protect30a.org${route}</loc>`
      );
    }
  });
});

describe("route canonical metadata", () => {
  it("publishes the South Walton resources canonical URL", async () => {
    const route = (await import("@/app/south-walton-resources/page")) as {
      metadata?: Metadata;
    };

    expect(route.metadata?.alternates?.canonical).toBe(
      "https://protect30a.org/south-walton-resources"
    );
  });

  it("publishes the live index canonical URL", async () => {
    const route = (await import("@/app/live/page")) as {
      metadata?: Metadata;
    };

    expect(route.metadata?.alternates?.canonical).toBe(
      "https://protect30a.org/live"
    );
  });

  it("builds the live event canonical URL from the requested slug", async () => {
    const route = (await import("@/app/live/[slug]/page")) as {
      generateMetadata?: (input: {
        params: Promise<{ slug: string }>;
      }) => Promise<Metadata>;
    };
    const metadata = route.generateMetadata
      ? await route.generateMetadata({
          params: Promise.resolve({ slug: "resident-water-forum" })
        })
      : undefined;

    expect(metadata?.alternates?.canonical).toBe(
      "https://protect30a.org/live/resident-water-forum"
    );
  });
});
