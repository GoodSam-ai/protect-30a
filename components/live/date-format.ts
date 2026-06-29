const liveTimeZone = "America/Chicago";

export function formatLiveEventTime(value: string | null) {
  if (!value) return "Time to be announced";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: liveTimeZone,
    timeZoneName: "short"
  }).format(new Date(value));
}

export function formatLiveCommentTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: liveTimeZone
  }).format(new Date(value));
}
