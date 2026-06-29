import { LikeButton } from "@/components/live/LikeButton";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("LikeButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rolls failed requests back to the state from immediately before that click", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    render(
      <LikeButton
        commentId="comment-1"
        initialLiked={false}
        initialCount={8}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /like comment/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: /unlike comment/i })).toHaveTextContent(
      "9"
    );
    expect(screen.getByRole("button", { name: /unlike comment/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: /unlike comment/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /unlike comment/i })).toHaveTextContent(
        "9"
      )
    );
    expect(screen.getByRole("button", { name: /unlike comment/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
