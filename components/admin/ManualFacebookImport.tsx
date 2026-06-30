"use client";

import { fixtureDistricts, fixtureEvent } from "@/lib/live/fixtures";
import { MessageSquarePlus } from "lucide-react";
import { useId, useState } from "react";

type ImportResult = {
  comment?: { id: string };
  error?: string;
};

export function ManualFacebookImport() {
  const eventIdId = useId();
  const districtIdId = useId();
  const authorId = useId();
  const urlId = useId();
  const bodyId = useId();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("Ready to import a moderated Facebook comment.");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus("Importing Facebook comment...");

    try {
      const response = await fetch("/api/admin/facebook-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: form.get("eventId"),
          districtId: form.get("districtId") || undefined,
          body: form.get("body"),
          externalSourceAuthor: form.get("externalSourceAuthor") || undefined,
          externalSourceUrl: form.get("externalSourceUrl") || undefined
        })
      });
      const result = (await response.json().catch(() => null)) as ImportResult | null;

      if (!response.ok) {
        setStatus(result?.error || "Unable to import Facebook comment.");
        return;
      }

      setBody("");
      setStatus("Facebook comment imported.");
    } catch {
      setStatus("Unable to import Facebook comment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <MessageSquarePlus size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Manual Facebook import
        </h2>
      </div>

      <form
        aria-label="Manual Facebook import"
        action="/api/admin/facebook-import"
        method="post"
        className="mt-4 grid gap-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={eventIdId}>
              Event ID
            </label>
            <input
              id={eventIdId}
              name="eventId"
              className="min-h-11 rounded border border-protect-sand px-3 text-protect-ink"
              defaultValue={fixtureEvent.id}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={districtIdId}>
              District
            </label>
            <select
              id={districtIdId}
              name="districtId"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              defaultValue={fixtureEvent.district_id ?? ""}
            >
              <option value="">No district</option>
              {fixtureDistricts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={authorId}>
              External author
            </label>
            <input
              id={authorId}
              name="externalSourceAuthor"
              className="min-h-11 rounded border border-protect-sand px-3 text-protect-ink"
              placeholder="Facebook display name"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={urlId}>
              Source URL
            </label>
            <input
              id={urlId}
              name="externalSourceUrl"
              className="min-h-11 rounded border border-protect-sand px-3 text-protect-ink"
              placeholder="https://facebook.com/..."
              type="url"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-protect-teal" htmlFor={bodyId}>
            Comment body
          </label>
          <textarea
            id={bodyId}
            name="body"
            className="min-h-36 resize-y rounded border border-protect-sand px-3 py-2 text-protect-ink placeholder:text-protect-ink/45"
            maxLength={500}
            minLength={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Paste the moderated Facebook comment text."
            required
          />
          <div className="flex flex-col gap-2 text-sm text-protect-ink/70 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" aria-live="polite">
              {status}
            </p>
            <span>{body.length}/500</span>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-protect-teal/45 sm:w-fit"
          disabled={pending || body.trim().length < 5}
        >
          <MessageSquarePlus size={18} aria-hidden="true" />
          Import comment
        </button>
      </form>
    </div>
  );
}
