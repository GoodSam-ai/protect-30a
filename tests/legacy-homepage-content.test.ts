import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const homepagePath = join(process.cwd(), "public/legacy/index.html");
const sitemapPath = join(process.cwd(), "public/sitemap.xml");

async function readHomepage() {
  return readFile(homepagePath, "utf8");
}

async function readSitemap() {
  return readFile(sitemapPath, "utf8");
}

describe("legacy homepage content", () => {
  it("invites locals, guests, and local businesses into the stormwater plan", async () => {
    const html = await readHomepage();
    const expectedCopy = [
      "Who can help",
      "Locals",
      "Guests &amp; rental owners",
      "Local businesses"
    ];

    expect(expectedCopy.filter((copy) => !html.includes(copy))).toEqual([]);
  });

  it("adds discovery-friendly action paths near the main support section", async () => {
    const html = await readHomepage();
    const expectedCopy = [
      "Get meeting alerts",
      "Track upcoming meetings",
      "Share with local media",
      "No Scout Guide affiliation is claimed"
    ];

    expect(expectedCopy.filter((copy) => !html.includes(copy))).toEqual([]);
  });

  it("links the homepage navigation to the official South Walton resource hub", async () => {
    const html = await readHomepage();

    expect(html).toContain('href="/south-walton-resources"');
    expect(html).toContain('data-track-label="Official South Walton Resources"');
    expect(html).toContain(">Resources</a>");
  });

  it("includes the official South Walton resource hub in the sitemap", async () => {
    const xml = await readSitemap();

    expect(xml).toContain(
      "<loc>https://protect30a.org/south-walton-resources</loc>"
    );
  });

  it("keeps each lake card compact with a read-more dropdown", async () => {
    const html = await readHomepage();

    const lakeCardCount = html.match(/<article class="lake-card reveal"/g)?.length ?? 0;
    const dropdownCount = html.match(/<details class="lake-details">/g)?.length ?? 0;

    expect(lakeCardCount).toBe(15);
    expect(dropdownCount).toBe(lakeCardCount);
    expect(html).toContain("<summary>Read more about Fuller Lake</summary>");
    expect(html).toContain("<summary>Read more about Lake Powell</summary>");
  });
});
