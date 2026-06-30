"use client";

import type { AdminBadgeSettings } from "@/lib/admin/types";
import { BadgeCheck, Save } from "lucide-react";
import { useId, useState } from "react";

export function BadgeSettings({ settings }: { settings: AdminBadgeSettings }) {
  const firstVoiceId = useId();
  const conversationId = useId();
  const signalId = useId();
  const inviteId = useId();
  const [status, setStatus] = useState("Ready to save badge settings.");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus("Saving badge settings...");

    try {
      const response = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstVoiceComments: form.get("firstVoiceComments"),
          conversationStarterComments: form.get("conversationStarterComments"),
          communitySignalScore: form.get("communitySignalScore"),
          podcastInviteScore: form.get("podcastInviteScore")
        })
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus(result?.error || "Unable to save badge settings.");
        return;
      }

      setStatus("Badge settings saved.");
    } catch {
      setStatus("Unable to save badge settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <BadgeCheck size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Badges
        </h2>
      </div>

      <form
        aria-label="Badge settings"
        action="/api/admin/badges"
        method="post"
        className="mt-4 grid gap-4 rounded border border-protect-sand bg-protect-cream p-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            [
              "First voice comments",
              "firstVoiceComments",
              firstVoiceId,
              settings.firstVoiceComments
            ],
            [
              "Conversation starter comments",
              "conversationStarterComments",
              conversationId,
              settings.conversationStarterComments
            ],
            [
              "Community signal score",
              "communitySignalScore",
              signalId,
              settings.communitySignalScore
            ],
            [
              "Podcast invite score",
              "podcastInviteScore",
              inviteId,
              settings.podcastInviteScore
            ]
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
          Save badges
        </button>
      </form>
    </div>
  );
}
