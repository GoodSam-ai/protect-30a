import { getEventBySlug, getVisibleComments } from "@/lib/live/data";
import { fixtureEvent } from "@/lib/live/fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn()
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: supabaseMocks.createSupabaseServerClient
}));

function useSupabaseEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
}

function useFixtureEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
}

function usePartialSupabaseEnv(
  presentKey: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
) {
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    presentKey === "NEXT_PUBLIC_SUPABASE_URL"
      ? "https://example.supabase.co"
      : ""
  );
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    presentKey === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ? "anon-key" : ""
  );
}

describe("live data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    supabaseMocks.createSupabaseServerClient.mockResolvedValue({
      from: supabaseMocks.from
    });
    supabaseMocks.from.mockReturnValue({ select: supabaseMocks.select });
    supabaseMocks.select.mockReturnValue({ eq: supabaseMocks.eq });
    supabaseMocks.eq.mockReturnValue({
      maybeSingle: supabaseMocks.maybeSingle,
      order: supabaseMocks.order
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when no event row matches the slug", async () => {
    useSupabaseEnv();
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getEventBySlug("missing-event")).resolves.toBeNull();

    expect(supabaseMocks.from).toHaveBeenCalledWith("podcast_events");
    expect(supabaseMocks.eq).toHaveBeenCalledWith("slug", "missing-event");
    expect(supabaseMocks.maybeSingle).toHaveBeenCalledOnce();
  });

  it("throws real Supabase errors when event lookup fails", async () => {
    useSupabaseEnv();
    const dbError = new Error("database unavailable");
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: dbError });

    await expect(getEventBySlug("live-event")).rejects.toThrow(dbError);
  });

  it("throws a configuration error when only the Supabase URL is configured", async () => {
    usePartialSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL");

    await expect(getEventBySlug(fixtureEvent.slug)).rejects.toThrow(
      "Supabase environment variables are partially configured."
    );
    expect(supabaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("throws a configuration error when only the Supabase anon key is configured", async () => {
    usePartialSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    await expect(getEventBySlug(fixtureEvent.slug)).rejects.toThrow(
      "Supabase environment variables are partially configured."
    );
    expect(supabaseMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("maps visible comment rows without exposing stable user ids", async () => {
    useSupabaseEnv();
    supabaseMocks.order.mockResolvedValue({
      data: [
        {
          id: "30000000-0000-4000-8000-000000000099",
          event_id: fixtureEvent.id,
          district_id: null,
          parent_comment_id: null,
          body: "Please keep this discussion public and useful.",
          topic: "Other",
          is_featured: false,
          created_at: "2026-06-26T13:00:00.000Z",
          display_name: "Resident Voice",
          avatar_url: null,
          like_count: null
        }
      ],
      error: null
    });

    await expect(getVisibleComments(fixtureEvent.id)).resolves.toEqual([
      {
        id: "30000000-0000-4000-8000-000000000099",
        event_id: fixtureEvent.id,
        district_id: null,
        user_id: null,
        parent_comment_id: null,
        body: "Please keep this discussion public and useful.",
        topic: "Other",
        is_featured: false,
        created_at: "2026-06-26T13:00:00.000Z",
        like_count: 0,
        liked_by_me: false,
        author_display_name: "Resident Voice",
        author_avatar_url: null
      }
    ]);
    expect(supabaseMocks.from).toHaveBeenCalledWith("visible_comments");
    expect(supabaseMocks.from).not.toHaveBeenCalledWith("comments");
    expect(supabaseMocks.eq).toHaveBeenCalledWith("event_id", fixtureEvent.id);
  });

  it("filters fixture comments by event id", async () => {
    useFixtureEnv();

    await expect(getVisibleComments(fixtureEvent.id)).resolves.toHaveLength(1);
    await expect(
      getVisibleComments("99999999-9999-4999-8999-999999999999")
    ).resolves.toEqual([]);
  });
});
