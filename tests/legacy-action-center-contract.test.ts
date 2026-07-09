import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, it } from "vitest";

it("keeps the currently deployed Action Center controls and assets", async () => {
  const html = await readFile(join(process.cwd(), "public/legacy/index.html"), "utf8");

  expect(html).toContain('id="pp-pledge-form"');
  expect(html).toContain('id="pp-rsvp-form"');
  expect(html).toContain('id="pp-signup-form"');
  expect(html).toContain('src="/assets/action-center.js"');
  await expect(access("public/assets/action-center.js")).resolves.toBeUndefined();
});

it("keeps newer homepage content alongside the Action Center", async () => {
  const html = await readFile(join(process.cwd(), "public/legacy/index.html"), "utf8");

  expect(html).toContain('content="F27C16E2366BC46D030546DA75EFB12F"');
  expect(html).toContain("Looking for official South Walton visitor resources?");
  expect(html).toContain('<section class="act-this-week"');
  expect(html).toContain('id="pp-pledge-form"');
  expect(html).toContain('id="pp-rsvp-form"');
  expect(html).toContain('id="pp-signup-form"');
});
