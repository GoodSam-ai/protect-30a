import { GET } from "@/app/auth/callback/route";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

describe("auth callback route", () => {
  it("redirects to the requested same-origin path when no auth code is present", async () => {
    const response = await GET(
      new NextRequest("https://example.test/auth/callback?next=%2Flive%3Ftab%3Dchat")
    );

    expect(response.headers.get("location")).toBe(
      "https://example.test/live?tab=chat"
    );
  });

  it("falls back to /live when next points off origin", async () => {
    const response = await GET(
      new NextRequest(
        "https://example.test/auth/callback?next=https%3A%2F%2Fevil.test%2Flogin"
      )
    );

    expect(response.headers.get("location")).toBe("https://example.test/live");
  });
});
