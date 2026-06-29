import {
  commentInputSchema,
  isRapidDuplicateComment,
  reportInputSchema,
  shareInputSchema
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

  it("does not treat matching comments outside sixty seconds as rapid duplicates", () => {
    expect(
      isRapidDuplicateComment({
        previousBody: "Same concern",
        nextBody: " same concern ",
        previousCreatedAt: new Date("2026-06-26T12:00:00Z"),
        now: new Date("2026-06-26T12:01:01Z")
      })
    ).toBe(false);
  });

  it("validates reports", () => {
    expect(
      reportInputSchema.parse({
        reason: "spam",
        details: "Repeated unrelated link."
      })
    ).toEqual({ reason: "spam", details: "Repeated unrelated link." });
  });

  it("normalizes report reasons before validation", () => {
    expect(
      reportInputSchema.parse({
        reason: " Spam ",
        details: "Repeated unrelated link."
      })
    ).toEqual({ reason: "spam", details: "Repeated unrelated link." });
  });

  it("rejects unsupported report reasons", () => {
    expect(() =>
      reportInputSchema.parse({
        reason: "copyright",
        details: "This reason is not in the database constraint."
      })
    ).toThrow();
  });

  it("accepts report details at the database length boundary", () => {
    expect(
      reportInputSchema.parse({
        reason: "other",
        details: "x".repeat(1000)
      }).details
    ).toHaveLength(1000);
  });

  it("rejects report details beyond the database length boundary", () => {
    expect(() =>
      reportInputSchema.parse({
        reason: "other",
        details: "x".repeat(1001)
      })
    ).toThrow();
  });

  it("normalizes share platforms before validation", () => {
    expect(
      shareInputSchema.parse({
        eventId: "11111111-1111-4111-8111-111111111111",
        platform: " TikTok "
      })
    ).toEqual({
      eventId: "11111111-1111-4111-8111-111111111111",
      platform: "tiktok"
    });
  });

  it("rejects unsupported share platforms", () => {
    expect(() =>
      shareInputSchema.parse({
        eventId: "11111111-1111-4111-8111-111111111111",
        platform: "linkedin"
      })
    ).toThrow();
  });
});
