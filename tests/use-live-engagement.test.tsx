import { useLiveEngagement } from "@/components/live/useLiveEngagement";
import { fixtureComments, fixtureMetrics } from "@/lib/live/fixtures";
import type { EngagementMode, LiveComment, LiveMetrics } from "@/lib/live/types";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
  removeChannel: vi.fn(),
  subscribe: vi.fn()
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: supabaseMocks.createSupabaseBrowserClient
}));

const eventId = "10000000-0000-4000-8000-000000000001";

function makeResponse(comments: LiveComment[], metrics: LiveMetrics) {
  return new Response(JSON.stringify({ comments, metrics }), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}

function Harness({ initialMode = "auto" }: { initialMode?: EngagementMode }) {
  const live = useLiveEngagement({
    eventId,
    initialComments: fixtureComments,
    initialMetrics: fixtureMetrics,
    initialMode
  });

  return (
    <div>
      <p data-testid="active-mode">{live.activeMode}</p>
      <p data-testid="comments">
        {live.comments.map((comment) => comment.body).join("|")}
      </p>
      <p data-testid="comment-count">{live.metrics.totalComments}</p>
    </div>
  );
}

describe("useLiveEngagement", () => {
  const changeHandlers: Array<() => void> = [];
  const channel = {};

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    changeHandlers.length = 0;
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    supabaseMocks.createSupabaseBrowserClient.mockReturnValue({
      channel: supabaseMocks.channel,
      removeChannel: supabaseMocks.removeChannel
    });
    supabaseMocks.channel.mockReturnValue({
      on: supabaseMocks.on,
      subscribe: supabaseMocks.subscribe
    });
    supabaseMocks.on.mockImplementation((_event, _filter, handler) => {
      changeHandlers.push(handler);
      return {
        on: supabaseMocks.on,
        subscribe: supabaseMocks.subscribe
      };
    });
    supabaseMocks.subscribe.mockImplementation((handler) => {
      handler("SUBSCRIBED");
      return channel;
    });
    supabaseMocks.removeChannel.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("keeps polling periodically while auto mode is active on realtime", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeResponse(fixtureComments, fixtureMetrics));
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("active-mode")).toHaveTextContent("realtime");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not let an older in-flight refresh overwrite newer live data", async () => {
    const responses: Array<(response: Response) => void> = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          responses.push(resolve);
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      changeHandlers[0]();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const olderComment = {
      ...fixtureComments[0],
      body: "Older stale response."
    };
    const newerComment = {
      ...fixtureComments[0],
      body: "Newer realtime response."
    };

    await act(async () => {
      responses[1](
        makeResponse([newerComment], { ...fixtureMetrics, totalComments: 2 })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("comments")).toHaveTextContent(
      "Newer realtime response."
    );
    expect(screen.getByTestId("comment-count")).toHaveTextContent("2");

    await act(async () => {
      responses[0](
        makeResponse([olderComment], { ...fixtureMetrics, totalComments: 1 })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("comments")).toHaveTextContent(
      "Newer realtime response."
    );
    expect(screen.getByTestId("comment-count")).toHaveTextContent("2");
  });
});
