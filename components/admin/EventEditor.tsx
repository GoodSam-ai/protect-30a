"use client";

import type { AdminEventOption } from "@/lib/admin/types";
import { CalendarDays, Save } from "lucide-react";
import { useId, useState } from "react";

type EventFormState = {
  title: string;
  status: string;
  startsAt: string;
  livestreamUrl: string;
  replayUrl: string;
  commentsEnabled: boolean;
  leaderboardEnabled: boolean;
  forcedEngagementMode: string;
};

function eventFormState(event: AdminEventOption | null): EventFormState {
  return {
    title: event?.title ?? "",
    status: event?.status ?? "upcoming",
    startsAt: event?.startsAt ?? "",
    livestreamUrl: event?.livestreamUrl ?? "",
    replayUrl: event?.replayUrl ?? "",
    commentsEnabled: event?.commentsEnabled ?? true,
    leaderboardEnabled: event?.leaderboardEnabled ?? true,
    forcedEngagementMode: event?.forcedEngagementMode ?? "auto"
  };
}

export function EventEditor({
  events,
  activeEvent
}: {
  events: AdminEventOption[];
  activeEvent: AdminEventOption | null;
}) {
  const eventIdId = useId();
  const titleId = useId();
  const statusId = useId();
  const startsAtId = useId();
  const livestreamId = useId();
  const replayId = useId();
  const modeId = useId();
  const [status, setStatus] = useState("Ready to update event setup.");
  const [pending, setPending] = useState(false);
  const initialEvent = activeEvent ?? events[0] ?? null;
  const [selectedEventId, setSelectedEventId] = useState(initialEvent?.id ?? "");
  const [fields, setFields] = useState(() => eventFormState(initialEvent));

  function handleEventSelection(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextEventId = event.target.value;
    const nextEvent =
      events.find((item) => item.id === nextEventId) ?? activeEvent ?? null;

    setSelectedEventId(nextEventId);
    setFields(eventFormState(nextEvent));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus("Saving event setup...");

    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: form.get("eventId"),
          title: form.get("title"),
          status: form.get("status"),
          startsAt: form.get("startsAt") || null,
          livestreamUrl: form.get("livestreamUrl") || null,
          replayUrl: form.get("replayUrl") || null,
          commentsEnabled: form.get("commentsEnabled") === "on",
          leaderboardEnabled: form.get("leaderboardEnabled") === "on",
          forcedEngagementMode: form.get("forcedEngagementMode")
        })
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus(result?.error || "Unable to save event setup.");
        return;
      }

      setStatus("Event setup saved.");
    } catch {
      setStatus("Unable to save event setup.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <CalendarDays size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Events
        </h2>
      </div>

      <form
        aria-label="Event setup"
        action="/api/admin/events"
        method="post"
        className="mt-4 grid gap-4 rounded border border-protect-sand bg-protect-cream p-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_12rem]">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={eventIdId}>
              Event ID
            </label>
            <select
              id={eventIdId}
              name="eventId"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              value={selectedEventId}
              onChange={handleEventSelection}
              required
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={statusId}>
              Status
            </label>
            <select
              id={statusId}
              name="status"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              value={fields.status}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  status: event.target.value
                }))
              }
            >
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="replay">Replay</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={modeId}>
              Engagement mode
            </label>
            <select
              id={modeId}
              name="forcedEngagementMode"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              value={fields.forcedEngagementMode}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  forcedEngagementMode: event.target.value
                }))
              }
            >
              <option value="auto">Auto</option>
              <option value="realtime">Realtime</option>
              <option value="polling">Polling</option>
              <option value="low-bandwidth">Low bandwidth</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={titleId}>
              Title
            </label>
            <input
              id={titleId}
              name="title"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              value={fields.title}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  title: event.target.value
                }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={startsAtId}>
              Starts at
            </label>
            <input
              id={startsAtId}
              name="startsAt"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              value={fields.startsAt}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  startsAt: event.target.value
                }))
              }
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={livestreamId}>
              Livestream URL
            </label>
            <input
              id={livestreamId}
              name="livestreamUrl"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              value={fields.livestreamUrl}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  livestreamUrl: event.target.value
                }))
              }
              type="url"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={replayId}>
              Replay URL
            </label>
            <input
              id={replayId}
              name="replayUrl"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              value={fields.replayUrl}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  replayUrl: event.target.value
                }))
              }
              type="url"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm font-semibold text-protect-teal sm:flex-row sm:items-center">
          <label className="flex items-center gap-2">
            <input
              name="commentsEnabled"
              type="checkbox"
              checked={fields.commentsEnabled}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  commentsEnabled: event.target.checked
                }))
              }
            />
            Comments enabled
          </label>
          <label className="flex items-center gap-2">
            <input
              name="leaderboardEnabled"
              type="checkbox"
              checked={fields.leaderboardEnabled}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  leaderboardEnabled: event.target.checked
                }))
              }
            />
            Leaderboard enabled
          </label>
        </div>

        <p className="text-sm text-protect-ink/70" role="status" aria-live="polite">
          {status}
        </p>

        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-protect-teal/45 sm:w-fit"
          disabled={pending}
        >
          <Save size={18} aria-hidden="true" />
          Save event
        </button>
      </form>
    </div>
  );
}
