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
