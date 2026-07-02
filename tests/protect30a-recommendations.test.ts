import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const homepagePath = join(root, "public/legacy/index.html");
const sourceLibraryPath = join(root, "public/source-library/index.html");
const sitemapPath = join(root, "public/sitemap.xml");
const nextConfigPath = join(root, "next.config.mjs");

const districtPages = [
  "30a-stormwater",
  "alys-beach",
  "grayton-blue-mountain",
  "inlet-beach",
  "rosemary-beach",
  "sandestin-miramar-beach-seascape",
  "santa-rosa-beach-gulf-place-dune-allen",
  "seagrove-seaside-watercolor",
  "watersound-seacrest-prominence-origins"
];

async function read(path: string) {
  return readFile(path, "utf8");
}

describe("Protect30A recommendation implementation", () => {
  it("places a compact act-this-week panel directly after the funding countdown", async () => {
    const html = await read(homepagePath);
    const countdownIndex = html.indexOf('<div class="count-band">');
    const actionIndex = html.indexOf('<section class="act-this-week"');
    const whyIndex = html.indexOf("<!-- WHY NOW -->");

    expect(actionIndex).toBeGreaterThan(countdownIndex);
    expect(actionIndex).toBeLessThan(whyIndex);
    expect(html).toContain("Act this week");
    expect(html).toContain("Open a pre-written commissioner email");
    expect(html).toContain("Get meeting alerts");
    expect(html).toContain('href="/source-library"');
    expect(html).toContain("Review the sources");
  });

  it("adds a public source library route and includes it in discovery files", async () => {
    const html = await read(sourceLibraryPath);
    const sitemap = await read(sitemapPath);
    const nextConfig = await read(nextConfigPath);

    expect(html).toContain("<title>Sources &amp; Evidence | Protect30A</title>");
    expect(html).toContain("Sources &amp; Evidence");
    expect(html).toContain("claim-evidence");
    expect(html).toContain("Date checked");
    expect(html).toContain("Florida Statutes");
    expect(html).toContain("Choctawhatchee Basin Alliance");
    expect(sitemap).toContain("<loc>https://protect30a.org/source-library</loc>");
    expect(nextConfig).toContain('{ source: "/source-library", destination: "/source-library/index.html" }');
  });

  it("reframes the district hub as live media pages rather than future placeholders", async () => {
    const html = await read(join(root, "public/districts/index.html"));

    expect(html).toContain("embedded videos, podcast players, source notes, local priorities, and resident action paths");
    expect(html).toContain("Video and podcast pages");
    expect(html).not.toContain("future embeds");
    expect(html).not.toContain("final playlist IDs");
    expect(html).not.toContain("Episode-specific embeds can be dropped");
  });

  it("gives every district page local proof and action paths", async () => {
    const pages = await Promise.all(
      districtPages.map(async (slug) => ({
        slug,
        html: await read(join(root, "public/districts", slug, "index.html"))
      }))
    );

    for (const { slug, html } of pages) {
      expect(html, slug).toContain("district-action-panel");
      expect(html, slug).toContain("Local proof kit");
      expect(html, slug).toContain("Source links and transcript status");
      expect(html, slug).toContain("Report a stormwater trouble spot");
      expect(html, slug).toContain("mailto:doug@goodsamaritaninstitute.org");
      expect(html, slug).toContain('href="/source-library"');
    }
  });
});
