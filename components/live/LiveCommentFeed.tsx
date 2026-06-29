import { LikeButton } from "@/components/live/LikeButton";
import { formatLiveCommentTime } from "@/components/live/date-format";
import type { PublicProfile } from "@/lib/auth/session";
import type { LiveComment } from "@/lib/live/types";
import { MessageCircle, Star } from "lucide-react";

export function LiveCommentFeed({
  comments,
  viewerProfile
}: {
  comments: LiveComment[];
  viewerProfile: PublicProfile | null;
}) {
  const likesDisabled = !viewerProfile || viewerProfile.is_restricted;

  return (
    <section aria-labelledby="live-comment-feed-heading">
      <div className="flex flex-col gap-2 border-b border-protect-sand pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="live-comment-feed-heading"
            className="font-serif text-2xl font-semibold text-protect-teal"
          >
            Community comments
          </h2>
          <p className="mt-1 text-sm text-protect-ink/70">
            Moderated public comments from the live room.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded border border-protect-sand bg-white px-3 py-1.5 text-sm font-semibold text-protect-teal">
          <MessageCircle size={16} aria-hidden="true" />
          {comments.length} visible
        </span>
      </div>

      {comments.length > 0 ? (
        <ol className="mt-4 grid gap-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <article className="rounded border border-protect-sand bg-white p-4 shadow-sm">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 break-words font-semibold text-protect-teal">
                        {comment.author_display_name}
                      </h3>
                      {comment.is_featured ? (
                        <span className="inline-flex items-center gap-1 rounded border border-protect-aqua bg-protect-cream px-2 py-0.5 text-xs font-semibold text-protect-teal">
                          <Star size={13} aria-hidden="true" />
                          Featured
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-protect-ink/60">
                      <time dateTime={comment.created_at}>
                        {formatLiveCommentTime(comment.created_at)}
                      </time>
                      {comment.topic ? ` - ${comment.topic}` : null}
                    </p>
                  </div>
                  <LikeButton
                    commentId={comment.id}
                    initialLiked={comment.liked_by_me}
                    initialCount={comment.like_count}
                    disabled={likesDisabled}
                    commentAuthor={comment.author_display_name}
                  />
                </header>
                <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-protect-ink">
                  {comment.body}
                </p>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 rounded border border-dashed border-protect-sand bg-white p-6 text-protect-ink/70">
          No public comments yet. The room is ready when residents arrive.
        </div>
      )}
    </section>
  );
}
