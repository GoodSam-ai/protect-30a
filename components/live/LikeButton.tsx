"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

export function LikeButton({
  commentId,
  initialLiked,
  initialCount,
  disabled
}: {
  commentId: string;
  initialLiked: boolean;
  initialCount: number;
  disabled: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  async function toggleLike() {
    if (disabled) return;
    const previousLiked = liked;
    const previousCount = count;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount(previousCount + (nextLiked ? 1 : -1));

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: nextLiked ? "POST" : "DELETE"
      });

      if (!response.ok) {
        setLiked(previousLiked);
        setCount(previousCount);
      }
    } catch {
      setLiked(previousLiked);
      setCount(previousCount);
    }
  }

  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-protect-sand px-3 text-sm font-semibold text-protect-teal transition hover:bg-protect-cream disabled:cursor-not-allowed disabled:opacity-55"
      aria-label={liked ? "Unlike comment" : "Like comment"}
      aria-pressed={liked}
      disabled={disabled}
      onClick={toggleLike}
    >
      <Heart
        size={17}
        aria-hidden="true"
        fill={liked ? "currentColor" : "none"}
      />
      <span>{count}</span>
    </button>
  );
}
