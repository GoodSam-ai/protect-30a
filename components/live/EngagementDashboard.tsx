import type { LiveMetrics } from "@/lib/live/types";
import {
  BarChart3,
  Heart,
  MessageSquareText,
  Share2,
  TrendingUp
} from "lucide-react";

function formatMetric(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1
  }).format(value);
}

export function EngagementDashboard({ metrics }: { metrics: LiveMetrics }) {
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

      <dl className="mt-4 grid grid-cols-2 gap-3">
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

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-protect-teal">Top topics</h3>
        {metrics.topTopics.length > 0 ? (
          <ol className="mt-2 grid gap-2">
            {metrics.topTopics.slice(0, 4).map((topic) => (
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
          <p className="mt-2 text-sm text-protect-ink/70">
            Topics will appear as residents comment.
          </p>
        )}
      </div>
    </section>
  );
}
