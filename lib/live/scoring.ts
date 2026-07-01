export type ScoreInput = {
  likesReceivedCount: number;
  commentsCount: number;
  sharesCount: number;
  featuredCommentsCount: number;
};

export type EngagementScoreWeights = {
  likeWeight: number;
  commentWeight: number;
  shareWeight: number;
  featuredWeight: number;
};

export type RankableScore = {
  userId: string;
  displayName: string;
  score: number;
};

export const DEFAULT_ENGAGEMENT_SCORE_WEIGHTS: EngagementScoreWeights = {
  likeWeight: 3,
  commentWeight: 1,
  shareWeight: 2,
  featuredWeight: 10
};

export function calculateEngagementScore(
  input: ScoreInput,
  weights: EngagementScoreWeights = DEFAULT_ENGAGEMENT_SCORE_WEIGHTS
): number {
  return (
    input.likesReceivedCount * weights.likeWeight +
    input.commentsCount * weights.commentWeight +
    input.sharesCount * weights.shareWeight +
    input.featuredCommentsCount * weights.featuredWeight
  );
}

export function rankScores<T extends RankableScore>(
  scores: T[]
): Array<T & { rank: number }> {
  return [...scores]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const displayNameComparison = left.displayName.localeCompare(
        right.displayName
      );
      if (displayNameComparison !== 0) return displayNameComparison;
      return left.userId.localeCompare(right.userId);
    })
    .map((score, index) => ({
      ...score,
      rank: index + 1
    }));
}
