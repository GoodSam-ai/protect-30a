import { SignInPanel } from "@/components/auth/SignInPanel";
import { LivePodcastEngagement } from "@/components/live/LivePodcastEngagement";
import { formatLiveEventTime } from "@/components/live/date-format";
import type { PublicProfile } from "@/lib/auth/session";
import type {
  District,
  LiveComment,
  LiveMetrics,
  PodcastEvent
} from "@/lib/live/types";
import { getCanonicalUrl } from "@/lib/site-config";
import { CalendarDays, Mic2, Radio, UsersRound } from "lucide-react";

function statusLabel(event: PodcastEvent) {
  if (event.status === "live") return "Live now";
  if (event.status === "replay") return "Replay available";
  if (event.status === "archived") return "Archived";
  return "Upcoming";
}

function playerLabel(event: PodcastEvent) {
  if (event.livestream_url) return "Livestream";
  if (event.replay_url) return "Replay";
  return "Player pending";
}

function buildCommentComposerProps(event: PodcastEvent, profile: PublicProfile) {
  const displayName = profile.display_name?.trim() || "Community member";
  const canDraft = event.comments_enabled && !profile.is_restricted;
  const status = !event.comments_enabled
    ? "Comments are closed for this event."
    : profile.is_restricted
      ? "Your profile cannot post comments right now."
      : "Ready to post.";

  return {
    eventId: event.id,
    districtId: event.district_id,
    displayName,
    canDraft,
    status
  };
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
  const playerUrl = event.livestream_url || event.replay_url;
  const composerProps = profile
    ? buildCommentComposerProps(event, profile)
    : null;
  const canonicalShareUrl = getCanonicalUrl(`/live/${event.slug}`);
  const playerSlot = (
    <section
      className="overflow-hidden rounded border border-protect-sand bg-white shadow-sm"
      aria-labelledby="podcast-player-heading"
    >
      <div className="flex flex-col gap-2 border-b border-protect-sand px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="podcast-player-heading"
          className="font-serif text-xl font-semibold text-protect-teal"
        >
          Podcast player
        </h2>
        <span className="w-fit rounded border border-protect-sand bg-protect-cream px-3 py-1 text-sm font-semibold text-protect-teal">
          {playerLabel(event)}
        </span>
      </div>
      <div
        className="flex aspect-video min-h-56 items-center justify-center bg-protect-teal p-5 text-center text-white"
        aria-label={`${event.title} player surface`}
      >
        {playerUrl ? (
          <div className="grid max-w-xl gap-3">
            <p className="text-lg font-semibold">
              {event.livestream_url
                ? "The livestream is available."
                : "The replay is available."}
            </p>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded bg-white px-4 font-semibold text-protect-teal"
              href={playerUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open player
            </a>
          </div>
        ) : (
          <div className="grid max-w-xl gap-2">
            <p className="text-lg font-semibold">
              Livestream or replay will appear here when the event starts.
            </p>
            <p className="text-sm text-white/80">
              You can still sign in and follow the public conversation below.
            </p>
          </div>
        )}
      </div>
    </section>
  );

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
                  {formatLiveEventTime(event.starts_at)}
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

      <LivePodcastEngagement
        event={event}
        districts={districts}
        initialComments={comments}
        initialMetrics={metrics}
        profile={profile}
        composerProps={composerProps}
        playerSlot={playerSlot}
        signedOutSlot={<SignInPanel redirectTo={`/live/${event.slug}`} />}
        canonicalShareUrl={canonicalShareUrl}
      />

      <section className="border-t border-protect-sand bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 text-sm leading-6 text-protect-ink/72 sm:px-6 lg:px-8">
          {event.disclaimer}
        </div>
      </section>
    </main>
  );
}
