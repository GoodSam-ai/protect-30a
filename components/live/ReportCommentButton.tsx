"use client";

import { Flag } from "lucide-react";
import { useId, useState } from "react";

const reportReasons = [
  { value: "off_topic", label: "Off topic" },
  { value: "misinformation", label: "Misinformation" },
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" }
] as const;

type ReportReason = (typeof reportReasons)[number]["value"];

export function ReportCommentButton({
  commentId,
  commentAuthor,
  disabled
}: {
  commentId: string;
  commentAuthor?: string;
  disabled: boolean;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("off_topic");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const actionLabel = disabled ? "Sign in to report comment" : "Report comment";
  const accessibleLabel = commentAuthor
    ? `${actionLabel} from ${commentAuthor}`
    : actionLabel;

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || pending || submitted) return;

    setPending(true);
    setMessage("Submitting report...");

    try {
      const trimmedDetails = details.trim();
      const response = await fetch(`/api/comments/${commentId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          details: trimmedDetails.length > 0 ? trimmedDetails : undefined
        })
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setMessage(result?.error || "Unable to submit report.");
        return;
      }

      setSubmitted(true);
      setMessage("Report submitted for moderation.");
    } catch {
      setMessage("Unable to submit report.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-3 text-sm font-semibold text-protect-teal transition hover:bg-protect-cream disabled:cursor-not-allowed disabled:opacity-55"
        aria-label={accessibleLabel}
        aria-controls={open ? formId : undefined}
        aria-expanded={open}
        disabled={disabled || pending}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <Flag size={17} aria-hidden="true" />
        <span>Report</span>
      </button>

      {open && !disabled ? (
        <form
          id={formId}
          className="mt-2 grid w-full gap-2 rounded border border-protect-sand bg-protect-cream p-3 sm:w-72"
          onSubmit={submitReport}
        >
          <label className="sr-only" htmlFor={`${formId}-reason`}>
            Report reason
          </label>
          <select
            id={`${formId}-reason`}
            name="reason"
            className="min-h-11 rounded border border-protect-sand bg-white px-3 text-sm text-protect-ink"
            value={reason}
            disabled={pending || submitted}
            onChange={(event) => setReason(event.target.value as ReportReason)}
          >
            {reportReasons.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor={`${formId}-details`}>
            Report details (optional)
          </label>
          <textarea
            id={`${formId}-details`}
            name="details"
            className="min-h-20 resize-y rounded border border-protect-sand bg-white px-3 py-2 text-sm text-protect-ink placeholder:text-protect-ink/45"
            maxLength={1000}
            placeholder="Optional details"
            value={details}
            disabled={pending || submitted}
            onChange={(event) => setDetails(event.target.value)}
          />

          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded bg-protect-teal px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-protect-teal/45"
            disabled={pending || submitted}
          >
            Submit report
          </button>
          {message ? (
            <p className="text-sm text-protect-ink/72" role="status">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
