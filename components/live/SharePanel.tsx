"use client";

import { Copy, ExternalLink, Mail, Send, Share2 } from "lucide-react";
import { useState } from "react";

export function SharePanel({
  title,
  canonicalShareUrl
}: {
  title: string;
  canonicalShareUrl: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const shareText = `${title} - join the Protect30A live room`;
  const encodedShareUrl = encodeURIComponent(canonicalShareUrl);
  const encodedShareText = encodeURIComponent(shareText);

  async function copyLink(platform?: "TikTok" | "Instagram") {
    try {
      await navigator.clipboard.writeText(canonicalShareUrl);
      setStatus(
        platform
          ? `Copied canonical live room link for ${platform}.`
          : "Copied canonical live room link."
      );
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
        title,
        text: shareText,
        url: canonicalShareUrl
      });
      setStatus("Share sheet opened with canonical live room link.");
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
          onClick={() => copyLink()}
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
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-4 text-sm font-semibold leading-tight text-protect-teal"
          onClick={() => copyLink("TikTok")}
        >
          <Copy size={18} aria-hidden="true" />
          Copy link for TikTok
        </button>
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-4 text-sm font-semibold leading-tight text-protect-teal"
          href="https://www.tiktok.com/"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={18} aria-hidden="true" />
          Open TikTok
        </a>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-4 text-sm font-semibold leading-tight text-protect-teal"
          onClick={() => copyLink("Instagram")}
        >
          <Copy size={18} aria-hidden="true" />
          Copy link for Instagram
        </button>
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-4 text-sm font-semibold leading-tight text-protect-teal"
          href="https://www.instagram.com/"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={18} aria-hidden="true" />
          Open Instagram
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
