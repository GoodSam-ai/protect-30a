export type ScoreInput = {
  likesReceivedCount: number;
  commentsCount: number;
  sharesCount: number;
  featuredCommentsCount: number;
};

export type RankableScore = {
  userId: string;
  displayName: string;
  score: number;
};

export function calculateEngagementScore(input: ScoreInput) {
  return (
    input.likesReceivedCount * 3 +
    input.commentsCount * 1 +
    input.sharesCount * 2 +
    input.featuredCommentsCount * 10
  );
}

export function rankScores<T extends RankableScore>(scores: T[]) {
  return [...scores]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.displayName.localeCompare(right.displayName);
    })
    .map((score, index) => ({
      ...score,
      rank: index + 1
    }));
}
