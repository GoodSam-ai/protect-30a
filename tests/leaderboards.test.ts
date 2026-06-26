import { calculateEngagementScore, rankScores } from "@/lib/live/scoring";
import { describe, expect, it } from "vitest";

describe("leaderboard scoring", () => {
  it("weights likes and featured comments more than raw volume", () => {
    expect(
      calculateEngagementScore({
        likesReceivedCount: 10,
        commentsCount: 2,
        sharesCount: 1,
        featuredCommentsCount: 1
      })
    ).toBe(44);
  });

  it("ranks highest score first with deterministic ties", () => {
    const ranked = rankScores([
      { userId: "b", displayName: "Beta", score: 10 },
      { userId: "a", displayName: "Alpha", score: 10 },
      { userId: "c", displayName: "Charlie", score: 5 }
    ]);

    expect(ranked).toEqual([
      { userId: "a", displayName: "Alpha", score: 10, rank: 1 },
      { userId: "b", displayName: "Beta", score: 10, rank: 2 },
      { userId: "c", displayName: "Charlie", score: 5, rank: 3 }
    ]);
  });

  it("uses user id as a final deterministic tie-breaker", () => {
    const ranked = rankScores([
      { userId: "user-2", displayName: "Resident", score: 20 },
      { userId: "user-1", displayName: "Resident", score: 20 }
    ]);

    expect(ranked).toEqual([
      { userId: "user-1", displayName: "Resident", score: 20, rank: 1 },
      { userId: "user-2", displayName: "Resident", score: 20, rank: 2 }
    ]);
  });
});
