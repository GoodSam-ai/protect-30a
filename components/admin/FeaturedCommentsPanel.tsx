"use client";

import { Star } from "lucide-react";
import { useId, useState } from "react";

export function FeaturedCommentsPanel() {
  const commentIdId = useId();
  const featuredId = useId();
  const [status, setStatus] = useState("Ready to update featured status.");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus("Updating featured comment...");

    try {
      const response = await fetch("/api/admin/comments/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId: form.get("commentId"),
          isFeatured: form.get("isFeatured") === "true"
        })
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus(result?.error || "Unable to update featured comment.");
        return;
      }

      setStatus("Featured comment updated.");
    } catch {
      setStatus("Unable to update featured comment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Star size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Featured comments
        </h2>
      </div>

      <form
        aria-label="Feature comment"
        action="/api/admin/comments/moderate"
        method="post"
        className="mt-4 grid gap-3 rounded border border-protect-sand bg-protect-cream p-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={commentIdId}>
              Comment ID
            </label>
            <input
              id={commentIdId}
              name="commentId"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              placeholder="Comment UUID"
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-protect-teal" htmlFor={featuredId}>
              Featured
            </label>
            <select
              id={featuredId}
              name="isFeatured"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              defaultValue="true"
            >
              <option value="true">Feature</option>
              <option value="false">Unfeature</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-protect-ink/70" role="status" aria-live="polite">
          {status}
        </p>

        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-protect-teal/45 sm:w-fit"
          disabled={pending}
        >
          <Star size={18} aria-hidden="true" />
          Apply featured state
        </button>
      </form>
    </div>
  );
}
