"use client";

import type { AdminScoringSettings } from "@/lib/admin/types";
import { BarChart3, Save } from "lucide-react";
import { useId, useState } from "react";

export function ScoringSettings({
  settings
}: {
  settings: AdminScoringSettings;
}) {
  const commentId = useId();
  const likeId = useId();
  const shareId = useId();
  const featuredId = useId();
  const [status, setStatus] = useState("Ready to save scoring settings.");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus("Saving scoring settings...");

    try {
      const response = await fetch("/api/admin/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentWeight: form.get("commentWeight"),
          likeWeight: form.get("likeWeight"),
          shareWeight: form.get("shareWeight"),
          featuredWeight: form.get("featuredWeight")
        })
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus(result?.error || "Unable to save scoring settings.");
        return;
      }

      setStatus("Scoring settings saved.");
    } catch {
      setStatus("Unable to save scoring settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <BarChart3 size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Scoring
        </h2>
      </div>

      <form
        aria-label="Scoring settings"
        action="/api/admin/scoring"
        method="post"
        className="mt-4 grid gap-4 rounded border border-protect-sand bg-protect-cream p-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Comment", "commentWeight", commentId, settings.commentWeight],
            ["Like", "likeWeight", likeId, settings.likeWeight],
            ["Share", "shareWeight", shareId, settings.shareWeight],
            ["Featured", "featuredWeight", featuredId, settings.featuredWeight]
          ].map(([label, name, id, value]) => (
            <div className="grid gap-2" key={String(name)}>
              <label className="text-sm font-semibold text-protect-teal" htmlFor={String(id)}>
                {label}
              </label>
              <input
                id={String(id)}
                name={String(name)}
                className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
                defaultValue={Number(value)}
                min={0}
                type="number"
              />
            </div>
          ))}
        </div>
        <p className="text-sm text-protect-ink/70" role="status" aria-live="polite">
          {status}
        </p>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-protect-teal/45 sm:w-fit"
          disabled={pending}
        >
          <Save size={18} aria-hidden="true" />
          Save scoring
        </button>
      </form>
    </div>
  );
}
