import { calculateEngagementScore, rankScores } from "@/lib/live/scoring";
import type { LiveComment } from "@/lib/live/types";
import { Trophy } from "lucide-react";

type AuthorScore = {
  userId: string;
  displayName: string;
  likesReceivedCount: number;
  commentsCount: number;
  sharesCount: number;
  featuredCommentsCount: number;
};

export function InfluencerLeaderboard({
  comments
}: {
  comments: LiveComment[];
}) {
  const authors = new Map<string, AuthorScore>();

  for (const comment of comments) {
    const displayName = comment.author_display_name || "Community member";
    const userId = comment.user_id ?? `public:${displayName.toLowerCase()}`;
    const existing =
      authors.get(userId) ??
      {
        userId,
        displayName,
        likesReceivedCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        featuredCommentsCount: 0
      };

    existing.likesReceivedCount += comment.like_count;
    existing.commentsCount += 1;
    existing.featuredCommentsCount += comment.is_featured ? 1 : 0;
    authors.set(userId, existing);
  }

  const rankedAuthors = rankScores(
    Array.from(authors.values()).map((author) => ({
      userId: author.userId,
      displayName: author.displayName,
      score: calculateEngagementScore(author)
    }))
  ).slice(0, 5);

  return (
    <section
      className="py-1"
      aria-labelledby="influencer-leaderboard-heading"
    >
      <div className="flex items-center gap-2">
        <Trophy size={19} className="text-protect-terra" aria-hidden="true" />
        <h2
          id="influencer-leaderboard-heading"
          className="font-serif text-xl font-semibold text-protect-teal"
        >
          Influencer leaderboard
        </h2>
      </div>

      {rankedAuthors.length > 0 ? (
        <ol className="mt-4 grid gap-2">
          {rankedAuthors.map((author) => (
            <li
              key={author.userId}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded border border-protect-sand bg-white px-3 py-2 shadow-sm"
            >
              <span className="flex size-8 items-center justify-center rounded bg-protect-teal text-sm font-bold text-white">
                {author.rank}
              </span>
              <span className="min-w-0 truncate font-semibold text-protect-ink">
                {author.displayName}
              </span>
              <span className="text-sm font-semibold text-protect-teal">
                {author.score} pts
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded border border-dashed border-protect-sand bg-white p-4 text-sm text-protect-ink/70">
          The leaderboard will populate when comments arrive.
        </p>
      )}
    </section>
  );
}
