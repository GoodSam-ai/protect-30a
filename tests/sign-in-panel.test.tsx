import {
  SignInPanelClient,
  type EnabledAuthProvider
} from "@/components/auth/SignInPanelClient";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("starts OAuth for custom providers with an encoded callback redirect", async () => {
    render(
      <SignInPanelClient providers={providers} redirectTo="/live?tab=chat" />
    );

    fireEvent.click(screen.getByRole("button", { name: "Instagram" }));

    await waitFor(() => {
      expect(supabaseMocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: "custom:instagram",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            "/live?tab=chat"
          )}`
        }
      });
    });
    expect(supabaseMocks.createSupabaseBrowserClient).toHaveBeenCalledOnce();
  });

  it("submits trimmed email magic links with an encoded callback redirect", async () => {
    render(<SignInPanelClient providers={providers} redirectTo="/live#join" />);

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: " resident@example.test " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Email link" }));

    await waitFor(() => {
      expect(supabaseMocks.signInWithOtp).toHaveBeenCalledWith({
        email: "resident@example.test",
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            "/live#join"
          )}`
        }
      });
    });
    expect(supabaseMocks.createSupabaseBrowserClient).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Check your email for the sign-in link."
    );
  });
});
