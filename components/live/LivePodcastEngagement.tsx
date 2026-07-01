"use client";

import { CommentComposer } from "@/components/live/CommentComposer";
import { DistrictSelector } from "@/components/live/DistrictSelector";
import { EngagementDashboard } from "@/components/live/EngagementDashboard";
import { InfluencerLeaderboard } from "@/components/live/InfluencerLeaderboard";
import { LiveCommentFeed } from "@/components/live/LiveCommentFeed";
import { SharePanel } from "@/components/live/SharePanel";
import { useLiveEngagement } from "@/components/live/useLiveEngagement";
import type { PublicProfile } from "@/lib/auth/session";
import type {
  District,
  EngagementMode,
  LiveComment,
  LiveMetrics,
  PodcastEvent
} from "@/lib/live/types";
import { RadioTower } from "lucide-react";
import { Fragment, type ReactNode } from "react";

type CommentComposerProps = {
  eventId: string;
  districtId: string | null;
  displayName: string;
  canDraft: boolean;
  status: string;
  onCommentSubmitted?: (comment: LiveComment) => void;
};

const modeOptions: Array<{ mode: EngagementMode; label: string }> = [
  { mode: "auto", label: "Auto" },
  { mode: "realtime", label: "Realtime" },
  { mode: "polling", label: "Polling" },
  { mode: "low-bandwidth", label: "Low bandwidth" }
];

function DisabledLeaderboard() {
  return (
    <section
      className="py-1"
      aria-labelledby="influencer-leaderboard-heading"
    >
      <h2
        id="influencer-leaderboard-heading"
        className="font-serif text-xl font-semibold text-protect-teal"
      >
        Influencer leaderboard
      </h2>
      <p className="mt-4 rounded border border-dashed border-protect-sand bg-white p-4 text-sm text-protect-ink/70 shadow-sm">
        Leaderboard is paused for this event.
      </p>
    </section>
  );
}

function EngagementModeControl({
  mode,
  setMode
}: {
  mode: EngagementMode;
  setMode: (mode: EngagementMode) => void;
}) {
  return (
    <section
      className="rounded border border-protect-sand bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="live-engagement-mode-heading"
    >
      <div className="flex items-center gap-2">
        <RadioTower
          size={19}
          className="text-protect-terra"
          aria-hidden="true"
        />
        <h2
          id="live-engagement-mode-heading"
          className="font-serif text-xl font-semibold text-protect-teal"
        >
          Live updates
        </h2>
      </div>
      <div
        className="mt-4 grid grid-cols-2 gap-2"
        role="group"
        aria-label="Live engagement update mode"
      >
        {modeOptions.map((option) => {
          const selected = option.mode === mode;

          return (
            <button
              key={option.mode}
              type="button"
              className={
                selected
                  ? "min-h-11 rounded border border-protect-teal bg-protect-teal px-3 text-sm font-semibold text-white"
                  : "min-h-11 rounded border border-protect-sand bg-protect-cream px-3 text-sm font-semibold text-protect-teal hover:bg-white"
              }
              aria-pressed={selected}
              onClick={() => setMode(option.mode)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function LivePodcastEngagement({
  event,
  districts,
  initialComments,
  initialMetrics,
  profile,
  composerProps,
  playerSlot,
  signedOutSlot,
  canonicalShareUrl
}: {
  event: PodcastEvent;
  districts: District[];
  initialComments: LiveComment[];
  initialMetrics: LiveMetrics;
  profile: PublicProfile | null;
  composerProps: CommentComposerProps | null;
  playerSlot: ReactNode;
  signedOutSlot: ReactNode;
  canonicalShareUrl: string;
}) {
  const { comments, metrics, mode, addComment, setMode } = useLiveEngagement({
    eventId: event.id,
    initialComments,
    initialMetrics,
    initialMode: event.forced_engagement_mode
  });

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:px-8">
      <div className="grid min-w-0 gap-6">
        <Fragment key="player-slot">{playerSlot}</Fragment>
        {composerProps ? (
          <CommentComposer
            key="comment-composer"
            {...composerProps}
            onCommentSubmitted={addComment}
          />
        ) : (
          <Fragment key="signed-out-slot">{signedOutSlot}</Fragment>
        )}
        <LiveCommentFeed comments={comments} viewerProfile={profile} />
      </div>

      <aside className="grid content-start gap-5" aria-label="Live room tools">
        <EngagementModeControl mode={mode} setMode={setMode} />
        <SharePanel
          eventId={event.id}
          title={event.title}
          canonicalShareUrl={canonicalShareUrl}
          canTrackShare={profile !== null}
        />
        <EngagementDashboard metrics={metrics} />
        {event.leaderboard_enabled ? (
          <InfluencerLeaderboard metrics={metrics} comments={comments} />
        ) : (
          <DisabledLeaderboard />
        )}
        <DistrictSelector
          districts={districts}
          selectedDistrictId={event.district_id}
        />
      </aside>
    </section>
  );
}
