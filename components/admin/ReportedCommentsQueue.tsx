"use client";

import type { ReportedCommentQueueItem } from "@/lib/admin/types";
import { Flag, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";

export function ReportedCommentsQueue({
  reportedComments
}: {
  reportedComments: ReportedCommentQueueItem[];
}) {
  const commentIdId = useId();
  const statusId = useId();
  const [status, setStatus] = useState("Ready to moderate a reported comment.");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus("Updating comment moderation...");

    try {
      const response = await fetch("/api/admin/comments/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId: form.get("commentId"),
          moderationStatus: form.get("moderationStatus")
        })
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus(result?.error || "Unable to update comment moderation.");
        return;
      }

      setStatus("Comment moderation updated.");
    } catch {
      setStatus("Unable to update comment moderation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Flag size={19} className="text-protect-terra" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold text-protect-teal">
          Reported comments
        </h2>
      </div>

      <form
        aria-label="Moderate comment"
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
            <label className="text-sm font-semibold text-protect-teal" htmlFor={statusId}>
              Status
            </label>
            <select
              id={statusId}
              name="moderationStatus"
              className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
              defaultValue="hidden"
            >
              <option value="visible">Visible</option>
              <option value="pending">Pending</option>
              <option value="hidden">Hidden</option>
              <option value="removed">Removed</option>
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
          <ShieldCheck size={18} aria-hidden="true" />
          Apply moderation
        </button>
      </form>

      <section className="mt-4" aria-label="Reported comments queue">
        {reportedComments.length > 0 ? (
          <div className="overflow-x-auto rounded border border-protect-sand">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead className="bg-protect-cream text-protect-teal">
                <tr>
                  <th className="border-b border-protect-sand px-3 py-2 font-semibold">
                    Comment
                  </th>
                  <th className="border-b border-protect-sand px-3 py-2 font-semibold">
                    Reports
                  </th>
                  <th className="border-b border-protect-sand px-3 py-2 font-semibold">
                    Status
                  </th>
                  <th className="border-b border-protect-sand px-3 py-2 font-semibold">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportedComments.map((comment) => (
                  <tr key={comment.id} className="align-top">
                    <td className="border-b border-protect-sand px-3 py-2">
                      <p className="font-semibold text-protect-teal">
                        {comment.authorDisplayName}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-protect-ink">
                        {comment.body}
                      </p>
                      <p className="mt-1 text-xs text-protect-ink/60">
                        {comment.topic ?? "No topic"} ·{" "}
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="border-b border-protect-sand px-3 py-2">
                      <p className="font-semibold text-protect-teal">
                        {comment.reportCount} report
                        {comment.reportCount === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-protect-ink/70">
                        {comment.reportReasons.join(", ") || "No reason"}
                      </p>
                      {comment.reportDetails.length > 0 ? (
                        <p className="mt-1 line-clamp-2 text-xs text-protect-ink/70">
                          {comment.reportDetails.join(" | ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="border-b border-protect-sand px-3 py-2">
                      <span className="rounded border border-protect-sand bg-white px-2 py-1 text-xs font-semibold text-protect-teal">
                        {comment.moderationStatus}
                      </span>
                    </td>
                    <td className="border-b border-protect-sand px-3 py-2 font-mono text-xs text-protect-ink/70">
                      {comment.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded border border-dashed border-protect-sand bg-white p-4 text-sm text-protect-ink/70">
            No reported comments are waiting in the queue.
          </p>
        )}
      </section>

      <div className="mt-4 flex gap-2 rounded border border-protect-sand bg-white p-3 text-sm text-protect-ink/75">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-protect-terra" aria-hidden="true" />
        <p>
          Report handling is tracked through comment reports, moderation status,
          and the audit log.
        </p>
      </div>
    </div>
  );
}
