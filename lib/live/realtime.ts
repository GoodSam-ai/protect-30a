import type { EngagementMode, LiveComment } from "./types";

export type EngagementModeState = {
  requestedMode: EngagementMode;
  activeMode: Exclude<EngagementMode, "auto">;
  failures: number;
};

export type EngagementModeEvent =
  | { type: "realtime_connected" }
  | { type: "realtime_failed" }
  | { type: "manual_mode_selected"; mode: EngagementMode };

export function reduceEngagementMode(
  state: EngagementModeState,
  event: EngagementModeEvent
): EngagementModeState {
  if (event.type === "manual_mode_selected") {
    return {
      requestedMode: event.mode,
      activeMode: event.mode === "auto" ? "realtime" : event.mode,
      failures: 0
    };
  }

  if (event.type === "realtime_connected") {
    return { ...state, activeMode: "realtime", failures: 0 };
  }

  const failures = state.failures + 1;
  return {
    ...state,
    failures,
    activeMode: failures >= 3 ? "polling" : state.activeMode
  };
}

export function dedupeCommentsById(
  existing: LiveComment[],
  incoming: LiveComment[]
) {
  const commentsById = new Map(existing.map((comment) => [comment.id, comment]));

  for (const comment of incoming) {
    commentsById.set(comment.id, comment);
  }

  return Array.from(commentsById.values());
}
