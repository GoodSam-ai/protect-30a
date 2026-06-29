import { getEventBySlug, getVisibleComments } from "@/lib/live/data";
import { fixtureEvent } from "@/lib/live/fixtures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn()
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
      maybeSingle: supabaseMocks.maybeSingle
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

  it("filters fixture comments by event id", async () => {
    useFixtureEnv();

    await expect(getVisibleComments(fixtureEvent.id)).resolves.toHaveLength(1);
    await expect(
      getVisibleComments("99999999-9999-4999-8999-999999999999")
    ).resolves.toEqual([]);
  });
});
