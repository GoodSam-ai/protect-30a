"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  dedupeCommentsById,
  reduceEngagementMode,
  type EngagementModeState
} from "@/lib/live/realtime";
import type { EngagementMode, LiveComment, LiveMetrics } from "@/lib/live/types";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

const DEFAULT_POLLING_INTERVAL_MS = 5000;
const LOW_BANDWIDTH_INTERVAL_MULTIPLIER = 3;

function parseClientPollingInterval(value: string | undefined) {
  if (!value || !/^\d+$/.test(value.trim())) return DEFAULT_POLLING_INTERVAL_MS;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_POLLING_INTERVAL_MS;
}

export const POLLING_INTERVAL_MS = parseClientPollingInterval(
  process.env.NEXT_PUBLIC_POLLING_INTERVAL_MS
);

type LiveEngagementSnapshot = {
  comments: LiveComment[];
  metrics: LiveMetrics;
};

function hasSupabaseBrowserEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function useLiveEngagement({
  eventId,
  initialComments,
  initialMetrics,
  initialMode
}: {
  eventId: string;
  initialComments: LiveComment[];
  initialMetrics: LiveMetrics;
  initialMode: EngagementMode;
}) {
  const isMountedRef = useRef(false);
  const latestRefreshIdRef = useRef(0);
  const [comments, setComments] = useState(() =>
    dedupeCommentsById([], initialComments)
  );
  const [metrics, setMetrics] = useState(initialMetrics);
  const [modeState, dispatchMode] = useReducer(reduceEngagementMode, {
    requestedMode: initialMode,
    activeMode: initialMode === "auto" ? "realtime" : initialMode,
    failures: 0
  } satisfies EngagementModeState);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      latestRefreshIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    latestRefreshIdRef.current += 1;
  }, [eventId]);

  const refreshLiveData = useCallback(async () => {
    const refreshId = latestRefreshIdRef.current + 1;
    latestRefreshIdRef.current = refreshId;
    const response = await fetch(`/api/live/${encodeURIComponent(eventId)}`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error("Unable to refresh live engagement data.");
    }

    const snapshot = (await response.json()) as LiveEngagementSnapshot;
    if (!isMountedRef.current || refreshId !== latestRefreshIdRef.current) {
      return;
    }

    setComments(dedupeCommentsById([], snapshot.comments));
    setMetrics(snapshot.metrics);
  }, [eventId]);

  useEffect(() => {
    if (modeState.activeMode !== "realtime") return;

    if (!hasSupabaseBrowserEnv()) {
      dispatchMode({ type: "realtime_failed" });
      return;
    }

    let isCurrent = true;

    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`live-engagement:${eventId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comments",
            filter: `event_id=eq.${eventId}`
          },
          () => {
            void refreshLiveData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comment_likes"
          },
          () => {
            void refreshLiveData();
          }
        )
        .subscribe((status) => {
          if (!isCurrent) return;

          if (status === "SUBSCRIBED") {
            dispatchMode({ type: "realtime_connected" });
            void refreshLiveData();
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            dispatchMode({ type: "realtime_failed" });
          }
        });

      return () => {
        isCurrent = false;
        void supabase.removeChannel(channel);
      };
    } catch {
      dispatchMode({ type: "realtime_failed" });
    }
  }, [eventId, modeState.activeMode, modeState.failures, refreshLiveData]);

  useEffect(() => {
    if (
      modeState.requestedMode !== "auto" ||
      modeState.activeMode !== "realtime"
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshLiveData().catch(() => undefined);
    }, POLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [modeState.activeMode, modeState.requestedMode, refreshLiveData]);

  useEffect(() => {
    if (
      modeState.activeMode !== "polling" &&
      modeState.activeMode !== "low-bandwidth"
    ) {
      return;
    }

    const intervalMs =
      modeState.activeMode === "low-bandwidth"
        ? POLLING_INTERVAL_MS * LOW_BANDWIDTH_INTERVAL_MULTIPLIER
        : POLLING_INTERVAL_MS;

    const refreshTimeoutId = window.setTimeout(() => {
      void refreshLiveData().catch(() => undefined);
    }, 0);
    const intervalId = window.setInterval(() => {
      void refreshLiveData().catch(() => undefined);
    }, intervalMs);

    return () => {
      window.clearTimeout(refreshTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [modeState.activeMode, refreshLiveData]);

  return {
    comments,
    metrics,
    mode: modeState.requestedMode,
    activeMode: modeState.activeMode,
    setMode: (mode: EngagementMode) =>
      dispatchMode({ type: "manual_mode_selected", mode })
  };
}
