import { calculateEngagementScore, rankScores } from "@/lib/live/scoring";
import type {
  LiveComment,
  LiveDistrictInfluencerScore,
  LiveInfluencerScore,
  LiveMetrics
} from "@/lib/live/types";
import { Trophy } from "lucide-react";

export function InfluencerLeaderboard({
  metrics,
  comments
}: {
  metrics?: LiveMetrics;
  comments?: LiveComment[];
}) {
  const dashboardMetrics =
    metrics ?? buildClientMetricsFromComments(comments ?? []);
  const hasLeaders =
    dashboardMetrics.eventLeaders.length > 0 ||
    dashboardMetrics.weeklyDistrictLeaders.length > 0 ||
    dashboardMetrics.allTimeDistrictLeaders.length > 0;

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

      {hasLeaders ? (
        <div className="mt-4 grid gap-4">
          <InfluencerSection
            title="Current event leaders"
            leaders={dashboardMetrics.eventLeaders}
          />
          <InfluencerSection
            title="Current week district leaders"
            leaders={dashboardMetrics.weeklyDistrictLeaders}
            showDistrict
          />
          {dashboardMetrics.allTimeDistrictLeaders.length > 0 ? (
            <InfluencerSection
              title="All-time district leaders"
              leaders={dashboardMetrics.allTimeDistrictLeaders}
              showDistrict
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded border border-dashed border-protect-sand bg-white p-4 text-sm text-protect-ink/70">
          The leaderboard will populate when comments arrive.
        </p>
      )}
    </section>
  );
}

function InfluencerSection({
  title,
  leaders,
  showDistrict = false
}: {
  title: string;
  leaders: Array<LiveInfluencerScore | LiveDistrictInfluencerScore>;
  showDistrict?: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-protect-teal">{title}</h3>
      {leaders.length > 0 ? (
        <ol className="mt-2 grid gap-2">
          {leaders.slice(0, 5).map((leader) => (
            <li
              key={`${title}-${leader.rank}-${leader.displayName}`}
              className="rounded border border-protect-sand bg-white px-3 py-3 text-sm shadow-sm"
            >
              <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
                <span className="flex size-8 items-center justify-center rounded bg-protect-teal text-sm font-bold text-white">
                  {leader.rank}
                </span>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold text-protect-ink">
                      {leader.displayName}
                    </p>
                    <p className="shrink-0 font-semibold text-protect-teal">
                      {formatNumber(leader.engagementScore)} pts
                    </p>
                  </div>
                  {showDistrict && "districtName" in leader ? (
                    <p className="mt-0.5 text-xs text-protect-ink/65">
                      {leader.districtName}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-protect-ink/70">
                    {formatNumber(leader.likesReceivedCount)} likes /{" "}
                    {formatNumber(leader.commentsCount)} comments
                  </p>
                  {leader.topCommentText ? (
                    <p className="mt-2 line-clamp-2 text-protect-ink">
                      {leader.topCommentText}
                    </p>
                  ) : null}
                  <p
                    className={
                      leader.podcastInvitationEligible
                        ? "mt-2 text-xs font-semibold text-protect-teal"
                        : "mt-2 text-xs font-semibold text-protect-ink/60"
                    }
                  >
                    {leader.podcastInvitationEligible
                      ? "Podcast invite eligible"
                      : "Building podcast eligibility"}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 rounded border border-dashed border-protect-sand bg-white p-3 text-sm text-protect-ink/70">
          This leaderboard will appear as residents participate.
        </p>
      )}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1
  }).format(value);
}

function buildClientMetricsFromComments(comments: LiveComment[]): LiveMetrics {
  const leaders = rankScores(
    Array.from(
      comments.reduce<
        Map<
          string,
          {
            userId: string;
            displayName: string;
            avatarUrl: string | null;
            commentsCount: number;
            likesReceivedCount: number;
            sharesCount: number;
            featuredCommentsCount: number;
            topCommentText: string | null;
            topCommentLikes: number;
          }
        >
      >((authors, comment) => {
        const displayName = comment.author_display_name || "Community member";
        const userId = comment.user_id ?? `public:${displayName.toLowerCase()}`;
        const existing =
          authors.get(userId) ??
          {
            userId,
            displayName,
            avatarUrl: comment.author_avatar_url,
            commentsCount: 0,
            likesReceivedCount: 0,
            sharesCount: 0,
            featuredCommentsCount: 0,
            topCommentText: null,
            topCommentLikes: -1
          };

        existing.commentsCount += 1;
        existing.likesReceivedCount += comment.like_count;
        existing.featuredCommentsCount += comment.is_featured ? 1 : 0;
        if (comment.like_count > existing.topCommentLikes) {
          existing.topCommentText = comment.body;
          existing.topCommentLikes = comment.like_count;
        }
        authors.set(userId, existing);
        return authors;
      }, new Map()).values()
    ).map((author) => ({
      ...author,
      score: calculateEngagementScore(author)
    }))
  ).map(({ score, rank, ...author }) => ({
    displayName: author.displayName,
    avatarUrl: author.avatarUrl,
    commentsCount: author.commentsCount,
    likesReceivedCount: author.likesReceivedCount,
    sharesCount: author.sharesCount,
    featuredCommentsCount: author.featuredCommentsCount,
    engagementScore: score,
    rank,
    topCommentText: author.topCommentText,
    podcastInvitationEligible: score >= 30
  }));

  return {
    totalComments: comments.length,
    totalLikes: comments.reduce((sum, comment) => sum + comment.like_count, 0),
    totalShares: 0,
    commentsPerMinute: 0,
    topTopics: [],
    topicLeaderboard: [],
    topComments: [],
    eventLeaders: leaders,
    weeklyDistrictLeaders: [],
    allTimeDistrictLeaders: [],
    districtEngagementScores: []
  };
}
