"use client";

import type { AdminEventOption } from "@/lib/admin/types";
import { Download } from "lucide-react";
import { useId, useState } from "react";

export function EngagementExport({
  events,
  activeEventId
}: {
  events: AdminEventOption[];
  activeEventId: string;
}) {
  const eventIdId = useId();
  const [status, setStatus] = useState("Ready to export comments.");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const eventId = String(form.get("eventId") ?? "").trim();
    const url = `/api/admin/export/comments?${new URLSearchParams({ eventId })}`;
    setPending(true);
    setStatus("Preparing comments CSV...");

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setStatus(error?.error || "Unable to export comments.");
        return;
      }

      const csv = await response.blob();
      const href = URL.createObjectURL(csv);
      const link = document.createElement("a");
      link.href = href;
      link.download = `protect30a-comments-${eventId}.csv`;
      link.click();
      URL.revokeObjectURL(href);
      setStatus("Comments CSV exported.");
    } catch {
      setStatus("Unable to export comments.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Download size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Exports
        </h2>
      </div>

      <form
        aria-label="Export comments"
        action="/api/admin/export/comments"
        method="get"
        className="mt-4 grid gap-3 rounded border border-protect-sand bg-protect-cream p-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-protect-teal" htmlFor={eventIdId}>
            Event ID
          </label>
          <select
            id={eventIdId}
            name="eventId"
            className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
            defaultValue={activeEventId}
            required
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-protect-ink/70" role="status" aria-live="polite">
          {status}
        </p>

        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-protect-teal/45 sm:w-fit"
          disabled={pending}
        >
          <Download size={18} aria-hidden="true" />
          Download CSV
        </button>
      </form>
    </div>
  );
}
