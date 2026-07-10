import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  "supabase/migrations/20260710161235_close_expired_event_comments.sql"
);

describe("expired event comment policy migration", () => {
  it("replaces the RLS helper with the same live/upcoming expiry rule as the app", async () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;

    const migration = (await readFile(migrationPath, "utf8")).toLowerCase();
    const normalized = migration.replace(/\s+/g, " ");

    expect(migration).toContain(
      "create or replace function public.can_create_comment"
    );
    expect(migration).toContain("security invoker");
    expect(migration).toContain("pe.status = 'live'");
    expect(migration).toContain("pe.status = 'upcoming'");
    expect(migration).toContain("coalesce(pe.ends_at, pe.starts_at) >= now()");
    expect(normalized).toContain(
      "revoke all on function public.can_create_comment(uuid, uuid, uuid) from public, anon, authenticated"
    );
    expect(normalized).toContain(
      "grant execute on function public.can_create_comment(uuid, uuid, uuid) to authenticated"
    );
  });
});
