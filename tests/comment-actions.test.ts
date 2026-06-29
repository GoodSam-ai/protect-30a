import {
  commentInputSchema,
  isRapidDuplicateComment,
  reportInputSchema
} from "@/lib/live/validation";
import { describe, expect, it } from "vitest";

describe("comment validation", () => {
  it("accepts valid comments with supported topics", () => {
    expect(
      commentInputSchema.parse({
        eventId: "11111111-1111-4111-8111-111111111111",
        districtId: "22222222-2222-4222-8222-222222222222",
        body: "Stormwater drains near our street need attention.",
        topic: "Stormwater"
      })
    ).toMatchObject({ topic: "Stormwater" });
  });

  it("rejects comments shorter than five characters", () => {
    expect(() =>
      commentInputSchema.parse({
        eventId: "11111111-1111-4111-8111-111111111111",
        body: "hey"
      })
    ).toThrow();
  });

  it("detects duplicate rapid posting", () => {
    expect(
      isRapidDuplicateComment({
        previousBody: "Same concern",
        nextBody: " same concern ",
        previousCreatedAt: new Date("2026-06-26T12:00:00Z"),
        now: new Date("2026-06-26T12:00:20Z")
      })
    ).toBe(true);
  });

  it("validates reports", () => {
    expect(
      reportInputSchema.parse({
        reason: "spam",
        details: "Repeated unrelated link."
      })
    ).toEqual({ reason: "spam", details: "Repeated unrelated link." });
  });
});
