import { LikeButton } from "@/components/live/LikeButton";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

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

  it("ignores rapid clicks while a like request is pending", async () => {
    const pending = deferredResponse();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

    render(
      <LikeButton
        commentId="comment-1"
        initialLiked={false}
        initialCount={8}
        disabled={false}
        commentAuthor="Community member"
      />
    );

    const button = screen.getByRole("button", {
      name: /like comment from community member/i
    });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("9");

    pending.resolve(new Response(null, { status: 500 }));

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(button).toHaveTextContent("8");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("syncs refreshed like state from parent live data", () => {
    const { rerender } = render(
      <LikeButton
        commentId="comment-1"
        initialLiked={false}
        initialCount={8}
        disabled={false}
        commentAuthor="Community member"
      />
    );

    expect(
      screen.getByRole("button", {
        name: /like comment from community member\. 8 likes/i
      })
    ).toHaveAttribute("aria-pressed", "false");

    rerender(
      <LikeButton
        commentId="comment-1"
        initialLiked
        initialCount={9}
        disabled={false}
        commentAuthor="Community member"
      />
    );

    expect(
      screen.getByRole("button", {
        name: /unlike comment from community member\. 9 likes/i
      })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
