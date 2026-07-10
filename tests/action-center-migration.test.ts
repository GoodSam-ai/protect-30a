import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  "supabase/migrations/202607100001_action_center_submissions.sql"
);

describe("Action Center submission migration", () => {
  it("keeps contact submissions private while granting the server write path", async () => {
    const migration = (await readFile(migrationPath, "utf8")).toLowerCase();

    expect(migration).toContain(
      "alter table public.action_center_submissions enable row level security"
    );
    expect(migration).toContain(
      "revoke all on table public.action_center_submissions from public, anon, authenticated"
    );
    expect(migration).toContain(
      "grant select, insert on table public.action_center_submissions to service_role"
    );
    expect(migration).not.toContain("create policy");
  });

  it("constrains form types and indexes the pledge-wall access pattern", async () => {
    const migration = (await readFile(migrationPath, "utf8")).toLowerCase();

    expect(migration).toContain(
      "check (form_type in ('pledge', 'rsvp', 'signup'))"
    );
    expect(migration).toContain(
      "on public.action_center_submissions (form_type, created_at desc)"
    );
  });
});
