import { CommentComposer } from "@/components/live/CommentComposer";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const eventId = "20000000-0000-4000-8000-000000000001";
const districtId = "10000000-0000-4000-8000-000000000001";

describe("CommentComposer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders from narrow client-safe props without requiring a full profile", () => {
    render(
      <CommentComposer
        eventId={eventId}
        districtId={districtId}
        displayName="Resident Voice"
        canDraft
        status="Comment posting opens in the next release."
      />
    );

    expect(screen.getByText("Posting as Resident Voice")).toBeInTheDocument();
    expect(screen.getByLabelText("Topic")).toBeEnabled();
    expect(screen.getByLabelText("Comment")).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "Please discuss stormwater planning." }
    });

    expect(screen.getByText("35/500")).toBeInTheDocument();
  });

  it("posts comments, clears the textarea, and announces success", async () => {
    const onCommentSubmitted = vi.fn();
    const createdComment = {
      id: "comment-1",
      event_id: eventId,
      district_id: districtId,
      user_id: "40000000-0000-4000-8000-000000000001",
      parent_comment_id: null,
      body: "Please discuss stormwater planning.",
      topic: "Stormwater",
      is_featured: false,
      created_at: "2026-06-26T12:00:00Z",
      like_count: 0,
      liked_by_me: false,
      author_display_name: "Resident Voice",
      author_avatar_url: null
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ comment: createdComment }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    render(
      <CommentComposer
        eventId={eventId}
        districtId={districtId}
        displayName="Resident Voice"
        canDraft
        status="Ready to comment."
        onCommentSubmitted={onCommentSubmitted}
      />
    );

    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "Please discuss stormwater planning." }
    });
    fireEvent.change(screen.getByLabelText("Topic"), {
      target: { value: "Stormwater" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit comment" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          districtId,
          body: "Please discuss stormwater planning.",
          topic: "Stormwater"
        })
      })
    );
    expect(screen.getByLabelText("Comment")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Comment submitted.");
    expect(onCommentSubmitted).toHaveBeenCalledWith(createdComment);
  });

  it("exposes server validation errors in polite live content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Comment is too short." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    );

    render(
      <CommentComposer
        eventId={eventId}
        districtId={null}
        displayName="Resident Voice"
        canDraft
        status="Ready to comment."
      />
    );

    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "bad" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit comment" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Comment is too short.")
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByLabelText("Comment")).toHaveValue("bad");
  });
});
