"use client";

import type { PodcastEvent } from "@/lib/live/types";
import { getCanonicalUrl } from "@/lib/site-config";
import { Copy, Mail, Send, Share2 } from "lucide-react";
import { useState } from "react";

export function SharePanel({ event }: { event: PodcastEvent }) {
  const fallbackPath = `/live/${event.slug}`;
  const [status, setStatus] = useState<string | null>(null);
  const canonicalShareUrl = getCanonicalUrl(fallbackPath);
  const shareText = `${event.title} - join the Protect30A live room`;
  const encodedShareUrl = encodeURIComponent(canonicalShareUrl);
  const encodedShareText = encodeURIComponent(shareText);

  function getShareUrl() {
    return new URL(fallbackPath, window.location.origin).toString();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setStatus("Copied live room link.");
    } catch {
      setStatus("Copy is unavailable in this browser.");
    }
  }

  async function shareNative() {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({
        title: event.title,
        text: shareText,
        url: getShareUrl()
      });
      setStatus("Share sheet opened.");
    } catch {
      setStatus("Share was canceled.");
    }
  }

  return (
    <section
      className="rounded border border-protect-sand bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="share-panel-heading"
    >
      <div className="flex items-center gap-2">
        <Share2 size={19} className="text-protect-terra" aria-hidden="true" />
        <h2
          id="share-panel-heading"
          className="font-serif text-xl font-semibold text-protect-teal"
        >
          Share this live room
        </h2>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white"
          onClick={shareNative}
        >
          <Share2 size={18} aria-hidden="true" />
          Share
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-4 font-semibold text-protect-teal"
          onClick={copyLink}
        >
          <Copy size={18} aria-hidden="true" />
          Copy link
        </button>
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-4 font-semibold text-protect-teal"
          href={`mailto:?subject=${encodedShareText}&body=${encodedShareText}%0A${encodedShareUrl}`}
        >
          <Mail size={18} aria-hidden="true" />
          Email
        </a>
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-4 font-semibold text-protect-teal"
          href={`https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}`}
          target="_blank"
          rel="noreferrer"
        >
          <Send size={18} aria-hidden="true" />
          Post to X
        </a>
      </div>
      {status ? (
        <p
          className="mt-3 text-sm text-protect-ink/70"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
    </section>
  );
}
