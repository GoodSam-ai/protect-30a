"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

export function LikeButton({
  commentId,
  initialLiked,
  initialCount,
  disabled,
  commentAuthor
}: {
  commentId: string;
  initialLiked: boolean;
  initialCount: number;
  disabled: boolean;
  commentAuthor?: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggleLike() {
    if (disabled || pending) return;
    const previousLiked = liked;
    const previousCount = count;
    const nextLiked = !liked;
    setPending(true);
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
    } finally {
      setPending(false);
    }
  }

  const likeNoun = count === 1 ? "like" : "likes";
  const actionLabel = liked ? "Unlike comment" : "Like comment";
  const accessibleLabel = commentAuthor
    ? `${actionLabel} from ${commentAuthor}. ${count} ${likeNoun}`
    : `${actionLabel}. ${count} ${likeNoun}`;

  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-protect-sand px-3 text-sm font-semibold text-protect-teal transition hover:bg-protect-cream disabled:cursor-not-allowed disabled:opacity-55"
      aria-label={accessibleLabel}
      aria-pressed={liked}
      aria-busy={pending}
      disabled={disabled || pending}
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
