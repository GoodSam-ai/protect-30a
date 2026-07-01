import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("vercel.json", () => {
  it("forces the Next.js framework preset for production deployments", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      framework?: string;
    };

    expect(config.framework).toBe("nextjs");
  });
});
