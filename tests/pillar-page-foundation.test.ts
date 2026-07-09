import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const foundationPath = join(process.cwd(), "public/assets/pillar-page-foundation.css");
const pillarRoutes = [
  "public/act/index.html",
  "public/records/index.html",
  "public/impact/index.html"
];

describe("pillar-page visual foundation", () => {
  it("provides the shared layout, navigation, and content styles", async () => {
    const css = await readFile(foundationPath, "utf8");

    expect(css).toContain("body{");
    expect(css).toContain("#nav{");
    expect(css).toContain(".pillar-head{");
    expect(css).toContain(".site-footer{");
    expect(css).toContain("main .pillar-head .pillar-intro{color:rgba(255,255,255,.88)}");
    for (const token of [
      "--aqua:#8fcdc4!important",
      "--ink-soft:#51625f!important",
      "--clay:#a97e54!important",
      "--line:rgba(14,59,56,.16)!important",
      "--shadow-lg:0 18px 60px rgba(14,59,56,.16)!important"
    ]) {
      expect(css).toContain(token);
    }
  });

  it.each(pillarRoutes)("loads the shared foundation before the additive pillar layer: %s", async (route) => {
    const html = await readFile(join(process.cwd(), route), "utf8");
    const foundation = '<link rel="stylesheet" href="/assets/pillar-page-foundation.css">';
    const additiveLayer = '<link rel="stylesheet" href="/assets/pillars.css">';

    expect(html).toContain(foundation);
    expect(html.indexOf(foundation)).toBeLessThan(html.indexOf(additiveLayer));
  });
});
