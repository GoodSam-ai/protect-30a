import { CommentComposer } from "@/components/live/CommentComposer";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("CommentComposer", () => {
  it("renders from narrow client-safe props without requiring a full profile", () => {
    render(
      <CommentComposer
        eventId="20000000-0000-4000-8000-000000000001"
        districtId="10000000-0000-4000-8000-000000000001"
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
});
