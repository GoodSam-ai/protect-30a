import {
  formatLiveCommentTime,
  formatLiveEventTime
} from "@/components/live/date-format";
import { describe, expect, it } from "vitest";

describe("live date formatting", () => {
  it("formats live room times in 30A Central time", () => {
    expect(formatLiveEventTime("2026-07-03T23:00:00.000Z")).toBe(
      "Fri, Jul 3, 6:00 PM CDT"
    );
    expect(formatLiveCommentTime("2026-06-26T12:00:00.000Z")).toBe(
      "Jun 26, 7:00 AM"
    );
  });
});
