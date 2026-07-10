import type { PodcastEvent } from "@/lib/live/types";

type EventStatusFields = Pick<
  PodcastEvent,
  "status" | "starts_at" | "ends_at" | "comments_enabled"
>;

export function isExpiredUpcomingEvent(
  event: Pick<EventStatusFields, "status" | "starts_at" | "ends_at">,
  now = Date.now()
) {
  if (event.status !== "upcoming") return false;

  const boundary = event.ends_at || event.starts_at;
  if (!boundary) return false;

  const timestamp = Date.parse(boundary);
  return Number.isFinite(timestamp) && timestamp < now;
}

export function isEventAcceptingComments(
  event: EventStatusFields,
  now = Date.now()
) {
  if (!event.comments_enabled) return false;
  if (event.status === "live") return true;

  return (
    event.status === "upcoming" && !isExpiredUpcomingEvent(event, now)
  );
}
