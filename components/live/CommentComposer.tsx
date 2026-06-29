"use client";

import { Send } from "lucide-react";
import { useId, useState } from "react";

const topics = [
  "Stormwater",
  "Traffic",
  "Beach access",
  "Mosquito control",
  "Public safety",
  "Growth/development",
  "Parking",
  "Environment",
  "Other"
] as const;

export function CommentComposer({
  eventId,
  districtId,
  displayName,
  canDraft,
  status
}: {
  eventId: string;
  districtId: string | null;
  displayName: string;
  canDraft: boolean;
  status: string;
}) {
  const bodyId = useId();
  const topicId = useId();
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<(typeof topics)[number]>("Stormwater");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <section
      className="rounded border border-protect-sand bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="comment-composer-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="comment-composer-heading"
            className="font-serif text-xl font-semibold text-protect-teal"
          >
            Add your comment
          </h2>
          <p className="mt-1 text-sm text-protect-ink/75">
            Posting as {displayName}
          </p>
        </div>
        <span className="w-fit rounded border border-protect-aqua bg-protect-cream px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-protect-teal">
          Draft mode
        </span>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <input type="hidden" name="eventId" value={eventId} />
        {districtId ? (
          <input type="hidden" name="districtId" value={districtId} />
        ) : null}

        <div className="grid gap-2">
          <label
            className="text-sm font-semibold text-protect-teal"
            htmlFor={topicId}
          >
            Topic
          </label>
          <select
            id={topicId}
            name="topic"
            className="min-h-11 rounded border border-protect-sand bg-white px-3 text-protect-ink"
            value={topic}
            disabled={!canDraft}
            onChange={(event) =>
              setTopic(event.target.value as (typeof topics)[number])
            }
          >
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-semibold text-protect-teal"
            htmlFor={bodyId}
          >
            Comment
          </label>
          <textarea
            id={bodyId}
            name="body"
            className="min-h-32 resize-y rounded border border-protect-sand px-3 py-2 text-protect-ink placeholder:text-protect-ink/45"
            maxLength={500}
            placeholder="Share a local concern, question, or helpful context."
            value={body}
            disabled={!canDraft}
            onChange={(event) => setBody(event.target.value)}
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
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-protect-teal/45 sm:w-fit"
          disabled
        >
          <Send size={18} aria-hidden="true" />
          Submit comment
        </button>
      </form>
    </section>
  );
}
