import { SignInPanel } from "@/components/auth/SignInPanel";
import { CommentComposer } from "@/components/live/CommentComposer";
import { DistrictSelector } from "@/components/live/DistrictSelector";
import { EngagementDashboard } from "@/components/live/EngagementDashboard";
import { InfluencerLeaderboard } from "@/components/live/InfluencerLeaderboard";
import { LiveCommentFeed } from "@/components/live/LiveCommentFeed";
import { SharePanel } from "@/components/live/SharePanel";
import type { PublicProfile } from "@/lib/auth/session";
import type {
  District,
  LiveComment,
  LiveMetrics,
  PodcastEvent
} from "@/lib/live/types";
import { CalendarDays, Mic2, Radio, UsersRound } from "lucide-react";

function formatEventTime(value: string | null) {
  if (!value) return "Time to be announced";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(value));
}

function statusLabel(event: PodcastEvent) {
  if (event.status === "live") return "Live now";
  if (event.status === "replay") return "Replay available";
  if (event.status === "archived") return "Archived";
  return "Upcoming";
}

export function LivePodcastPage({
  event,
  districts,
  comments,
  metrics,
  profile
}: {
  event: PodcastEvent;
  districts: District[];
  comments: LiveComment[];
  metrics: LiveMetrics;
  profile: PublicProfile | null;
}) {
  const selectedDistrict = districts.find(
    (district) => district.id === event.district_id
  );
  const guestLine = [
    event.host_name,
    event.cohost_name,
    event.advocate_name,
    ...event.guest_names
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-protect-cream text-protect-ink">
      <section className="border-b border-protect-sand bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded border border-protect-terra bg-protect-cream px-3 py-1 text-sm font-semibold text-protect-teal">
                <Radio size={16} aria-hidden="true" />
                {statusLabel(event)}
              </span>
              {selectedDistrict ? (
                <span className="rounded border border-protect-sand px-3 py-1 text-sm font-semibold text-protect-ink/75">
                  {selectedDistrict.name}
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 font-serif text-3xl font-bold text-protect-teal sm:text-4xl">
              Resident Live Room
            </h1>
            <p className="mt-2 text-xl font-semibold text-protect-ink">
              {event.title}
            </p>
            {event.description ? (
              <p className="mt-3 max-w-3xl leading-7 text-protect-ink/78">
                {event.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 rounded border border-protect-sand bg-protect-cream p-4">
            <div className="flex items-start gap-3">
              <CalendarDays
                size={19}
                className="mt-0.5 shrink-0 text-protect-terra"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-protect-ink/60">
                  Event time
                </p>
                <p className="mt-1 font-semibold text-protect-teal">
                  {formatEventTime(event.starts_at)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mic2
                size={19}
                className="mt-0.5 shrink-0 text-protect-terra"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-protect-ink/60">
                  Hosts and guests
                </p>
                <p className="mt-1 break-words font-semibold text-protect-teal">
                  {guestLine.join(", ")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UsersRound
                size={19}
                className="mt-0.5 shrink-0 text-protect-terra"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-protect-ink/60">
                  Participation
                </p>
                <p className="mt-1 font-semibold text-protect-teal">
                  {event.comments_enabled
                    ? "Comments open for signed-in residents"
                    : "Comments closed"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:px-8">
        <div className="grid min-w-0 gap-6">
          {profile ? (
            <CommentComposer event={event} profile={profile} />
          ) : (
            <SignInPanel redirectTo={`/live/${event.slug}`} />
          )}
          <LiveCommentFeed comments={comments} viewerProfile={profile} />
        </div>

        <aside className="grid content-start gap-5" aria-label="Live room tools">
          <SharePanel event={event} />
          <EngagementDashboard metrics={metrics} />
          <InfluencerLeaderboard comments={comments} />
          <DistrictSelector
            districts={districts}
            selectedDistrictId={event.district_id}
          />
        </aside>
      </section>

      <section className="border-t border-protect-sand bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 text-sm leading-6 text-protect-ink/72 sm:px-6 lg:px-8">
          {event.disclaimer}
        </div>
      </section>
    </main>
  );
}
