import {
  SignInPanelClient,
  type EnabledAuthProvider
} from "@/components/auth/SignInPanelClient";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createSupabaseBrowserClient: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithOtp: vi.fn()
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: supabaseMocks.createSupabaseBrowserClient
}));

const providers: EnabledAuthProvider[] = [
  { id: "email", label: "Email magic link", enabled: true },
  { id: "google", label: "Google", enabled: true },
  { id: "custom:instagram", label: "Instagram", enabled: true }
];

describe("SignInPanelClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.signInWithOAuth.mockResolvedValue({ error: null });
    supabaseMocks.signInWithOtp.mockResolvedValue({ error: null });
    supabaseMocks.createSupabaseBrowserClient.mockReturnValue({
      auth: {
        signInWithOAuth: supabaseMocks.signInWithOAuth,
        signInWithOtp: supabaseMocks.signInWithOtp
      }
    });
  });

  it("renders only the enabled providers supplied by the server wrapper", () => {
    render(<SignInPanelClient providers={providers} />);

    expect(screen.getByRole("button", { name: "Google" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Instagram" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "TikTok" })
    ).not.toBeInTheDocument();
  });

  it("asks for an email address before creating a Supabase client", () => {
    render(<SignInPanelClient providers={providers} />);

    fireEvent.click(screen.getByRole("button", { name: "Email link" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Enter your email address to receive a sign-in link."
    );
    expect(supabaseMocks.createSupabaseBrowserClient).not.toHaveBeenCalled();
  });
});
