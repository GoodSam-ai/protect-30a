"use client";

import type { LiveMetrics } from "@/lib/live/types";
import {
  BarChart3,
  Heart,
  MessageSquareText,
  Share2,
  TrendingUp
} from "lucide-react";
import { useState, type ReactNode } from "react";

function formatMetric(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1
  }).format(value);
}

export function EngagementDashboard({ metrics }: { metrics: LiveMetrics }) {
  const [activeView, setActiveView] = useState<"simple" | "detailed">("simple");
  const metricItems = [
    {
      label: "Comments",
      value: formatMetric(metrics.totalComments),
      icon: MessageSquareText
    },
    { label: "Likes", value: formatMetric(metrics.totalLikes), icon: Heart },
    { label: "Shares", value: formatMetric(metrics.totalShares), icon: Share2 },
    {
      label: "Per minute",
      value: formatMetric(metrics.commentsPerMinute),
      icon: TrendingUp
    }
  ];

  return (
    <section
      className="py-1"
      aria-labelledby="engagement-dashboard-heading"
    >
      <div className="flex items-center gap-2">
        <BarChart3 size={19} className="text-protect-terra" aria-hidden="true" />
        <h2
          id="engagement-dashboard-heading"
          className="font-serif text-xl font-semibold text-protect-teal"
        >
          Community pulse
        </h2>
      </div>

      <div
        className="mt-4 grid grid-cols-2 gap-2"
        role="group"
        aria-label="Engagement dashboard view"
      >
        {[
          { id: "simple" as const, label: "Simple Trend View" },
          { id: "detailed" as const, label: "Detailed Leaderboard View" }
        ].map((view) => {
          const selected = activeView === view.id;

          return (
            <button
              key={view.id}
              type="button"
              className={
                selected
                  ? "min-h-11 rounded border border-protect-teal bg-protect-teal px-2 text-xs font-semibold text-white sm:text-sm"
                  : "min-h-11 rounded border border-protect-sand bg-protect-cream px-2 text-xs font-semibold text-protect-teal hover:bg-white sm:text-sm"
              }
              aria-pressed={selected}
              onClick={() => setActiveView(view.id)}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      {activeView === "simple" ? (
        <SimpleTrendView metricItems={metricItems} metrics={metrics} />
      ) : (
        <DetailedLeaderboardView metrics={metrics} />
      )}
    </section>
  );
}

function SimpleTrendView({
  metricItems,
  metrics
}: {
  metricItems: Array<{
    label: string;
    value: string;
    icon: typeof MessageSquareText;
  }>;
  metrics: LiveMetrics;
}) {
  return (
    <div className="mt-4 grid gap-4">
      <dl className="grid grid-cols-2 gap-3">
        {metricItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="min-h-24 rounded border border-protect-sand bg-white p-3 shadow-sm"
            >
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-protect-ink/65">
                <Icon size={15} aria-hidden="true" />
                {item.label}
              </dt>
              <dd className="mt-2 text-2xl font-bold text-protect-teal">
                {item.value}
              </dd>
            </div>
          );
        })}
      </dl>

      <TopicList title="Top topics" topics={metrics.topTopics} />

      <div>
        <h3 className="text-sm font-semibold text-protect-teal">
          Engagement score by district
        </h3>
        {metrics.districtEngagementScores.length > 0 ? (
          <ol className="mt-2 grid gap-2">
            {metrics.districtEngagementScores.slice(0, 5).map((district) => (
              <li
                key={district.districtId ?? district.districtName}
                className="flex items-center justify-between gap-3 rounded border border-protect-sand px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate font-semibold text-protect-ink">
                  {district.districtName}
                </span>
                <span className="shrink-0 text-protect-teal">
                  {formatMetric(district.engagementScore)} pts
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState>District scores will appear as residents participate.</EmptyState>
        )}
      </div>
    </div>
  );
}

function DetailedLeaderboardView({ metrics }: { metrics: LiveMetrics }) {
  return (
    <div className="mt-4 grid gap-4">
      <div>
        <h3 className="text-sm font-semibold text-protect-teal">Top comments</h3>
        {metrics.topComments.length > 0 ? (
          <ol className="mt-2 grid gap-2">
            {metrics.topComments.slice(0, 5).map((comment) => (
              <li
                key={comment.id}
                className="rounded border border-protect-sand bg-white px-3 py-2 text-sm shadow-sm"
              >
                <p className="line-clamp-2 font-semibold text-protect-ink">
                  {comment.body}
                </p>
                <p className="mt-1 text-xs text-protect-ink/65">
                  {comment.displayName} - {formatMetric(comment.likeCount)} likes
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState>Top comments will appear as residents comment.</EmptyState>
        )}
      </div>

      <LeaderList title="Event leaders" leaders={metrics.eventLeaders} />
      <LeaderList title="District leaders" leaders={metrics.weeklyDistrictLeaders} />
      <LeaderList
        title="Weekly influencers"
        leaders={metrics.weeklyDistrictLeaders}
      />

      <div>
        <h3 className="text-sm font-semibold text-protect-teal">
          Running district leaderboard
        </h3>
        {metrics.districtEngagementScores.length > 0 ? (
          <ol className="mt-2 grid gap-2">
            {metrics.districtEngagementScores.slice(0, 8).map((district) => (
              <li
                key={district.districtId ?? district.districtName}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded border border-protect-sand px-3 py-2 text-sm"
              >
                <span className="text-xs font-bold text-protect-terra">
                  #{district.rank}
                </span>
                <span className="min-w-0 truncate font-semibold text-protect-ink">
                  {district.districtName}
                </span>
                <span className="text-protect-teal">
                  {formatMetric(district.engagementScore)} pts
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState>District rankings will appear as activity grows.</EmptyState>
        )}
      </div>

      <TopicList title="Topic leaderboard" topics={metrics.topicLeaderboard} />
    </div>
  );
}

function LeaderList({
  title,
  leaders
}: {
  title: string;
  leaders: LiveMetrics["eventLeaders"] | LiveMetrics["weeklyDistrictLeaders"];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-protect-teal">{title}</h3>
      {leaders.length > 0 ? (
        <ol className="mt-2 grid gap-2">
          {leaders.slice(0, 5).map((leader) => (
            <li
              key={`${title}-${leader.rank}-${leader.displayName}`}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded border border-protect-sand px-3 py-2 text-sm"
            >
              <span className="text-xs font-bold text-protect-terra">
                #{leader.rank}
              </span>
              <span className="min-w-0 truncate font-semibold text-protect-ink">
                {leader.displayName}
              </span>
              <span className="text-protect-teal">
                {formatMetric(leader.engagementScore)} pts
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState>{title} will appear as residents participate.</EmptyState>
      )}
    </div>
  );
}

function TopicList({
  title,
  topics
}: {
  title: string;
  topics: LiveMetrics["topTopics"];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-protect-teal">{title}</h3>
      {topics.length > 0 ? (
        <ol className="mt-2 grid gap-2">
          {topics.slice(0, 5).map((topic) => (
            <li
              key={topic.topic}
              className="flex items-center justify-between gap-3 rounded border border-protect-sand px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate font-semibold text-protect-ink">
                {topic.topic}
              </span>
              <span className="shrink-0 text-protect-teal">
                {formatMetric(topic.count)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState>Topics will appear as residents comment.</EmptyState>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded border border-dashed border-protect-sand bg-white p-3 text-sm text-protect-ink/70">
      {children}
    </p>
  );
}
