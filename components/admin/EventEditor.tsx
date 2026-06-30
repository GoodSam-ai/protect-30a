import { fixtureEvent } from "@/lib/live/fixtures";
import { CalendarDays, Radio } from "lucide-react";
import Link from "next/link";

export function EventEditor() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <CalendarDays size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Events
        </h2>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="rounded border border-protect-sand bg-protect-cream p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-protect-ink/60">
            Active live room
          </p>
          <h3 className="mt-1 text-lg font-semibold text-protect-teal">
            {fixtureEvent.title}
          </h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-protect-ink/60">
                Status
              </dt>
              <dd className="mt-1 font-semibold text-protect-teal">
                {fixtureEvent.status}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-protect-ink/60">
                Comments
              </dt>
              <dd className="mt-1 font-semibold text-protect-teal">
                {fixtureEvent.comments_enabled ? "Enabled" : "Disabled"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-protect-ink/60">
                Leaderboard
              </dt>
              <dd className="mt-1 font-semibold text-protect-teal">
                {fixtureEvent.leaderboard_enabled ? "Enabled" : "Disabled"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-protect-ink/60">
                Engagement mode
              </dt>
              <dd className="mt-1 font-semibold text-protect-teal">
                {fixtureEvent.forced_engagement_mode}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="rounded border border-protect-sand bg-white p-4">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-protect-terra" aria-hidden="true" />
            <h3 className="font-semibold text-protect-teal">Room controls</h3>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-protect-ink/75">
            <p>Event setup uses the active podcast event record.</p>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded border border-protect-sand px-3 font-semibold text-protect-teal hover:bg-protect-cream"
              href="/live"
            >
              Open live room
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
